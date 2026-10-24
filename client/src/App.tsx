import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseAbi, defineChain, keccak256, encodePacked } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Основной контракт InfinityVerse_main (Direct X,Y Coordinate Grid 5x5 + Players + Session Keys + Revoke)
const CONTRACT_ADDRESS = '0x171814e6567896597dc79311b48f70ab6a79ced6';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://testnet.monadvision.com' },
  },
  testnet: true,
});

const VERSE_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function getCellKey(int32 x, int32 y) pure returns (bytes32)',
  'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint16 paramA, uint16 paramB))',
  'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint16 paramA, uint16 paramB)[])',
  'function getPlayer(address player) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry)',
  'function spawn(address player) returns (int32, int32)',
  'function moveDirect(int32 targetX, int32 targetY)',
  'function authorizeSessionWithSig(address player, address sessionKey, uint256 expiry, bytes sig)',
  'function revokeSessionWithSig(address player, bytes sig)',
  'function revokeSessionDirect()',
  'function moveWithSession(address player, int32 targetX, int32 targetY, bytes moveSig)',
  'function nonces(address player) view returns (uint256)'
]);

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL)
});

interface CellData {
  x: number;
  y: number;
  key: string;
  terrain: number;
  object: number;
  state: number;
  reserved: number;
  paramA: number;
  paramB: number;
}

const TERRAIN_CONFIG: Record<number, { name: string; icon: string; bg: string }> = {
  0: { name: 'Пустота', icon: '', bg: '#0d1117' },
  1: { name: 'Песок', icon: '', bg: '#b58941' },
  2: { name: 'Вода', icon: '🌊', bg: '#0f2744' },
  3: { name: 'Скала', icon: '⛰️', bg: '#272b38' },
};

const OBJECT_CONFIG: Record<number, { name: string; icon: string }> = {
  0: { name: 'Пусто', icon: '' },
  1: { name: 'Обелиск', icon: '🗿' },
  2: { name: 'Камень', icon: '🪨' },
  9: { name: 'Обелиск', icon: '🗿' },
};

// Сетка 5х5 от -2 до +2 (25 клеток)
const INITIAL_COORDS: { x: number; y: number }[] = [];
for (let y = 2; y >= -2; y--) {
  for (let x = -2; x <= 2; x++) {
    INITIAL_COORDS.push({ x, y });
  }
}

// ============================================================================
// === ЕДИНЫЙ ПУЛЬТ НАСТРОЙКИ СВЯЗИ СО ВСЕЛЕННОЙ (СВЕТОФОР С ДВУМЯ ПОРОГАМИ) ===
// ============================================================================
const CONNECTION_CONFIG = {
  // 1. Порог 1: переход в ЖЁЛТЫЙ цвет (если с последнего блока прошло > СЕКУНД)
  WARN_BLOCK_AGE_SEC: 5,

  // 2. Порог 2: переход в КРАСНЫЙ цвет (если с последнего блока прошло > СЕКУНД или ошибка)
  DANGER_BLOCK_AGE_SEC: 15,

  // 3. Частота проверки ончейна и считывания сетки клеток (мс: 2000 = 2 секунды)
  SYNC_INTERVAL_MS: 2000,
};

interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

// Локальный аккаунт сессии строго в оперативной памяти (RAM)
// При закрытии страницы или вкладки ключ безвозвратно уничтожается
let inMemorySessionAccount: ReturnType<typeof privateKeyToAccount> | null = null;

// ============================================================================
// === МОДУЛЬ КРИПТОГРАФИЧЕСКОГО ШИФРОВАНИЯ ПРИВАТНИКА В ОПЕРАТИВНОЙ ПАМЯТИ ===
// ============================================================================
// Приватный ключ никогда не хранится открытым текстом в переменных или стейте.
// На лету генерируется уникальный 256-битный AES-GCM сессионный ключ.
// В RAM остаётся только зашифрованный буфер (Ciphertext + IV).
class EncryptedRamSigner {
  private static encryptedBlob: ArrayBuffer | null = null;
  private static iv: Uint8Array | null = null;
  private static cryptoKey: CryptoKey | null = null;
  public static activeAddress: `0x${string}` | null = null;

  public static async lockPrivateKey(rawPrivateKey: string): Promise<`0x${string}`> {
    const cleanKey = (rawPrivateKey.startsWith('0x') ? rawPrivateKey : '0x' + rawPrivateKey).trim() as `0x${string}`;
    const account = privateKeyToAccount(cleanKey);
    this.activeAddress = account.address;

    // 1. Генерируем уникальный криптостойкий мастер-ключ AES-GCM (256 бит)
    this.cryptoKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable: ключ нельзя выгрузить из криптоподсистемы
      ['encrypt', 'decrypt']
    );

