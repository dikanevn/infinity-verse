import { useState, useEffect, useRef } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';

const CONTRACT_ADDRESS = '0xfbe47b73c115a5f07b72102c9ec31e2cb4739a36';
const RPC_URL = 'https://base-sepolia.drpc.org';

const COUNTER_ABI = parseAbi([
  'function count() view returns (uint256)',
  'function increment() external',
  'event Increment(address indexed caller, uint256 newCount)'
]);

const publicClient = createPublicClient({
  chain: baseSepolia,
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
    const eth = (window as any).ethereum;
    if (!eth) {
      alert('MetaMask не обнаружен в браузере!');
      return;
    }

    try {
      setLoading(true);
      setStatusText('Ожидание подписи в MetaMask...');
      setElapsedSeconds(0);
      const startTime = performance.now();

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Number(((performance.now() - startTime) / 1000).toFixed(1)));
      }, 100);

      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(eth)
      });

      const [address] = await walletClient.requestAddresses();

      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }]
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x14a34',
              chainName: 'Base Sepolia Testnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ['https://sepolia.basescan.org']
            }]
          });
        }
      }

      setStatusText('Отправка транзакции в сеть...');
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: COUNTER_ABI,
        functionName: 'increment',
        account: address
      });

      setStatusText('Ожидание включения в блок...');
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
          fontSize: '0.85rem',
          color: '#a78bfa',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          textAlign: 'center'
        }}>
          Base Sepolia &bull; On-Chain Counter
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
              <span>+1 INCREMENT</span>
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
          версия 20261024644-3
        </div>
      </div>
    </div>
  );
}

export default App;
