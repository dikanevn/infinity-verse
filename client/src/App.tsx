import { useState, useEffect, useRef } from 'react';
import { createPublicClient, createWalletClient, http, parseAbi, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const CONTRACT_ADDRESS = '0xfbe47b73c115a5f07b72102c9ec31e2cb4739a36';
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

// Временный встроенный кошелек деплоера для мгновенных тестов без MetaMask
const TEST_ACCOUNT = privateKeyToAccount('0x8b397357e09a218b105672b81af7ea2ba6f5dff60353c5f76abcad691b6000a0');

const COUNTER_ABI = parseAbi([
  'function count() view returns (uint256)',
  'function increment() external',
  'event Increment(address indexed caller, uint256 newCount)'
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
  const [count, setCount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastTxDuration, setLastTxDuration] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const fetchCount = async () => {
    try {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: COUNTER_ABI,
        functionName: 'count'
      });
      setCount(data.toString());
    } catch (e: any) {
      console.error('Fetch count error:', e);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  const handleIncrement = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setStatusText('Отправка транзакции в Monad Testnet...');
      setElapsedSeconds(0);
      const startTime = performance.now();

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Number(((performance.now() - startTime) / 1000).toFixed(1)));
      }, 100);

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: COUNTER_ABI,
        functionName: 'increment'
      });

      setStatusText('Ждём блок: ' + hash.slice(0, 10) + '...');
      await publicClient.waitForTransactionReceipt({ hash });

      const duration = Number(((performance.now() - startTime) / 1000).toFixed(2));
      setLastTxDuration(duration);
      setStatusText('Подтверждено за ' + duration + 'с!');
      await fetchCount();
    } catch (err: any) {
      console.error(err);
      setStatusText(err.shortMessage || err.message || 'Ошибка выполнения');
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
        padding: '24px 16px 16px 16px',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui, sans-serif',
        userSelect: 'none',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '0.85rem',
            color: '#a78bfa',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textAlign: 'center'
          }}>
            Monad Testnet &bull; Direct On-Chain
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: '#64748b'
          }}>
            аккаунт: {TEST_ACCOUNT.address.slice(0, 6)}...{TEST_ACCOUNT.address.slice(-4)}
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          margin: 'auto 0'
        }}>
          <div style={{
            fontSize: '1rem',
            color: '#94a3b8',
            letterSpacing: '0.05em'
          }}>
            Счётчик в блокчейне:
          </div>

          <div style={{
            fontSize: '5.5rem',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
            textShadow: '0 0 24px rgba(139, 92, 246, 0.6)'
          }}>
            {count !== null ? count : '...'}
          </div>

          <button
            onClick={handleIncrement}
            disabled={loading}
            style={{
              padding: '14px 28px',
              fontSize: '1.1rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              color: '#ffffff',
              backgroundColor: loading ? '#4c1d95' : '#7c3aed',
              border: '2px solid #a78bfa',
              borderRadius: '0px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 0 15px rgba(124, 58, 237, 0.5)',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block' }}>⏳</span>
                <span>Ждём блок: {elapsedSeconds}s</span>
              </>
            ) : (
              <span>+1 DIRECT INCREMENT</span>
            )}
          </button>

          {statusText && (
            <div style={{
              fontSize: '0.85rem',
              color: loading ? '#38bdf8' : '#4ade80',
              textAlign: 'center',
              maxWidth: '300px'
            }}>
              {statusText}
            </div>
          )}

          {lastTxDuration !== null && !loading && (
            <div style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '6px 12px',
              border: '1px solid #334155'
            }}>
              Последняя реакция: <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{lastTxDuration}с</span>
            </div>
          )}
        </div>

        <div style={{
          fontSize: '0.8rem',
          color: '#64748b',
          letterSpacing: '0.05em',
        }}>
          версия monad-testnet-0.1
        </div>
      </div>
    </div>
  );
}

export default App;