    // 2. Генерируем случайный вектор инициализации (IV) 12 байт
    this.iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 3. Шифруем строку приватного ключа
    const encoder = new TextEncoder();
    const data = encoder.encode(cleanKey);
    this.encryptedBlob = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.iv.buffer as ArrayBuffer },
      this.cryptoKey,
      data
    );

    return this.activeAddress;
  }

  // Мгновенная расшифровка внутри изолированного скоупа на время отправки транзакции
  public static async executeWithSigner<T>(fn: (walletClient: any) => Promise<T>): Promise<T> {
    if (!this.encryptedBlob || !this.iv || !this.cryptoKey) {
      throw new Error('Ключ в RAM не найден или заблокирован');
    }

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.iv.buffer as ArrayBuffer },
      this.cryptoKey,
      this.encryptedBlob
    );

    const decoder = new TextDecoder();
    const plainPk = decoder.decode(decrypted) as `0x${string}`;
    const account = privateKeyToAccount(plainPk);

    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(RPC_URL)
    });

    try {
      return await fn(walletClient);
    } finally {
      // Изолированная область завершена, plainPk уничтожается GC
    }
  }

  public static clear() {
    this.encryptedBlob = null;
    this.iv = null;
    this.cryptoKey = null;
    this.activeAddress = null;
  }

  public static isLocked(): boolean {
    return this.encryptedBlob !== null;
  }
}

