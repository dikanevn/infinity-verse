import { useState, useEffect } from 'react';
import { createPublicClient, http, parseAbi, defineChain } from 'viem';

// Контракт InfinityVerse V_0_0_0_0_4 (Cell Architecture)
const CONTRACT_ADDRESS = '0x66dcd7e881078aa10b4d1e2799e5372eb03ef7ae';
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
  'function TOTAL_CELLS() view returns (uint8)',
  'function GRID_WIDTH() view returns (uint8)',
  'function getCell(uint8 cellIndex) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved))',
  'function getAllCells() view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved)[9])'
]);

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL)
});

interface CellData {
  terrain: number;
  object: number;
  state: number;
  reserved: number;
}

const TERRAIN_NAMES: Record<number, { name: string; icon: string; bg: string }> = {
  0: { name: 'Пустота', icon: '🌌', bg: '#12141f' },
  1: { name: 'Земля', icon: '🌱', bg: '#162b1e' },
  2: { name: 'Лава', icon: '🌋', bg: '#3b1212' },
  3: { name: 'Гора', icon: '⛰️', bg: '#232733' },
};

const OBJECT_NAMES: Record<number, { name: string; icon: string }> = {
  0: { name: 'Пусто', icon: '' },
  1: { name: 'Звезда', icon: '⭐' },
  2: { name: 'Сундук', icon: '📦' },
  3: { name: 'Моб', icon: '👾' },
};

function App() {
  const [cells, setCells] = useState<CellData[]>(
    Array(9).fill({ terrain: 0, object: 0, state: 0, reserved: 0 })
  );
  const [selectedCell, setSelectedCell] = useState<number | null>(4);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string>('Сетка подключена');
  const [contractVersion, setContractVersion] = useState<string>('...');
  const CLIENT_VERSION = '0.0.0.0.4';

  const fetchState = async () => {
    try {
      setLoading(true);
      const [ver, onchainCells] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'VERSION',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'getAllCells',
        }),
      ]);

      setContractVersion(ver);
      setCells(
        onchainCells.map((c: any) => ({
          terrain: Number(c.terrain),
          object: Number(c.object),
          state: Number(c.state),
          reserved: Number(c.reserved),
        }))
      );
      setStatusText('Стейт клеток синхронизирован');
    } catch (err: any) {
      console.error(err);
      setStatusText('Ошибка RPC соединения');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  const curCell = selectedCell !== null ? cells[selectedCell] : null;
  const curTerrain = curCell
    ? (TERRAIN_NAMES[curCell.terrain] || { name: 'Тип #' + curCell.terrain, icon: '🗺️', bg: '#1a1d2e' })
    : null;
  const curObject = curCell
    ? (OBJECT_NAMES[curCell.object] || { name: 'Объект #' + curCell.object, icon: '✨' })
    : null;

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
          gap: '6px'
        }}>
          <div style={{
            fontSize: '0.95rem',
            color: '#a78bfa',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 800
          }}>
            INFINITY-VERSE &bull; CELL ARCHITECTURE
          </div>
          <div style={{
            fontSize: '0.72rem',
            color: '#38bdf8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600
          }}>
            MONAD TESTNET &bull; 4 BYTES PER CELL
          </div>
        </div>

        {/* Сетка 3x3 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
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
            {cells.map((cell, idx) => {
              const terrainInfo = TERRAIN_NAMES[cell.terrain] || { name: 'Terra', icon: '🗺️', bg: '#1a1d2e' };
              const objInfo = OBJECT_NAMES[cell.object] || { name: 'Obj', icon: '✨' };
              const isSelected = selectedCell === idx;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedCell(idx)}
                  style={{
                    boxSizing: 'border-box',
                    width: '90px',
                    height: '90px',
                    backgroundColor: terrainInfo.bg,
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                    borderRadius: '0px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    fontFamily: 'inherit',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.6)' : 'none'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    left: '6px',
                    fontSize: '0.62rem',
                    color: isSelected ? '#38bdf8' : '#64748b',
                    fontWeight: isSelected ? 800 : 400
                  }}>
                    #{idx}
                  </span>

                  <span style={{ fontSize: '1.4rem' }}>
                    {cell.object !== 0 ? objInfo.icon : terrainInfo.icon}
                  </span>

                  <span style={{
                    fontSize: '0.58rem',
                    color: '#94a3b8',
                    marginTop: '4px'
                  }}>
                    {cell.object !== 0 ? objInfo.name : terrainInfo.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Инспектор выбранной клетки */}
          {curCell && selectedCell !== null && (
            <div style={{
              width: '280px',
              backgroundColor: '#12141f',
              border: '1px solid #38bdf8',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '0.72rem'
            }}>
              <div style={{ color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>
                Инспектор Клетки #{selectedCell}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Ландшафт (terrain):</span>
                <span style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.terrain} ({curTerrain?.name})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Объект (object):</span>
                <span style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.object} ({curObject?.name})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Состояние (state):</span>
                <span style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.state}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Резерв (reserved):</span>
                <span style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.reserved}</span>
              </div>
            </div>
          )}

          {/* Статус */}
          <div style={{
            fontSize: '0.78rem',
            color: loading ? '#38bdf8' : '#4ade80',
            textAlign: 'center',
            maxWidth: '300px'
          }}>
            {loading ? '⏳ Чтение из Monad...' : statusText}
          </div>
        </div>

        {/* Футер */}
        <div style={{
          fontSize: '0.75rem',
          color: '#64748b',
          letterSpacing: '0.05em',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}>
          <div>Контракт: <span style={{ color: '#a78bfa', fontWeight: 700 }}>v{contractVersion}</span> ({CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)})</div>
          <div>Фронтенд: <span style={{ color: '#38bdf8', fontWeight: 700 }}>v{CLIENT_VERSION}</span></div>
        </div>
      </div>
    </div>
  );
}

export default App;
