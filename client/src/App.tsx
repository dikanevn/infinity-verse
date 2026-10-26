import { useState, useEffect } from 'react';
import type { EIP6963ProviderDetail } from './types';
import { CLIENT_VERSION, STAR_TOKEN_ADDRESS, STAR_TOKEN_ABI, publicClient } from './config/contracts';

import { useWorldState } from './hooks/useWorldState';
import { usePlayerState } from './hooks/usePlayerState';
import { TopBar } from './components/Header/TopBar';
import { WorldGrid } from './components/Grid/WorldGrid';
import { PlayerControls } from './components/Controls/PlayerControls';
import { CellInspector } from './components/Inspector/CellInspector';
import { WalletModal } from './components/Modals/WalletModal';
import { PkModal } from './components/Modals/PkModal';
import { NetworkModal } from './components/Modals/NetworkModal';

function App() {
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectedAddress, setConnectedAddress] = useState<string>('');
  const [walletProviders, setWalletProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [showPkInputModal, setShowPkInputModal] = useState<boolean>(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState<boolean>(false);
  const [pkInput, setPkInput] = useState<string>('');
  const [inferBalance, setInferBalance] = useState<number | null>(null);

  // Опрос баланса токенов $INFER
  useEffect(() => {
    if (!connectedAddress) {
      setInferBalance(null);
      return;
    }

    const fetchInferBalance = async () => {
      try {
        const bal = await publicClient.readContract({
          address: STAR_TOKEN_ADDRESS,
          abi: STAR_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [connectedAddress as `0x${string}`]
        });
        setInferBalance(Number(bal) / 1e18);
      } catch (e) {
        console.error('Ошибка получения баланса $INFER:', e);
      }
    };

    fetchInferBalance();
    const interval = setInterval(fetchInferBalance, 4000);
    return () => clearInterval(interval);
  }, [connectedAddress]);

  // 1. Поиск установленных кошельков (EIP-6963)
  useEffect(() => {
    const handleAnnouncement = (event: any) => {
      if (!event.detail) return;
      setWalletProviders(prev => {
        if (prev.some(p => p.info.uuid === event.detail.info.uuid)) return prev;
        return [...prev, event.detail];
      });
    };

    window.addEventListener('eip6963:announceProvider', handleAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement);
    };
  }, []);

  // Точки фокуса: по умолчанию (0,0)
  const [focusPoints, setFocusPoints] = useState<{ x: number; y: number }[]>([{ x: 0, y: 0 }]);
  const [antennaFocus, setAntennaFocus] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 2. Ончейн-состояние мира (считывает оба фокуса: и вокруг человека, и вокруг антенны)
  const {
    cells,
    contractVersion,
    statusText,
    statusState,
    setStatusText,
    fetchState
  } = useWorldState(connectedAddress, focusPoints);

  // 3. Состояние игрока и механики ходов
  const {
    player,
    isPlayerLoading,
    actionPending,
    authMode,
    isDirectSignerMode,
    isGoogleMode,
    isMetaMaskMode,
    connectProvider,
    connectMetaMaskWithSession,
    connectWithPrivateKey,
    connectWithGoogle,
    handleSpawn,
    handleMove,
    handleDiscoverBatch,
    handleExitRam
  } = usePlayerState(connectedAddress, setConnectedAddress, setStatusText, fetchState);

  // При первом появлении или обновлении данных игрока — сразу центрируем фокус и выбор на персонаже
  useEffect(() => {
    if (player?.exists) {
      setAntennaFocus({ x: player.x, y: player.y });
      setSelectedCoord({ x: player.x, y: player.y });
      setFocusPoints([
        { x: player.x, y: player.y }
      ]);
    }
  }, [player?.exists, player?.x, player?.y]);

  // Выбор клетки: переносим антенну/фокус на неё и обновляем список опрашиваемых центров
  const handleSelectCoord = (coord: { x: number; y: number }) => {
    setSelectedCoord(coord);
    setAntennaFocus(coord);
    if (player?.exists) {
      setFocusPoints([
        { x: player.x, y: player.y },
        coord
      ]);
    } else {
      setFocusPoints([coord]);
    }
  };

  // Быстрый ход по двойному клику или ПКМ по соседней клетке
  const handleQuickMove = (coord: { x: number; y: number }) => {
    if (!player?.exists || actionPending) return;
    const dx = Math.abs(coord.x - player.x);
    const dy = Math.abs(coord.y - player.y);
    const isAdjacent = (dx <= 1 && dy <= 1) && (dx + dy > 0);
    const isObelisk = coord.x === 0 && coord.y === 0;

    if (isAdjacent && !isObelisk) {
      setSelectedCoord(coord);
      setAntennaFocus(coord);
      handleMove(coord.x, coord.y);
    }
  };

  // Возврат фокуса к игроку
  const handleCenterPlayer = () => {
    if (player?.exists) {
      setAntennaFocus({ x: player.x, y: player.y });
      setSelectedCoord({ x: player.x, y: player.y });
      setFocusPoints([
        { x: player.x, y: player.y }
      ]);
    } else {
      setAntennaFocus({ x: 0, y: 0 });
      setSelectedCoord({ x: 0, y: 0 });
      setFocusPoints([{ x: 0, y: 0 }]);
    }
  };

  // 3.1 АВТОМАТИЧЕСКАЯ РАЗВЕДКА "КОСМОСА" (TERRAIN == 0) В РАДИУСЕ 5x5 ВОКРУГ ИГРОКА
  const discoveringRef = useState<{ inFlight: boolean; visited: Set<string> }>({
    inFlight: false,
    visited: new Set()
  })[0];

  useEffect(() => {
    // Ждём пока загрузятся клетки (минимум 25 клеток вокруг игрока)
    if (!player?.exists || !connectedAddress || actionPending || discoveringRef.inFlight || cells.length === 0) return;

    // Ищем только те клетки 5х5 вокруг игрока (dx in [-2..2], dy in [-2..2]), которые есть в загруженных cells и у которых terrain === 0
    const neededXs: number[] = [];
    const neededYs: number[] = [];

    for (let dy = 2; dy >= -2; dy--) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = player.x + dx;
        const ty = player.y + dy;
        const coordKey = `${tx},${ty}`;

        if (discoveringRef.visited.has(coordKey)) continue;

        const cell = cells.find(c => c.x === tx && c.y === ty);
        // Запускаем разведку ТОЛЬКО если клетка уже загружена из блокчейна и подтверждено что terrain === 0 (пустота)
        if (cell && cell.terrain === 0) {
          neededXs.push(tx);
          neededYs.push(ty);
        }
      }
    }

    if (neededXs.length > 0) {
      console.log(`🌌 [AUTO-DISCOVER 5x5] Обнаружена пустота! Разведываем ${neededXs.length} клеток:`, neededXs, neededYs);
      discoveringRef.inFlight = true;
      neededXs.forEach((x, i) => discoveringRef.visited.add(`${x},${neededYs[i]}`));

      handleDiscoverBatch(neededXs, neededYs).finally(() => {
        discoveringRef.inFlight = false;
      });
    }
  }, [player?.x, player?.y, player?.exists, cells, actionPending, connectedAddress]);

  // 4. АВТО-ВХОД ДЛЯ ЛОКАЛЬНОГО ДЕВ-ОКРУЖЕНИЯ (192.168.x.x или localhost)
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');

    const devKey = (window as any).__DEV_LOCAL_PK__ || (typeof __DEV_LOCAL_PK__ !== 'undefined' ? __DEV_LOCAL_PK__ : '');

    if (isLocalhost && devKey && !connectedAddress) {
      console.log('🚀 [DEV AUTO-LOGIN] Обнаружена локальная сеть. Вход под Игроком 3 (RAM XOR/AES)...');
      connectWithPrivateKey(devKey, 'xor');
    }
  }, [connectedAddress]);

  const curCell = cells.find(c => c.x === selectedCoord.x && c.y === selectedCoord.y) || null;

  return (
    <div style={{
      boxSizing: 'border-box',
      width: '100vw',
      height: '100dvh',
      padding: 0,
      backgroundColor: '#07080d',
      display: 'flex',
      overflow: 'hidden'
    }}>
      <div style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        border: '2px solid #8b5cf6',
        borderRadius: '0px',
        boxShadow: '0 0 25px rgba(139, 92, 246, 0.25), inset 0 0 15px rgba(139, 92, 246, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'max(6px, env(safe-area-inset-top, 6px)) max(6px, env(safe-area-inset-right, 6px)) max(6px, env(safe-area-inset-bottom, 6px)) max(6px, env(safe-area-inset-left, 6px))',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui, sans-serif',
        userSelect: 'none',
        overflowY: 'auto'
      }}>

        {/* Заголовок и статус блокчейна с кнопкой выбора сети слева и кнопкой выхода справа */}
        <TopBar
          statusText={statusText}
          statusState={statusState}
          connectedAddress={connectedAddress}
          onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
          onExit={handleExitRam}
        />

        {/* Игровая сетка мира на бесконечном фоне тумана */}
        <WorldGrid
          cells={cells}
          selectedCoord={selectedCoord}
          player={player}
          focusCoord={antennaFocus}
          inferBalance={inferBalance}
          onSelectCoord={handleSelectCoord}
          onCenterPlayer={handleCenterPlayer}
          onQuickMove={handleQuickMove}
        />

        {/* Панель управления игроком */}
        <PlayerControls
          connectedAddress={connectedAddress}
          player={player}
          isPlayerLoading={isPlayerLoading}
          actionPending={actionPending}
          authMode={authMode}
          isDirectSignerMode={isDirectSignerMode}
          isGoogleMode={isGoogleMode}
          isMetaMaskMode={isMetaMaskMode}
          selectedCoord={selectedCoord}
          walletProvidersCount={walletProviders.length}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
          onSpawn={handleSpawn}
          onMove={handleMove}
        />

        {/* 64-битный инспектор выбранной клетки */}
        <CellInspector curCell={curCell} />

        {/* Футер */}
        <div style={{
          fontSize: '0.68rem',
          color: '#64748b',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          padding: '2px 0'
        }}>
          <div>Контракт: <span style={{ color: '#c084fc', fontWeight: 700 }}>v{contractVersion}</span></div>
          <div style={{ color: '#334155' }}>|</div>
          <div>Клиент: <span style={{ color: '#38bdf8', fontWeight: 700 }}>v{CLIENT_VERSION}</span></div>
        </div>

      </div>

      {/* Модальное окно выбора кошелька */}
      <WalletModal
        isOpen={isWalletModalOpen}
        walletProviders={walletProviders}
        onClose={() => setIsWalletModalOpen(false)}
        onConnectProvider={(w) => connectProvider(w, () => setIsWalletModalOpen(false))}
        onConnectMetaMaskWithSession={(w) => connectMetaMaskWithSession(w, () => setIsWalletModalOpen(false))}
        onOpenPkModal={() => {
          setIsWalletModalOpen(false);
          setShowPkInputModal(true);
        }}
        onGoogleLoginSuccess={(idToken) => {
          connectWithGoogle(idToken, () => setIsWalletModalOpen(false));
        }}
      />

      {/* Модальное окно ввода ключа с Dev-кнопками */}
      <PkModal
        isOpen={showPkInputModal}
        pkInput={pkInput}
        onChangePkInput={setPkInput}
        onClose={() => {
          setShowPkInputModal(false);
          setPkInput('');
        }}
        onConnect={(overridePk, forceMode) => {
          const keyToUse = overridePk || pkInput;
          connectWithPrivateKey(keyToUse, forceMode, () => {
            setShowPkInputModal(false);
            setPkInput('');
          });
        }}
      />
      {/* Модальное окно выбора RPC узла / сети */}
      <NetworkModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        onSelectRpc={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}

export default App;
