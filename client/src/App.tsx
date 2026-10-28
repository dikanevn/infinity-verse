import { useState, useEffect } from 'react';
import type { EIP6963ProviderDetail } from './types';
import { CLIENT_VERSION, STAR_TOKEN_ADDRESS, STAR_TOKEN_ABI, AAA_CONTRACT_ADDRESS, AAA_ABI, publicClient } from './config/contracts';

import { useWorldState } from './hooks/useWorldState';
import { usePlayerState } from './hooks/usePlayerState';
import { TopBar } from './components/Header/TopBar';
import { WorldGrid } from './components/Grid/WorldGrid';
import { PlayerControls } from './components/Controls/PlayerControls';
import { WalletModal } from './components/Modals/WalletModal';
import { PkModal } from './components/Modals/PkModal';
import { NetworkModal } from './components/Modals/NetworkModal';
import { PortalModal } from './components/Modals/PortalModal';
import { FeedbackModal } from './components/Modals/FeedbackModal';
import { IdleOverlay } from './components/Modals/IdleOverlay';
import { QuantumKissellModal } from './components/Modals/QuantumKissellModal';
import { WelcomeModal } from './components/Modals/WelcomeModal';
import { useIdleDetector } from './hooks/useIdleDetector';

function App() {
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectedAddress, setConnectedAddress] = useState<string>('');
  const [walletProviders, setWalletProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [showPkInputModal, setShowPkInputModal] = useState<boolean>(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState<boolean>(false);
  // Модальное окно управления / создания Портала
  const [isPortalModalOpen, setIsPortalModalOpen] = useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [isQuantumKissellOpen, setIsQuantumKissellOpen] = useState<boolean>(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(true);

  const [pkInput, setPkInput] = useState<string>('');
  const [inferBalance, setInferBalance] = useState<string | null>(null);
  const { isIdle, resume: resumeActivity } = useIdleDetector();

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
        // Округление баланса токенов INFER строго до 2 знаков после точки
        const rawNum = Number(bal) / 1e18;
        const formatted = rawNum.toFixed(2);
        setInferBalance(formatted);
      } catch (e) {
        console.error('Ошибка получения баланса $INFER:', e);
      }
    };

    if (!isIdle) {
      fetchInferBalance();
      const interval = setInterval(fetchInferBalance, 5000);
      return () => clearInterval(interval);
    }
  }, [connectedAddress, isIdle]);

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

  // Точки фокуса: по умолчанию пустой список (пока не выбран персонаж или клетка)
  const [focusPoints, setFocusPoints] = useState<{ x: number; y: number }[]>([]);
  const [antennaFocus, setAntennaFocus] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 2. Ончейн-состояние мира (считывает оба фокуса: и вокруг человека, и вокруг антенны)
  const {
    cells,
    statusText,
    statusState,
    setStatusText,
    fetchState
  } = useWorldState(connectedAddress, focusPoints, isIdle);

  // 3. Состояние игрока и механики ходов
  const {
    player,
    isPlayerLoading,
    actionPending,
    authMode,
    isDirectSignerMode,
    isGoogleMode,
    isMetaMaskMode,
    googleEmail,
    connectProvider,
    connectMetaMaskWithSession,
    connectWithPrivateKey,
    connectWithGoogle,
    handleSpawn,
    handleMove,
    // handleDiscoverBatch,
    handleCreatePortal,
    handleTransferPortal,
    handleDestroyPortal,
    handleTeleportToObelisk,
    handleTeleportToMyPortal,
    handleExitRam
  } = usePlayerState(
    connectedAddress,
    setConnectedAddress,
    setStatusText,
    fetchState,
    isIdle,
    () => setIsQuantumKissellOpen(true)
  );

  // Поиск портала текущего игрока на карте
  const [myPortalCoord, setMyPortalCoord] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!connectedAddress || !cells || cells.length === 0) {
      setMyPortalCoord(null);
      return;
    }

    let isSubscribed = true;
    publicClient.readContract({
      address: AAA_CONTRACT_ADDRESS,
      abi: AAA_ABI,
      functionName: 'getPortalByFounder',
      args: [connectedAddress as `0x${string}`]
    }).then((myPortalIdBigInt) => {
      if (!isSubscribed) return;
      const myPortalId = Number(myPortalIdBigInt);
      if (myPortalId > 0) {
        const found = cells.find(c => c.object === 4 && ((((c.state || 0) << 8) | (c.reserved || 0)) === myPortalId));
        if (found) {
          setMyPortalCoord({ x: found.x, y: found.y });
        }
      } else {
        setMyPortalCoord(null);
      }
    }).catch((err) => {
      console.warn('Error fetching founder portal id:', err);
    });

    return () => {
      isSubscribed = false;
    };
  }, [connectedAddress, cells]);

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

  // 3. УПРАВЛЕНИЕ КЛАВИАТУРОЙ (WASD И СТРЕЛКИ, ВКЛЮЧАЯ ДИАГОНАЛИ ПРИ ОДНОВРЕМЕННОМ НАЖАТИИ)
  useEffect(() => {
    const pressedKeys = new Set<string>();
    let comboTimer: any = null;

    const executeMove = (dx: number, dy: number) => {
      if (!player?.exists || actionPending) return;
      if (dx === 0 && dy === 0) return;

      const targetX = player.x + dx;
      const targetY = player.y + dy;

      // Не ходим в точку Обелиска (0, 0)
      if (targetX === 0 && targetY === 0) return;

      const targetCoord = { x: targetX, y: targetY };
      setSelectedCoord(targetCoord);
      setAntennaFocus(targetCoord);
      handleMove(targetX, targetY);
    };

    const processPressedKeys = () => {
      let dx = 0;
      let dy = 0;

      // Проверка направлений вверх/вниз
      if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp') || pressedKeys.has('Numpad8')) {
        dy += 1;
      }
      if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown') || pressedKeys.has('Numpad2')) {
        dy -= 1;
      }

      // Проверка направлений влево/вправо
      if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft') || pressedKeys.has('Numpad4')) {
        dx -= 1;
      }
      if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight') || pressedKeys.has('Numpad6')) {
        dx += 1;
      }

      // Поддержка отдельных клавиш диагоналей (Q, E, Z, C, Numpad)
      if (pressedKeys.has('KeyQ') || pressedKeys.has('Numpad7')) {
        dx = -1;
        dy = 1;
      } else if (pressedKeys.has('KeyE') || pressedKeys.has('Numpad9')) {
        dx = 1;
        dy = 1;
      } else if (pressedKeys.has('KeyZ') || pressedKeys.has('Numpad1')) {
        dx = -1;
        dy = -1;
      } else if (pressedKeys.has('KeyC') || pressedKeys.has('Numpad3')) {
        dx = 1;
        dy = -1;
      }

      if (dx !== 0 || dy !== 0) {
        executeMove(dx, dy);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем ввод, если фокус в поле ввода текста (input, textarea и т.д.) или открыто модальное окно
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (
        isWalletModalOpen ||
        showPkInputModal ||
        isNetworkModalOpen ||
        isPortalModalOpen ||
        isFeedbackModalOpen ||
        isQuantumKissellOpen ||
        isWelcomeModalOpen
      ) {
        return;
      }

      const movementCodes = [
        'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
        'KeyQ', 'KeyE', 'KeyZ', 'KeyC',
        'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9'
      ];

      if (!movementCodes.includes(e.code)) return;

      e.preventDefault();

      if (e.repeat) return;

      pressedKeys.add(e.code);

      // Небольшое окно (70мс), чтобы поймать вторую клавишу для диагонали (например W + D или Вверх + Вправо)
      if (comboTimer) {
        clearTimeout(comboTimer);
      }

      comboTimer = setTimeout(() => {
        processPressedKeys();
      }, 70);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const handleBlur = () => {
      pressedKeys.clear();
      if (comboTimer) clearTimeout(comboTimer);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (comboTimer) clearTimeout(comboTimer);
    };
  }, [
    player?.x,
    player?.y,
    player?.exists,
    actionPending,
    isWalletModalOpen,
    showPkInputModal,
    isNetworkModalOpen,
    isPortalModalOpen,
    isFeedbackModalOpen,
    isQuantumKissellOpen,
    isWelcomeModalOpen,
    handleMove
  ]);

  // 3.1 АВТОМАТИЧЕСКАЯ РАЗВЕДКА "КОСМОСА" (TERRAIN == 0) В РАДИУСЕ 5x5 ВОКРУГ ИГРОКА (ОТКЛЮЧЕНО)
  /*
  const discoveringRef = useState<{ inFlight: boolean }>({
    inFlight: false
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

      handleDiscoverBatch(neededXs, neededYs).finally(() => {
        discoveringRef.inFlight = false;
      });
    }
  }, [player?.x, player?.y, player?.exists, cells, actionPending, connectedAddress]);
  */

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
    <>
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
          connectedAddress={connectedAddress}
          onTransferPortal={handleTransferPortal}
          onDestroyPortal={handleDestroyPortal}
          onRefresh={fetchState}
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
        {/* Кнопки действий: Портал и Телепортация */}
        {connectedAddress && player?.exists && (
          <div style={{ margin: '4px auto 8px auto', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setIsPortalModalOpen(true)}
              style={{
                backgroundColor: '#1e1b4b',
                color: '#c084fc',
                border: '1px solid #6366f1',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🌀</span>
              <span>Поставить портал справа ({player.x + 1}, {player.y})</span>
            </button>

            <button
              type="button"
              onClick={handleTeleportToObelisk}
              disabled={actionPending}
              style={{
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: actionPending ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🗿</span>
              <span>К Обелиску (0, -1)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (myPortalCoord) {
                  handleTeleportToMyPortal(myPortalCoord.x, myPortalCoord.y);
                }
              }}
              disabled={actionPending || !myPortalCoord}
              title={myPortalCoord ? `Телепортация на (${myPortalCoord.x - 1}, ${myPortalCoord.y})` : 'У вас пока нет созданного портала в этом мире'}
              style={{
                backgroundColor: myPortalCoord ? '#3b0764' : '#1f2937',
                color: myPortalCoord ? '#e879f9' : '#6b7280',
                border: `1px solid ${myPortalCoord ? '#c084fc' : '#374151'}`,
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: (actionPending || !myPortalCoord) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: myPortalCoord ? 1 : 0.6
              }}
            >
              <span>⚡</span>
              <span>
                {myPortalCoord
                  ? `К своему порталу (${myPortalCoord.x - 1}, ${myPortalCoord.y})`
                  : 'К своему порталу'}
              </span>
            </button>
          </div>
        )}

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
          <span style={{ color: '#64748b', fontWeight: 600 }}>Main_Gb_1</span>
          <div style={{ color: '#334155' }}>|</div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>v{CLIENT_VERSION}</span>
          <div style={{ color: '#334155' }}>|</div>
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            title="Обратная связь и контакты"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0 2px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#818cf8',
              transition: 'color 0.15s, transform 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#c084fc';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#818cf8';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span>😈/контакты</span>
            <span style={{ fontSize: '0.65rem' }}>↗</span>
          </button>
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
      {/* Модальное окно Врат Мультивселенной */}
      <PortalModal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
        portalId={curCell && curCell.object === 4 ? (((curCell.state || 0) << 8) | (curCell.reserved || 0)) : 0}
        portalX={curCell && curCell.object === 4 ? curCell.x : (player?.exists ? player.x + 1 : 0)}
        portalY={curCell && curCell.object === 4 ? curCell.y : (player?.exists ? player.y : 0)}
        connectedAddress={connectedAddress}
        isDirectSigner={isDirectSignerMode}
        onRefresh={fetchState}
        onCreatePortal={handleCreatePortal}
      />
      {/* Модальное окно обратной связи */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        connectedAddress={connectedAddress}
        userEmail={isGoogleMode ? googleEmail : undefined}
      />

      {/* Экран квантового киселя при входе в портал */}
      <QuantumKissellModal
        isOpen={isQuantumKissellOpen}
        onExit={() => setIsQuantumKissellOpen(false)}
      />

      {/* Приветственное модальное окно на старте игры */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
      />

    </div>
    <IdleOverlay isOpen={isIdle} onResume={resumeActivity} />
    </>
  );
}

export default App;
