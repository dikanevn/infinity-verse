import { useState, useEffect } from 'react';
import { createPublicClient, http, parseAbi, defineChain, keccak256, encodePacked } from 'viem';

// Контракт InfinityVerse V_0.0.0.0.5 (Direct X,Y Coordinate Grid 5x5)
const CONTRACT_ADDRESS = '0xb16b78e9075ef1c36a0bec220812a488687a225b';
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

// === НАСТРОЙКА ВРЕМЕНИ ЗАДЕРЖКИ (В МИЛЛИСЕКУНДАХ) ===
// Если запрос к блокчейну длится дольше этого времени, загорается ошибка связи со Вселенной:
const UNIVERSE_LATENCY_THRESHOLD_MS = 3000; // 3 секунды (меняй это значение для тестов!)
const SYNC_INTERVAL_MS = 6000; // Частота опроса блокчейна (6 секунд)

function App() {
  const [cells, setCells] = useState<CellData[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [statusText, setStatusText] = useState<string>('Настройка связи со Вселенной...');
  const [statusState, setStatusState] = useState<'connected' | 'slow' | 'error' | 'connecting'>('connecting');
  const [contractVersion, setContractVersion] = useState<string>('0.0.0.0.5');
  const CLIENT_VERSION = '0.0.0.0.11';

  const fetchState = async () => {
    const startTime = Date.now();
    // Таймер задержки: если за 3 секунды ответ не пришёл — сигнализируем о задержке связи
    const slowTimer = setTimeout(() => {
      setStatusState('slow');
      setStatusText('⚠️ Задержка отклика: слабый сигнал сквозь ткань Вселенной (>3с)...');
    }, UNIVERSE_LATENCY_THRESHOLD_MS);

    try {
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

      clearTimeout(slowTimer);
      const durationMs = Date.now() - startTime;

      setContractVersion(ver);

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
      setStatusState('connected');
      setStatusText(`✨ Связь со Вселенной стабильна (${durationMs}мс)`);
    } catch (err: any) {
      clearTimeout(slowTimer);
      console.error(err);
      setStatusState('error');
      setStatusText('🚨 Ошибка связи со Вселенной: сигнал потерян');
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, SYNC_INTERVAL_MS);
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
            СЕТКА 5х5: ОТ (-2, -2) ДО (+2, +2) &bull; 25 КЛЕТОК (8 БАЙТ КАЖДАЯ)
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

                  {/* Центр клетки: Обелиск */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    fontSize: '1.75rem',
                    lineHeight: 1
                  }}>
                    {cell?.object ? oInfo.icon : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Статус связи со Вселенной */}
          <div style={{
            minHeight: '22px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: statusState === 'error' || statusState === 'slow'
              ? '#ef4444' // Красный цвет ошибки/задержки
              : statusState === 'connected'
                ? '#4ade80' // Зеленый цвет стабильной связи
                : '#38bdf8', // Синий цвет инициализации
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
    </div>
  );
}

export default App;
