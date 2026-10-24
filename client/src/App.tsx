import { useState, useEffect, useRef } from 'react';
import { createPublicClient, createWalletClient, http, parseAbi, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const CONTRACT_ADDRESS = '0x29cd5fff5b741e69c6cca55a3637d0d56791b7bd';
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

// Встроенный аккаунт деплоера
const TEST_ACCOUNT = privateKeyToAccount('0x8b397357e09a218b105672b81af7ea2ba6f5dff60353c5f76abcad691b6000a0');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const VERSE_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function getGrid() view returns (address[9])',
  'function starCell() view returns (int8)',
  'function starBalance(address) view returns (uint256)',
  'function isSpawned(address) view returns (bool)',
  'function move(uint8 targetCell) external',
  'function spawn(uint8 targetCell) external'
]);

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL)
});

const walletClient = createWalletClient({
  account: TEST_ACCOUNT,
  chain: monadTestnet,
  transport: http(RPC_URL)
});

function App() {
  const [grid, setGrid] = useState<string[]>(Array(9).fill(ZERO_ADDRESS));
  const [starCell, setStarCell] = useState<number>(-1);
  const [starBalance, setStarBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastTxDuration, setLastTxDuration] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Сетка подключена');
  const [contractVersion, setContractVersion] = useState<string>('...');
  const CLIENT_VERSION = '0.0.0.0.2';
  const timerRef = useRef<number | null>(null);

  const fetchState = async () => {
    try {
      const [gridData, starIdx, balance, onchainVer] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'getGrid'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'starCell'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'starBalance',
          args: [TEST_ACCOUNT.address]
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'VERSION'
        })
      ]);

      setGrid([...gridData]);
      setStarCell(Number(starIdx));
      setStarBalance(Number(balance));
      setContractVersion(onchainVer);
    } catch (e: any) {
      console.error('Fetch state error:', e);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCellClick = async (targetCellIndex: number) => {
    if (loading) return;

    const myPos = grid.findIndex(addr => addr.toLowerCase() === TEST_ACCOUNT.address.toLowerCase());
    if (myPos === targetCellIndex) {
      setStatusText('Вы уже находитесь в этой клетке');
      return;
    }

    if (grid[targetCellIndex] !== ZERO_ADDRESS) {
      setStatusText(`Клетка занята другим игроком`);
      return;
    }

    // Проверка ортогонального соседства
    if (myPos !== -1) {
      const fromX = myPos % 3;
      const fromY = Math.floor(myPos / 3);
      const toX = targetCellIndex % 3;
      const toY = Math.floor(targetCellIndex / 3);
      const dist = Math.abs(fromX - toX) + Math.abs(fromY - toY);
      if (dist !== 1) {
        setStatusText('Ход возможен только в соседнюю клетку');
        return;
      }
    }

    try {
      setLoading(true);
      setStatusText(`Ход в клетку #${targetCellIndex}...`);
      setElapsedSeconds(0);
      const startTime = performance.now();

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Number(((performance.now() - startTime) / 1000).toFixed(1)));
      }, 100);

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'move',
        args: [targetCellIndex]
      });

      setStatusText('Ждём Monad блок: ' + hash.slice(0, 10) + '...');
      await publicClient.waitForTransactionReceipt({ hash });

      const duration = Number(((performance.now() - startTime) / 1000).toFixed(2));
      setLastTxDuration(duration);
      setStatusText(`Успешный ход за ${duration}с!`);
      await fetchState();
    } catch (err: any) {
      console.error(err);
      setStatusText(err.shortMessage || err.message || 'Ошибка хода');
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  const myAddressLower = TEST_ACCOUNT.address.toLowerCase();

  return (
    <div style={{
      boxSizing: 'border-box',
      width: '100vw',
      height: '100dvh',
      padding: 'max(12px, env(safe-area-inset-top, 12px)) max(12px, env(safe-area-inset-right, 12px)) max(12px, env(safe-area-inset-bottom, 12px)) max(12px, env(safe-area-inset-left, 12px))',
      backgroundColor: '#0a0b10',
      display: 'flex',
    }}>
      <div style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        border: '3px solid #8b5cf6',
        borderRadius: '0px',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 16px 16px 16px',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui, sans-serif',
        userSelect: 'none',
      }}>
        {/* Хедер и баланс */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#a78bfa',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 800
          }}>
            INFINITY-VERSE &bull; 3x3 GRID
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(250, 204, 21, 0.1)',
            border: '1px solid #eab308',
            padding: '6px 14px',
          }}>
            <span style={{ fontSize: '1.2rem' }}>⭐</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fde047' }}>
              Баланс звёзд: {starBalance}
            </span>
          </div>

          <div style={{
            fontSize: '0.72rem',
            color: '#94a3b8'
          }}>
            Вы: {TEST_ACCOUNT.address.slice(0, 6)}...{TEST_ACCOUNT.address.slice(-4)}
          </div>
        </div>

        {/* Сетка 3x3 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          margin: 'auto 0'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 90px)',
            gridTemplateRows: 'repeat(3, 90px)',
            gap: '8px',
            backgroundColor: '#12141f',
            padding: '10px',
            border: '2px solid #334155'
          }}>
            {grid.map((cellAddr, idx) => {
              const isOccupied = cellAddr !== ZERO_ADDRESS;
              const isMe = cellAddr.toLowerCase() === myAddressLower;
              const hasStar = starCell === idx && !isOccupied;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={loading}
                  style={{
                    boxSizing: 'border-box',
                    width: '90px',
                    height: '90px',
                    backgroundColor: isOccupied
                      ? (isMe ? '#7c3aed' : '#ec4899')
                      : (hasStar ? '#1e1b4b' : '#1e2235'),
                    border: isOccupied
                      ? '2px solid #c084fc'
                      : (hasStar ? '2px solid #eab308' : '1px dashed #475569'),
                    borderRadius: '0px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    color: '#ffffff',
                    fontFamily: 'inherit',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isOccupied
                      ? '0 0 16px rgba(139, 92, 246, 0.7)'
                      : (hasStar ? '0 0 16px rgba(234, 179, 8, 0.5)' : 'none')
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    left: '6px',
                    fontSize: '0.62rem',
                    color: isOccupied ? '#ddd6fe' : '#64748b'
                  }}>
                    #{idx}
                  </span>

                  {isOccupied ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>🧑‍🚀</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                        {isMe ? 'ВЫ' : `${cellAddr.slice(0, 4)}..`}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>
                        {cellAddr.slice(0, 4)}...{cellAddr.slice(-2)}
                      </span>
                    </div>
                  ) : hasStar ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      animation: 'pulse 1.5s infinite'
                    }}>
                      <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>⭐</span>
                      <span style={{ fontSize: '0.6rem', color: '#fde047', fontWeight: 800 }}>
                        STAR
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '1.2rem', color: '#475569' }}>
                      &middot;
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Индикатор статуса */}
          <div style={{
            fontSize: '0.85rem',
            color: loading ? '#38bdf8' : '#4ade80',
            textAlign: 'center',
            maxWidth: '300px',
            minHeight: '20px'
          }}>
            {loading ? (
              <span>⏳ {statusText} ({elapsedSeconds}s)</span>
            ) : (
              <span>{statusText}</span>
            )}
          </div>

          {lastTxDuration !== null && !loading && (
            <div style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '6px 12px',
              border: '1px solid #334155'
            }}>
              Реакция Monad: <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{lastTxDuration}с</span>
            </div>
          )}
        </div>

        {/* Футер: раздельные версии */}
        <div style={{
          fontSize: '0.75rem',
          color: '#64748b',
          letterSpacing: '0.05em',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}>
          <div>Контракт: <span style={{ color: '#a78bfa', fontWeight: 700 }}>v{contractVersion}</span> &bull; Monad Testnet</div>
          <div>Фронтенд: <span style={{ color: '#38bdf8', fontWeight: 700 }}>v{CLIENT_VERSION}</span></div>
        </div>
      </div>
    </div>
  );
}

export default App;