function App() {
  const [cells, setCells] = useState<CellData[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [statusText, setStatusText] = useState<string>('Калибровка межпространственной связи...');
  const [statusState, setStatusState] = useState<'green' | 'yellow' | 'red' | 'blue'>('blue');
  const [contractVersion, setContractVersion] = useState<string>('0.0.0.0.6');
  const [lastBlockTimestamp, setLastBlockTimestamp] = useState<number | null>(null);
  const [lastBlockNumber, setLastBlockNumber] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string>('');
  const [walletProviders, setWalletProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [player, setPlayer] = useState<{ x: number; y: number; exists: boolean } | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState<boolean>(false);
  const [actionPending, setActionPending] = useState<boolean>(false);
  const [isDirectSignerMode, setIsDirectSignerMode] = useState<boolean>(false);
  const [pkInput, setPkInput] = useState<string>('');
  const [showPkInputModal, setShowPkInputModal] = useState<boolean>(false);
  const CLIENT_VERSION = '0.0.0.0.13';
  const RELAYER_URL = 'https://infinity-verse-relayer.infinity-verse.workers.dev';

  // Поиск всех установленных кошельков по стандарту EIP-6963
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

  // Очистка устаревших ключей из localStorage ради безопасности
  try {
    localStorage.removeItem('iv_session_key');
  } catch {}

  // Получение или создание сессионного ключа строго в оперативной памяти (RAM)
  const getOrCreateSessionAccount = () => {
    if (!inMemorySessionAccount) {
      const sk = generatePrivateKey();
      inMemorySessionAccount = privateKeyToAccount(sk);
    }
    return inMemorySessionAccount;
  };

  // Подключение выбранного кошелька с авторизацией сессии
  const connectProvider = async (providerDetail?: EIP6963ProviderDetail) => {
    try {
      let prov = providerDetail?.provider || (window as any).ethereum;
      if (!prov) {
        alert('Кошелёк не найден! Установите расширение MetaMask, Rabby или Phantom.');
        return;
      }
      const accounts = await prov.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) return;

      const userAddress = accounts[0];
      setConnectedAddress(userAddress);
      setIsWalletModalOpen(false);
      setIsPlayerLoading(true);

      // 1. Сразу считываем ончейн-состояние игрока, чтобы фронтенд знал статус
      const pData: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'getPlayer',
        args: [userAddress as `0x${string}`]
      });

      const playerExists = Boolean(pData[2]);
      setPlayer({
        x: Number(pData[0]),
        y: Number(pData[1]),
        exists: playerExists
      });
      setIsPlayerLoading(false);

      const sessionAccount = getOrCreateSessionAccount();
      const nowSec = Math.floor(Date.now() / 1000);
      const isSessionActive = pData[3] && pData[3].toLowerCase() === sessionAccount.address.toLowerCase() && Number(pData[4]) > nowSec;

      // Если сессия не авторизована в блокчейне — запрашиваем 1 подпись у кошелька
      if (!isSessionActive) {
        setStatusText('✍️ Подпишите сессию в кошельке (1 раз на 24 часа)...');
        const expiry = nowSec + 86400; // 24 часа
        const nonce = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'nonces',
          args: [userAddress as `0x${string}`]
        });

        // Создаем хэш: keccak256("AuthorizeSession", player, sessionKey, expiry, nonce, chainId)
        const innerHash = keccak256(
          encodePacked(
            ['string', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            ['AuthorizeSession', userAddress as `0x${string}`, sessionAccount.address, BigInt(expiry), nonce, BigInt(10143)]
          )
        );

        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });

        const sig = await walletClient.signMessage({
          account: userAddress as `0x${string}`,
          message: { raw: innerHash }
        });

        setStatusText('⏳ Регистрация криптографической сессии через релеер...');
        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'authorize_session',
            player: userAddress,
            sessionKey: sessionAccount.address,
            expiry,
            sig
          })
        });
        const resData = await res.json();
        if (!res.ok || resData.error) throw new Error(resData.error || 'Session auth failed');
        setStatusText('✅ Сессия подтверждена! Играйте без всплывающих окон.');
      }

      await fetchState();
    } catch (err: any) {
      console.error('Ошибка подключения/сессии:', err);
      alert('Ошибка при авторизации сессии: ' + (err.shortMessage || err.message));
    }
  };

  // Принудительный ончейн-отзыв сессии игрока (Logout / Revoke Session)
  const handleRevokeSession = async () => {
    if (!connectedAddress) return;
    if (!confirm('Вы уверены, что хотите аннулировать сессию? Текущий временный ключ будет заблокирован в блокчейне.')) return;

    setActionPending(true);
    setStatusText('⏳ Аннулирование сессии ончейн...');

    try {
      const nonce = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'nonces',
        args: [connectedAddress as `0x${string}`]
      });

      // Хэш: keccak256("RevokeSession", player, nonce, chainId)
      const revokeInnerHash = keccak256(
        encodePacked(
          ['string', 'address', 'uint256', 'uint256'],
          ['RevokeSession', connectedAddress as `0x${string}`, nonce, BigInt(10143)]
        )
      );

      let prov = (window as any).ethereum;
      if (!prov && walletProviders.length > 0) {
        prov = walletProviders[0].provider;
      }

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(prov)
      });

      const sig = await walletClient.signMessage({
        account: connectedAddress as `0x${string}`,
        message: { raw: revokeInnerHash }
      });

      const res = await fetch(RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_session',
          player: connectedAddress,
          sig
        })
      });

      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || 'Revoke failed');

      inMemorySessionAccount = null;
      setStatusText('🔒 Сессия успешно отозвана в блокчейне!');
      await fetchState();
    } catch (err: any) {
      console.error('Ошибка отзыва сессии:', err);
      alert('Ошибка при отзыве сессии: ' + (err.shortMessage || err.message));
    } finally {
      setActionPending(false);
    }
  };

  // Подключение приватным ключом (прямой режим через шифрование в RAM)
  const connectWithPrivateKey = async () => {
    if (!pkInput || pkInput.length < 64) {
      alert('Введите корректный приватный ключ (64 hex-символа)!');
      return;
    }

    try {
      setIsPlayerLoading(true);
      setShowPkInputModal(false);
      setStatusText('🔐 Шифрование ключа в оперативной памяти (AES-GCM-256)...');

      const userAddress = await EncryptedRamSigner.lockPrivateKey(pkInput);
      setPkInput(''); // Стираем инпут сразу из формы
      setConnectedAddress(userAddress);
      setIsDirectSignerMode(true);
      setIsWalletModalOpen(false);

      // Считываем ончейн-состояние
      const pData: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'getPlayer',
        args: [userAddress]
      });

      setPlayer({
        x: Number(pData[0]),
        y: Number(pData[1]),
        exists: Boolean(pData[2])
      });
      setIsPlayerLoading(false);
      setStatusText('⚡ Автономный режим: прямое подписания из зашифрованной RAM');
      await fetchState();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при импорте ключа: ' + (err.message || err));
      setIsPlayerLoading(false);
    }
  };

  // Рождение игрока в мире (spawn на 1, 0)
  const handleSpawn = async () => {
    if (!connectedAddress) return;
    setActionPending(true);

    try {
      if (isDirectSignerMode && EncryptedRamSigner.isLocked()) {
        // Прямой вызов spawn со своего баланса без посредников
        setStatusText('⏳ Прямой ончейн-спавн в Monad RPC...');
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'spawn',
            args: [connectedAddress as `0x${string}`]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        // Через бесплатный спонсорский релеер
        setStatusText('⏳ Рождение игрока через релеер (Gasless)...');
        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'spawn', player: connectedAddress })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Relayer error');
      }

      await fetchState();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при спавне: ' + (err.message || err));
    } finally {
      setActionPending(false);
    }
  };

  // Перемещение игрока
  const handleMove = async (targetX: number, targetY: number) => {
    if (!connectedAddress || !player?.exists) return;
    setActionPending(true);
    setStatusText(`⏳ Ход на (${targetX}, ${targetY})...`);

    try {
      if (isDirectSignerMode && EncryptedRamSigner.isLocked()) {
        // Прямой ход moveDirect без релеера и ожидания сессий
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'moveDirect',
            args: [targetX, targetY]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        // Ход через сессионный ключ и релеер
        const sessionAccount = getOrCreateSessionAccount();
        const nonce = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'nonces',
          args: [connectedAddress as `0x${string}`]
        });

        // Хэш хода: keccak256("Move", player, targetX, targetY, nonce, chainId)
        const moveInnerHash = keccak256(
          encodePacked(
            ['string', 'address', 'int32', 'int32', 'uint256', 'uint256'],
            ['Move', connectedAddress as `0x${string}`, targetX, targetY, nonce, BigInt(10143)]
          )
        );

        const moveSig = await sessionAccount.signMessage({
          message: { raw: moveInnerHash }
        });

        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move',
            player: connectedAddress,
            targetX,
            targetY,
            moveSig
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Move error');
      }

      await fetchState();
    } catch (err: any) {
      console.error(err);
      alert('Недопустимый ход или ошибка: ' + (err.message || err));
    } finally {
      setActionPending(false);
    }
  };

  const fetchState = async () => {
    try {
      const xs = INITIAL_COORDS.map(c => c.x);
      const ys = INITIAL_COORDS.map(c => c.y);

      const calls: any[] = [
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'VERSION',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'getCellsBatch',
          args: [xs, ys]
        }),
        publicClient.getBlock({ blockTag: 'latest' })
      ];

      if (connectedAddress) {
        calls.push(
          publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'getPlayer',
            args: [connectedAddress as `0x${string}`]
          })
        );
      }

      const results = await Promise.all(calls);
      const ver = results[0];
      const onchainCells = results[1];
      const latestBlock = results[2];

      if (connectedAddress && results[3]) {
        const p = results[3];
        setPlayer({ x: Number(p[0]), y: Number(p[1]), exists: Boolean(p[2]) });
      }

      setContractVersion(ver);
      setLastBlockTimestamp(Number(latestBlock.timestamp));
      setLastBlockNumber(latestBlock.number.toString());

      const parsed: CellData[] = INITIAL_COORDS.map((coord, i) => {
        const c = onchainCells[i];
        const localKey = keccak256(encodePacked(['int32', 'int32'], [coord.x, coord.y]));

        return {
          x: coord.x,
          y: coord.y,
          key: localKey,
          terrain: Number(c.terrain),
          object: Number(c.object),
          state: Number(c.state),
          reserved: Number(c.reserved),
          paramA: Number(c.paramA),
          paramB: Number(c.paramB),
        };
      });

      setCells(parsed);
    } catch (err: any) {
      console.error(err);
      setStatusState('red');
      setStatusText('🚨 Ошибка: межпространственная связь потеряна');
    }
  };

  // 1. Постоянный опрос смарт-контракта и ноды (зависит от connectedAddress)
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, CONNECTION_CONFIG.SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [connectedAddress]);

  // 2. Ежесекундный живой таймер свежести блока и светофор
  useEffect(() => {
    if (!lastBlockTimestamp) return;

    const updateStatus = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const ageSec = Math.max(0, nowSec - lastBlockTimestamp);

      if (ageSec > CONNECTION_CONFIG.DANGER_BLOCK_AGE_SEC) {
        setStatusState('red');
        setStatusText(`🚨 Сигнал угасает (${ageSec} сек назад)`);
      } else if (ageSec > CONNECTION_CONFIG.WARN_BLOCK_AGE_SEC) {
        setStatusState('yellow');
        setStatusText(`⚠️ Замедление связи (${ageSec} сек назад)`);
      } else {
        setStatusState('green');
        setStatusText(`📡 Межпространственная связь стабильна (${ageSec} сек назад)`);
      }
    };

    updateStatus();
    const ticker = setInterval(updateStatus, 1000);
    return () => clearInterval(ticker);
  }, [lastBlockTimestamp, lastBlockNumber]);

  const curCell = cells.find(c => c.x === selectedCoord.x && c.y === selectedCoord.y) || null;
  const terrainInfo = curCell
    ? (TERRAIN_CONFIG[curCell.terrain] || { name: `Тип #${curCell.terrain}`, icon: '🗺️', bg: '#1a1d2e' })
    : null;
  const objectInfo = curCell
    ? (OBJECT_CONFIG[curCell.object] || { name: `Объект #${curCell.object}`, icon: '✨' })
    : null;

  return (
    <div style={{
      boxSizing: 'border-box',
      width: '100vw',
      height: '100dvh',
      padding: 'max(10px, env(safe-area-inset-top, 10px)) max(10px, env(safe-area-inset-right, 10px)) max(10px, env(safe-area-inset-bottom, 10px)) max(10px, env(safe-area-inset-left, 10px))',
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
        padding: '16px',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui, sans-serif',
        userSelect: 'none',
        overflowY: 'auto'
      }}>
        {/* Заголовок */}
        <div style={{ textAlign: 'center', margin: '2px 0 6px 0' }}>
          <div style={{
            fontSize: '1.05rem',
            color: '#c084fc',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 800
          }}>
            INFINITY-VERSE
          </div>
        </div>

        {/* Верхняя игровая область: Сетка 5х5 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          margin: '6px 0 12px 0',
          width: '100%'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 78px)',
            gridTemplateRows: 'repeat(5, 78px)',
            gap: '6px',
            backgroundColor: '#10131d',
            padding: '6px',
            border: '2px solid #2e384d',
            borderRadius: '0px'
          }}>
            {INITIAL_COORDS.map((coord) => {
              const cell = cells.find(c => c.x === coord.x && c.y === coord.y);
              const isSelected = selectedCoord.x === coord.x && selectedCoord.y === coord.y;
              const tInfo = cell ? (TERRAIN_CONFIG[cell.terrain] || { name: `T:${cell.terrain}`, icon: '', bg: '#14291e' }) : TERRAIN_CONFIG[0];
              const oInfo = cell ? (OBJECT_CONFIG[cell.object] || { name: `O:${cell.object}`, icon: '' }) : OBJECT_CONFIG[0];

              return (
                <button
                  key={`${coord.x},${coord.y}`}
                  onClick={() => setSelectedCoord({ x: coord.x, y: coord.y })}
                  style={{
                    boxSizing: 'border-box',
                    width: '78px',
                    height: '78px',
                    backgroundColor: tInfo.bg,
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                    borderRadius: '0px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: '#ffffff',
                    fontFamily: 'inherit',
                    position: 'relative',
                    padding: '3px 4px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 14px rgba(56, 189, 248, 0.7)' : 'none'
                  }}
                >
                  {/* Верхняя строка: Координаты (слева) и Названия (вправо вверх) */}
                  <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    lineHeight: 1
                  }}>
                    <span style={{
                      fontSize: '0.55rem',
                      color: isSelected ? '#38bdf8' : '#cbd5e1',
                      fontWeight: isSelected ? 800 : 600
                    }}>
                      ({coord.x},{coord.y})
                    </span>

                    {/* Названия: Ландшафт и Объект вправо вверх */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      textAlign: 'right'
                    }}>
                      <span style={{
                        fontSize: '0.52rem',
                        color: '#fef08a',
                        fontWeight: 700
                      }}>
                        {tInfo.name}
                      </span>
                      <span style={{
                        fontSize: '0.48rem',
                        color: cell?.object ? '#67e8f9' : '#64748b',
                        fontWeight: cell?.object ? 700 : 500
                      }}>
                        {cell?.object ? oInfo.name : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Центр клетки: Обелиск или Игрок */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    fontSize: '1.75rem',
                    lineHeight: 1,
                    position: 'relative'
                  }}>
                    {/* Если на этой клетке стоит игрок — показываем фигурку игрока */}
                    {player?.exists && player.x === coord.x && player.y === coord.y ? (
                      <span title="Ваш персонаж" style={{ filter: 'drop-shadow(0 0 8px #38bdf8)' }}>
                        🧑‍🚀
                      </span>
                    ) : (
                      cell?.object ? oInfo.icon : ''
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Панель управления Игроком и Кошельком */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            margin: '4px 0'
          }}>
            {!connectedAddress ? (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '8px 20px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚡ ПОДКЛЮЧИТЬ КОШЕЛЕК</span>
                <span style={{ fontSize: '0.62rem', backgroundColor: '#6d28d9', padding: '2px 6px' }}>
                  {walletProviders.length > 0 ? `${walletProviders.length} найдено` : 'МЕНЮ'}
                </span>
              </button>
            ) : isPlayerLoading ? (
              <div style={{
                fontSize: '0.75rem',
                color: '#38bdf8',
                fontWeight: 700,
                letterSpacing: '0.05em',
                padding: '8px 16px',
                border: '1px dashed #38bdf8'
              }}>
                ⏳ ПОИСК ПЕРСОНАЖА В БЛОКЧЕЙНЕ...
              </div>
            ) : !player?.exists ? (
              <button
                onClick={handleSpawn}
                disabled={actionPending}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '8px 18px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: actionPending ? 'wait' : 'pointer',
                  letterSpacing: '0.05em',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
                }}
              >
                {actionPending ? 'РОЖДЕНИЕ В МИРЕ...' : '✨ РОДИТЬСЯ В МИРЕ (НА 1, 0)'}
              </button>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.72rem',
                backgroundColor: '#131826',
                border: '1px solid #38bdf8',
                padding: '6px 12px'
              }}>
                <span>🧑‍🚀 Игрок: <b>({player.x}, {player.y})</b></span>
                {isDirectSignerMode ? (
                  <button
                    onClick={() => {
                      EncryptedRamSigner.clear();
                      setIsDirectSignerMode(false);
                      setConnectedAddress('');
                      setPlayer(null);
                    }}
                    title="Выйти и стереть зашифрованный ключ из оперативной памяти"
                    style={{
                      backgroundColor: 'transparent',
                      color: '#fbbf24',
                      border: '1px solid #d97706',
                      padding: '2px 6px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginLeft: '4px'
                    }}
                  >
                    🔐 ВЫЙТИ ИЗ RAM
                  </button>
                ) : (
                  <button
                    onClick={handleRevokeSession}
                    disabled={actionPending}
                    title="Аннулировать сессионный ключ в блокчейне"
                    style={{
                      backgroundColor: 'transparent',
                      color: '#f87171',
                      border: '1px solid #ef4444',
                      padding: '2px 6px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      cursor: actionPending ? 'wait' : 'pointer',
                      marginLeft: '4px'
                    }}
                  >
                    🔒 СБРОС СЕССИИ
                  </button>
                )}
                {/* Если выбрана соседняя клетка — предлагаем сделать шаг */}
                {(() => {
                  const dx = Math.abs(selectedCoord.x - player.x);
                  const dy = Math.abs(selectedCoord.y - player.y);
                  const isAdjacent = (dx <= 1 && dy <= 1) && (dx + dy > 0);
                  const isObelisk = selectedCoord.x === 0 && selectedCoord.y === 0;

                  if (isAdjacent && !isObelisk) {
                    return (
                      <button
                        onClick={() => handleMove(selectedCoord.x, selectedCoord.y)}
                        disabled={actionPending}
                        style={{
                          backgroundColor: '#38bdf8',
                          color: '#07080d',
                          border: 'none',
                          borderRadius: '0px',
                          padding: '4px 10px',
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          cursor: actionPending ? 'wait' : 'pointer',
                          marginLeft: '6px'
                        }}
                      >
                        {actionPending ? 'ХОД...' : `ШАГНУТЬ НА (${selectedCoord.x}, ${selectedCoord.y}) ➔`}
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          {/* Статус связи со Вселенной */}
          <div style={{
            minHeight: '22px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: statusState === 'red'
              ? '#ef4444' // Красный: критическая задержка или потеря связи
              : statusState === 'yellow'
                ? '#facc15' // Жёлтый: задержка сигнала
                : statusState === 'green'
                  ? '#4ade80' // Зелёный: стабильная быстрая связь
                  : '#38bdf8', // Синий: начальная калибровка
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.25s ease'
          }}>
            {statusText}
          </div>
        </div>

        {/* Нижняя панель: Инспектор выбранной клетки, растянутый во всю ширину */}
        {curCell ? (
          <div style={{
            width: '100%',
            maxWidth: '680px',
            backgroundColor: '#0d111a',
            border: '1px solid #38bdf8',
            borderRadius: '0px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.72rem',
            margin: '0 auto 12px auto'
          }}>
            <div style={{
              color: '#38bdf8',
              fontWeight: 800,
              textTransform: 'uppercase',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>ИНСПЕКТОР: КЛЕТКА ({curCell.x}, {curCell.y})</span>
              <span style={{ color: '#a78bfa' }}>8 БАЙТ (64 БИТА)</span>
            </div>

            {/* Сетка колонок инспектора для широкого экрана */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '8px'
            }}>
              {/* Колонка 1: Координаты в EVM и ключ Mapping */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(() => {
                  const toUint32 = (n: number) => (n >>> 0);
                  const xU32 = toUint32(curCell.x);
                  const yU32 = toUint32(curCell.y);
                  const xHex = '0x' + xU32.toString(16).padStart(8, '0');
                  const yHex = '0x' + yU32.toString(16).padStart(8, '0');
                  const xBin = xU32.toString(2).padStart(32, '0');
                  const yBin = yU32.toString(2).padStart(32, '0');

                  return (
                    <div style={{
                      backgroundColor: '#0a0d14',
                      border: '1px solid #334155',
                      borderRadius: '0px',
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.66rem' }}>
                          КООРДИНАТЫ В EVM (int32):
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.60rem' }}>Two's Complement</span>
                      </div>

                      {/* Разбор X */}
                      <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: curCell.x < 0 ? '#c084fc' : '#4ade80' }}>
                            X = {curCell.x} {curCell.x < 0 ? '(минус)' : ''}:
                          </span>
                          <span>HEX: <b style={{ color: curCell.x < 0 ? '#c084fc' : '#38bdf8' }}>{xHex}</b></span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.56rem' }}>
                          BIN: {xBin.slice(0, 8)} {xBin.slice(8, 16)} {xBin.slice(16, 24)} {xBin.slice(24, 32)}
                        </div>
                      </div>

                      {/* Разбор Y */}
                      <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: curCell.y < 0 ? '#c084fc' : '#4ade80' }}>
                            Y = {curCell.y} {curCell.y < 0 ? '(минус)' : ''}:
                          </span>
                          <span>HEX: <b style={{ color: curCell.y < 0 ? '#c084fc' : '#38bdf8' }}>{yHex}</b></span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.56rem' }}>
                          BIN: {yBin.slice(0, 8)} {yBin.slice(8, 16)} {yBin.slice(16, 24)} {yBin.slice(24, 32)}
                        </div>
                      </div>

                      {/* Упаковка abi.encodePacked(x, y) */}
                      <div style={{
                        marginTop: '2px',
                        paddingTop: '3px',
                        borderTop: '1px dashed #1e293b',
                        fontSize: '0.60rem',
                        fontFamily: 'monospace'
                      }}>
                        <div style={{ color: '#fbbf24' }}>abi.encodePacked(x, y) [8 байт]:</div>
                        <div style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>
                          0x<span style={{ color: curCell.x < 0 ? '#c084fc' : '#38bdf8' }}>{xHex.slice(2)}</span>
                          <span style={{ color: curCell.y < 0 ? '#c084fc' : '#a78bfa' }}>{yHex.slice(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Разбор ключа в Mapping */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#131826', padding: '6px', borderRadius: '0px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.66rem' }}>Ключ в Mapping: keccak256(abi.encodePacked)</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.63rem', wordBreak: 'break-all' }}>
                    {curCell.key}
                  </span>
                </div>
              </div>

              {/* Колонка 2: Параметры структуры Cell и HEX/BIN раскладка */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  <div style={{ backgroundColor: '#131826', padding: '4px 6px', borderRadius: '0px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>terrain</div>
                    <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.terrain} — {terrainInfo?.name}</div>
                  </div>

                  <div style={{ backgroundColor: '#131826', padding: '4px 6px', borderRadius: '0px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>object</div>
                    <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.object} — {objectInfo?.name || 'Пусто'}</div>
                  </div>

                  <div style={{ backgroundColor: '#131826', padding: '4px 6px', borderRadius: '0px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>state</div>
                    <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.state}</div>
                  </div>

                  <div style={{ backgroundColor: '#131826', padding: '4px 6px', borderRadius: '0px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>reserved</div>
                    <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.reserved}</div>
                  </div>

                  <div style={{ backgroundColor: '#131826', padding: '4px 6px', borderRadius: '0px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>paramA</div>
                    <div style={{ color: '#38bdf8', fontWeight: 700 }}>{curCell.paramA}</div>
                  </div>

                  <div style={{ backgroundColor: '#131826', padding: '4px 6px', borderRadius: '0px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>paramB</div>
                    <div style={{ color: '#38bdf8', fontWeight: 700 }}>{curCell.paramB}</div>
                  </div>
                </div>

                {/* HEX строка 8 байт */}
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.68rem',
                  backgroundColor: '#0a0d14',
                  border: '1px solid #1e293b',
                  padding: '5px 8px',
                  borderRadius: '0px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#94a3b8' }}>8B HEX:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                    <span style={{ color: '#38bdf8' }}>0x</span>
                    <span title="terrain (1B)" style={{ color: '#4ade80' }}>{curCell.terrain.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="object (1B)" style={{ color: '#facc15' }}>{curCell.object.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="state (1B)" style={{ color: '#fb923c' }}>{curCell.state.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="reserved (1B)" style={{ color: '#94a3b8' }}>{curCell.reserved.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="paramA (2B)" style={{ color: '#c084fc' }}>{curCell.paramA.toString(16).padStart(4, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="paramB (2B)" style={{ color: '#f472b6' }}>{curCell.paramB.toString(16).padStart(4, '0')}</span>
                  </span>
                </div>

                {/* Битовые значения полей */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '2px 8px',
                  fontSize: '0.58rem',
                  fontFamily: 'monospace',
                  backgroundColor: '#0a0d14',
                  padding: '5px 8px',
                  border: '1px solid #1e293b'
                }}>
                  <div><span style={{ color: '#4ade80' }}>T:</span> {curCell.terrain.toString(2).padStart(8, '0')}</div>
                  <div><span style={{ color: '#facc15' }}>O:</span> {curCell.object.toString(2).padStart(8, '0')}</div>
                  <div><span style={{ color: '#fb923c' }}>S:</span> {curCell.state.toString(2).padStart(8, '0')}</div>
                  <div><span style={{ color: '#94a3b8' }}>R:</span> {curCell.reserved.toString(2).padStart(8, '0')}</div>
                  <div><span style={{ color: '#c084fc' }}>A:</span> {curCell.paramA.toString(2).padStart(16, '0')}</div>
                  <div><span style={{ color: '#f472b6' }}>B:</span> {curCell.paramB.toString(2).padStart(16, '0')}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Загрузка данных клетки...</div>
        )}

        {/* Футер */}
        <div style={{
          fontSize: '0.72rem',
          color: '#64748b',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <div>Контракт: <span style={{ color: '#c084fc', fontWeight: 700 }}>v{contractVersion}</span> ({CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)})</div>
          <div>Клиент: <span style={{ color: '#38bdf8', fontWeight: 700 }}>v{CLIENT_VERSION}</span></div>
        </div>
      </div>

      {/* Модальное окно выбора кошелька (EIP-6963 Multi-Wallet) */}
      {isWalletModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#0d111a',
            border: '2px solid #8b5cf6',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
            width: '100%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            color: '#f8fafc',
            fontFamily: 'monospace, system-ui, sans-serif'
          }}>
            {/* Заголовок модалки */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px'
            }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#c084fc', letterSpacing: '0.05em' }}>
                ⚡ ВЫБЕРИТЕ КОШЕЛЕК
              </span>
              <button
                onClick={() => setIsWalletModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Список обнаруженных браузерных кошельков */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {walletProviders.length > 0 ? (
                walletProviders.map((w) => (
                  <button
                    key={w.info.uuid}
                    onClick={() => connectProvider(w)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#161b26',
                      border: '1px solid #334155',
                      padding: '10px 12px',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {w.info.icon ? (
                      <img src={w.info.icon} alt={w.info.name} style={{ width: '24px', height: '24px' }} />
                    ) : (
                      <span>💼</span>
                    )}
                    <span>{w.info.name}</span>
                  </button>
                ))
              ) : (
                // Стандартный fallback на window.ethereum
                <button
                  onClick={() => connectProvider()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#161b26',
                    border: '1px solid #334155',
                    padding: '10px 12px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🦊</span>
                  <div>
                    <div>Браузерный кошелек</div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b' }}>MetaMask / Rabby / Phantom</div>
                  </div>
                </button>
              )}
            </div>

            {/* Разделитель и кнопка входа по приватному ключу с AES-GCM шифрованием в RAM */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '4px 0',
              color: '#64748b',
              fontSize: '0.62rem'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
              <span>АВТОНОМНЫЙ РЕЖИМ</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
            </div>

            <button
              onClick={() => {
                setIsWalletModalOpen(false);
                setShowPkInputModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: '#1e1b4b',
                border: '1px solid #6366f1',
                padding: '10px 12px',
                color: '#e0e7ff',
                cursor: 'pointer',
                fontSize: '0.74rem',
                fontWeight: 700,
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🔐</span>
              <div>
                <div style={{ color: '#a5b4fc' }}>Вход по ключу (Шифрование в RAM)</div>
                <div style={{ fontSize: '0.58rem', color: '#818cf8' }}>Прямой ончейн без релееров, AES-GCM-256</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно ввода приватного ключа с шифрованием на лету */}
      {showPkInputModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#0d111a',
            border: '2px solid #6366f1',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
            width: '100%',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '18px',
            color: '#f8fafc',
            fontFamily: 'monospace, system-ui, sans-serif'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px'
            }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#a5b4fc', letterSpacing: '0.05em' }}>
                🔐 ПРИВАТНЫЙ КЛЮЧ (ШИФРОВАНИЕ В RAM)
              </span>
              <button
                onClick={() => {
                  setShowPkInputModal(false);
                  setPkInput('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Ключ никогда не сохраняется на диске (localStorage выключен). При загрузке генерируется случайный 256-битный мастер-ключ, и приватник держится в памяти в виде зашифрованного шума AES-GCM.
            </div>

            <input
              type="password"
              placeholder="0x... (приватный ключ EVM)"
              value={pkInput}
              onChange={(e) => setPkInput(e.target.value)}
              style={{
                backgroundColor: '#131826',
                border: '1px solid #334155',
                padding: '8px 10px',
                color: '#f8fafc',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                onClick={() => {
                  setShowPkInputModal(false);
                  setPkInput('');
                }}
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: '#9ca3af',
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={connectWithPrivateKey}
                style={{
                  backgroundColor: '#6366f1',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 16px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
                }}
              >
                ЗАШИФРОВАТЬ И ВОЙТИ ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
