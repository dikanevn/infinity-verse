import { useState, useEffect } from 'react';
import { createPublicClient, http, parseAbi, defineChain, keccak256, encodePacked } from 'viem';

// Контракт InfinityVerse V_0.0.0.0.5 (Direct X,Y Coordinate Grid)
const CONTRACT_ADDRESS = '0xfc124a1962b0d2c3493f1aa9d5ddeb6f6fdab01e';
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
  'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint16 paramA, uint16 paramB)[])'
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
  0: { name: 'Пустота', icon: '🌌', bg: '#0d1117' },
  1: { name: 'Песок', icon: '🏜️', bg: '#2b2311' },
  2: { name: 'Вода', icon: '🌊', bg: '#0f2744' },
  3: { name: 'Скала', icon: '⛰️', bg: '#272b38' },
};

const OBJECT_CONFIG: Record<number, { name: string; icon: string }> = {
  0: { name: 'Пусто', icon: '' },
  1: { name: 'Обелиск', icon: '🗿' },
  2: { name: 'Камень', icon: '🪨' },
  9: { name: 'Древний Обелиск', icon: '🏛️' },
};

// Сетка от -1 до +1
const INITIAL_COORDS = [
  { x: -1, y:  1 }, { x: 0, y:  1 }, { x: 1, y:  1 },
  { x: -1, y:  0 }, { x: 0, y:  0 }, { x: 1, y:  0 },
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }
];

