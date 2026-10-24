import { useState, useEffect, useRef } from 'react';
import { createPublicClient, createWalletClient, http, parseAbi, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const CONTRACT_ADDRESS = '0xbd418dd1b75ffbfa8f26d5ec75fece5c006d4fd0';
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

// Встроенный аккаунт деплоера (Игрок 1)
const TEST_ACCOUNT = privateKeyToAccount('0x8b397357e09a218b105672b81af7ea2ba6f5dff60353c5f76abcad691b6000a0');

const VERSE_ABI = parseAbi([
  'function getGrid() view returns (uint256[9])',
  'function addressToPlayerId(address) view returns (uint256)',
  'function playerPosition(uint256) view returns (uint8)',
  'function isAdjacent(uint8, uint8) pure returns (bool)',
  'function move(uint8 targetCell) external',
  'function spawn(uint8 targetCell) external returns (uint256)'
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
  const [grid, setGrid] = useState<number[]>(Array(9).fill(0));
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastTxDuration, setLastTxDuration] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Сетка загружена');
  const timerRef = useRef<number | null>(null);

  const fetchState = async () => {
    try {
      const [gridData, myId] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'getGrid'
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'addressToPlayerId',
          args: [TEST_ACCOUNT.address]
        })
      ]);

      setGrid(gridData.map(Number));
      setPlayerId(Number(myId));
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

    const myPos = grid.indexOf(playerId || 1);
    if (myPos === targetCellIndex) {
      setStatusText('Вы уже находитесь в этой клетке');
      return;
    }

    if (grid[targetCellIndex] !== 0) {
      setStatusText(`Клетка #${targetCellIndex} занята игроком #${grid[targetCellIndex]}`);
      return;
    }

    // Проверяем соседство (вверх, вниз, влево, вправо)
    if (myPos !== -1) {
      const fromX = myPos % 3;
      const fromY = Math.floor(myPos / 3);
      const toX = targetCellIndex % 3;
      const toY = Math.floor(targetCellIndex / 3);
      const dist = Math.abs(fromX - toX) + Math.abs(fromY - toY);
      if (dist !== 1) {
        setStatusText('Ход возможен только в соседнюю клетку (ортогонально)');
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
        {/* Хедер */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
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
            fontSize: '0.72rem',
            color: '#94a3b8'
          }}>
            Monad Testnet &bull; Игрок #{playerId || 1} ({TEST_ACCOUNT.address.slice(0, 6)}...{TEST_ACCOUNT.address.slice(-4)})
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
            gridTemplateColumns: 'repeat(3, 85px)',
            gridTemplateRows: 'repeat(3, 85px)',
            gap: '8px',
            backgroundColor: '#12141f',
            padding: '10px',
            border: '2px solid #334155'
          }}>
            {grid.map((cellValue, idx) => {
              const isPlayer = cellValue > 0;
              const isMe = cellValue === (playerId || 1);

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={loading}
                  style={{
                    boxSizing: 'border-box',
                    width: '85px',
                    height: '85px',
                    backgroundColor: isPlayer
                      ? (isMe ? '#7c3aed' : '#ec4899')
                      : '#1e2235',
                    border: isPlayer ? '2px solid #c084fc' : '1px dashed #475569',
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
                    boxShadow: isPlayer ? '0 0 16px rgba(139, 92, 246, 0.7)' : 'none'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    left: '6px',
                    fontSize: '0.65rem',
                    color: isPlayer ? '#ddd6fe' : '#64748b'
                  }}>
                    #{idx}
                  </span>

                  {isPlayer ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1 }}>
                        {cellValue}
                      </span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#f5d0fe' }}>
                        {isMe ? 'ВЫ' : `P#${cellValue}`}
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

        {/* Футер */}
        <div style={{
          fontSize: '0.75rem',
          color: '#64748b',
          letterSpacing: '0.05em',
          textAlign: 'center'
        }}>
          Кликайте на соседнюю свободную клетку для хода
        </div>
      </div>
    </div>
  );
}

export default App;