function App() {
  const [cells, setCells] = useState<CellData[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string>('Подключение к Monad Testnet...');
  const [contractVersion, setContractVersion] = useState<string>('0.0.0.0.5');
  const CLIENT_VERSION = '0.0.0.0.11';

  const fetchState = async () => {
    try {
      setLoading(true);
      const xs = INITIAL_COORDS.map(c => c.x);
      const ys = INITIAL_COORDS.map(c => c.y);

      const [ver, onchainCells] = await Promise.all([
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
      ]);

      setContractVersion(ver);

      const parsed: CellData[] = INITIAL_COORDS.map((coord, i) => {
        const c = onchainCells[i];
        // Локальное вычисление keccak256 для наглядности маппинга
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
      setStatusText('Синхронизировано со смарт-контрактом');
    } catch (err: any) {
      console.error(err);
      setStatusText('Ошибка RPC соединения');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 6000);
    return () => clearInterval(interval);
  }, []);

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
        borderRadius: '8px',
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
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{
            fontSize: '0.95rem',
            color: '#c084fc',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 800
          }}>
            INFINITY-VERSE &bull; КЛЕТОЧНЫЙ МАППИНГ (X, Y)
          </div>
          <div style={{
            fontSize: '0.70rem',
            color: '#38bdf8',
            letterSpacing: '0.06em',
            fontWeight: 600
          }}>
            СЕТКА: ОТ (-1, -1) ДО (+1, +1) &bull; 8 БАЙТ НА КЛЕТКУ
          </div>
        </div>

        {/* Интерактивная Сетка 3х3 по координатам */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          margin: '10px 0'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 90px)',
            gridTemplateRows: 'repeat(3, 90px)',
            gap: '8px',
            backgroundColor: '#10131d',
            padding: '8px',
            border: '2px solid #2e384d',
            borderRadius: '6px'
          }}>
            {INITIAL_COORDS.map((coord) => {
              const cell = cells.find(c => c.x === coord.x && c.y === coord.y);
              const isSelected = selectedCoord.x === coord.x && selectedCoord.y === coord.y;
              const tInfo = cell ? (TERRAIN_CONFIG[cell.terrain] || { name: 'Земля', icon: '🌱', bg: '#14291e' }) : TERRAIN_CONFIG[0];
              const oInfo = cell ? (OBJECT_CONFIG[cell.object] || { name: '', icon: '' }) : OBJECT_CONFIG[0];

              return (
                <button
                  key={`${coord.x},${coord.y}`}
                  onClick={() => setSelectedCoord({ x: coord.x, y: coord.y })}
                  style={{
                    boxSizing: 'border-box',
                    width: '90px',
                    height: '90px',
                    backgroundColor: tInfo.bg,
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    fontFamily: 'inherit',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.7)' : 'none'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: '5px',
                    fontSize: '0.62rem',
                    color: isSelected ? '#38bdf8' : '#64748b',
                    fontWeight: isSelected ? 800 : 600
                  }}>
                    ({coord.x},{coord.y})
                  </span>

                  <span style={{ fontSize: '1.45rem', marginTop: '4px' }}>
                    {cell?.object ? oInfo.icon : tInfo.icon}
                  </span>

                  <span style={{
                    fontSize: '0.58rem',
                    color: '#94a3b8',
                    marginTop: '2px'
                  }}>
                    {cell?.object ? oInfo.name : tInfo.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Инспектор клетки: детальный разбор маппинга и параметров */}
          {curCell ? (
            <div style={{
              width: '320px',
              maxWidth: '92vw',
              backgroundColor: '#0d111a',
              border: '1px solid #38bdf8',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.72rem'
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
                <span style={{ color: '#a78bfa' }}>8 БАЙТ</span>
              </div>

              {/* Ончейн-представление координат X и Y (int32 / two's complement) */}
              {(() => {
                const toUint32 = (n: number) => (n >>> 0);
                const xU32 = toUint32(curCell.x);
                const yU32 = toUint32(curCell.y);
                const xHex = '0x' + xU32.toString(16).padStart(8, '0');
                const yHex = '0x' + yU32.toString(16).padStart(8, '0');
                const xBin = xU32.toString(2).padStart(32, '0');
                const yBin = yU32.toString(2).padStart(32, '0');
                const packedHex = '0x' + xU32.toString(16).padStart(8, '0') + yU32.toString(16).padStart(8, '0');

                return (
                  <div style={{
                    backgroundColor: '#0a0d14',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.66rem' }}>
                        КООРДИНАТЫ В EVM (int32, Two's Complement):
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.60rem' }}>4 байта каждый</span>
                    </div>

                    {/* Разбор X */}
                    <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: curCell.x < 0 ? '#f43f5e' : '#4ade80' }}>
                          X = {curCell.x} {curCell.x < 0 ? '(минус)' : ''}:
                        </span>
                        <span>
                          HEX: <b style={{ color: curCell.x < 0 ? '#f43f5e' : '#38bdf8' }}>{xHex}</b>
                        </span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.58rem', wordBreak: 'break-all' }}>
                        BIN: {xBin.slice(0, 8)} {xBin.slice(8, 16)} {xBin.slice(16, 24)} {xBin.slice(24, 32)}
                      </div>
                    </div>

                    {/* Разбор Y */}
                    <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: curCell.y < 0 ? '#f43f5e' : '#4ade80' }}>
                          Y = {curCell.y} {curCell.y < 0 ? '(минус)' : ''}:
                        </span>
                        <span>
                          HEX: <b style={{ color: curCell.y < 0 ? '#f43f5e' : '#38bdf8' }}>{yHex}</b>
                        </span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.58rem', wordBreak: 'break-all' }}>
                        BIN: {yBin.slice(0, 8)} {yBin.slice(8, 16)} {yBin.slice(16, 24)} {yBin.slice(24, 32)}
                      </div>
                    </div>

                    {/* Упаковка abi.encodePacked(x, y) */}
                    <div style={{
                      marginTop: '2px',
                      paddingTop: '3px',
                      borderTop: '1px dashed #1e293b',
                      fontSize: '0.60rem',
                      fontFamily: 'monospace',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px'
                    }}>
                      <span style={{ color: '#fbbf24' }}>abi.encodePacked(x, y) [8 байт]:</span>
                      <span style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>
                        0x<span style={{ color: curCell.x < 0 ? '#f43f5e' : '#38bdf8' }}>{xHex.slice(2)}</span>
                        <span style={{ color: curCell.y < 0 ? '#f43f5e' : '#a78bfa' }}>{yHex.slice(2)}</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Разбор ключа в Mapping */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#131826', padding: '6px', borderRadius: '4px' }}>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>Ключ в Mapping: keccak256(abi.encodePacked(x, y))</span>
                <span style={{ color: '#94a3b8', fontSize: '0.65rem', wordBreak: 'break-all' }}>
                  {curCell.key}
                </span>
              </div>

              {/* 8-байтовая структура клетки */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '2px' }}>
                <div style={{ backgroundColor: '#131826', padding: '5px 8px', borderRadius: '4px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.64rem' }}>terrain (uint8)</div>
                  <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.terrain} — {terrainInfo?.name}</div>
                </div>

                <div style={{ backgroundColor: '#131826', padding: '5px 8px', borderRadius: '4px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.64rem' }}>object (uint8)</div>
                  <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.object} — {objectInfo?.name || 'Пусто'}</div>
                </div>

                <div style={{ backgroundColor: '#131826', padding: '5px 8px', borderRadius: '4px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.64rem' }}>state (uint8)</div>
                  <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.state}%</div>
                </div>

                <div style={{ backgroundColor: '#131826', padding: '5px 8px', borderRadius: '4px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.64rem' }}>reserved (uint8)</div>
                  <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.reserved} (запас)</div>
                </div>

                <div style={{ backgroundColor: '#131826', padding: '5px 8px', borderRadius: '4px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.64rem' }}>paramA (uint16)</div>
                  <div style={{ color: '#38bdf8', fontWeight: 700 }}>{curCell.paramA}</div>
                </div>

                <div style={{ backgroundColor: '#131826', padding: '5px 8px', borderRadius: '4px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.64rem' }}>paramB (uint16)</div>
                  <div style={{ color: '#38bdf8', fontWeight: 700 }}>{curCell.paramB}</div>
                </div>
              </div>

              {/* Детальное шестнадцатеричное (HEX) и битовое (BIN) представление */}
              <div style={{
                backgroundColor: '#0a0d14',
                border: '1px solid #1e293b',
                borderRadius: '4px',
                padding: '8px',
                marginTop: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.68rem' }}>ХРАНИЛИЩЕ: 8 БАЙТ (64 БИТА)</span>
                  <span style={{ color: '#a78bfa', fontSize: '0.65rem' }}>EVM Little-Endian Slot</span>
                </div>

                {/* HEX строка 8 байт */}
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  backgroundColor: '#111827',
                  padding: '4px 6px',
                  borderRadius: '3px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  letterSpacing: '0.04em'
                }}>
                  <span style={{ color: '#94a3b8' }}>HEX:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                    <span style={{ color: '#38bdf8' }}>0x</span>
                    <span title="terrain (1 байт)" style={{ color: '#4ade80' }}>{curCell.terrain.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="object (1 байт)" style={{ color: '#facc15' }}>{curCell.object.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="state (1 байт)" style={{ color: '#fb923c' }}>{curCell.state.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="reserved (1 байт)" style={{ color: '#94a3b8' }}>{curCell.reserved.toString(16).padStart(2, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="paramA (2 байта)" style={{ color: '#c084fc' }}>{curCell.paramA.toString(16).padStart(4, '0')}</span>
                    <span style={{ color: '#475569' }}>_</span>
                    <span title="paramB (2 байта)" style={{ color: '#f472b6' }}>{curCell.paramB.toString(16).padStart(4, '0')}</span>
                  </span>
                </div>

                {/* Побитовая раскладка каждого байта */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  fontSize: '0.61rem',
                  fontFamily: 'monospace',
                  color: '#cbd5e1'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4ade80' }}>terrain [0..7]:</span>
                    <span>0x{curCell.terrain.toString(16).padStart(2, '0')} = <b>{curCell.terrain.toString(2).padStart(8, '0')}</b></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#facc15' }}>object [8..15]:</span>
                    <span>0x{curCell.object.toString(16).padStart(2, '0')} = <b>{curCell.object.toString(2).padStart(8, '0')}</b></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fb923c' }}>state [16..23]:</span>
                    <span>0x{curCell.state.toString(16).padStart(2, '0')} = <b>{curCell.state.toString(2).padStart(8, '0')}</b></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>reserved [24..31]:</span>
                    <span>0x{curCell.reserved.toString(16).padStart(2, '0')} = <b>{curCell.reserved.toString(2).padStart(8, '0')}</b></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#c084fc' }}>paramA [32..47]:</span>
                    <span>0x{curCell.paramA.toString(16).padStart(4, '0')} = <b>{curCell.paramA.toString(2).padStart(16, '0')}</b></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#f472b6' }}>paramB [48..63]:</span>
                    <span>0x{curCell.paramB.toString(16).padStart(4, '0')} = <b>{curCell.paramB.toString(2).padStart(16, '0')}</b></span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Загрузка данных клетки...</div>
          )}

          {/* Статус RPC */}
          <div style={{
            fontSize: '0.75rem',
            color: loading ? '#38bdf8' : '#4ade80',
            textAlign: 'center'
          }}>
            {loading ? '⏳ Чтение из Monad Testnet...' : statusText}
          </div>
        </div>

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
    </div>
  );
}

export default App;
