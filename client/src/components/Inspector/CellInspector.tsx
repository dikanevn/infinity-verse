import React from 'react';
import type { CellData } from '../../types';

interface CellInspectorProps {
  curCell: CellData | null;
}

export const CellInspector: React.FC<CellInspectorProps> = ({ curCell }) => {
  if (!curCell) {
    return (
      <div style={{ color: '#94a3b8', fontSize: '0.72rem', textAlign: 'center' }}>
        Загрузка данных клетки...
      </div>
    );
  }

  const toUint32 = (n: number) => (n >>> 0);
  const xU32 = toUint32(curCell.x);
  const yU32 = toUint32(curCell.y);
  const xHex = '0x' + xU32.toString(16).padStart(8, '0');
  const yHex = '0x' + yU32.toString(16).padStart(8, '0');
  const xBin = xU32.toString(2).padStart(32, '0');
  const yBin = yU32.toString(2).padStart(32, '0');

  return (
    <div style={{
      width: '100%',
      maxWidth: '680px',
      backgroundColor: '#0d111a',
      border: '1px solid #38bdf8',
      borderRadius: '0px',
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontSize: '0.72rem',
      margin: '0 auto 8px auto',
      boxSizing: 'border-box',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{
        minWidth: '320px',
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '8px',
        minWidth: '320px'
      }}>

        {/* Колонка 1: Координаты в EVM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.62rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '2px'
            }}>
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

            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.62rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '2px'
            }}>
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
        </div>

        {/* Колонка 2: Структура Cell (8 байт) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            textAlign: 'center'
          }}>
            <div style={{ backgroundColor: '#131826', padding: '4px 6px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>terrain</div>
              <div style={{ color: '#4ade80', fontWeight: 700 }}>{curCell.terrain}</div>
            </div>
            <div style={{ backgroundColor: '#131826', padding: '4px 6px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>object</div>
              <div style={{ color: '#facc15', fontWeight: 700 }}>{curCell.object}</div>
            </div>
            <div style={{ backgroundColor: '#131826', padding: '4px 6px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>state</div>
              <div style={{ color: '#fb923c', fontWeight: 700 }}>{curCell.state}</div>
            </div>
            <div style={{ backgroundColor: '#131826', padding: '4px 6px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.60rem' }}>reserved</div>
              <div style={{ color: '#f8fafc', fontWeight: 700 }}>{curCell.reserved}</div>
            </div>
          </div>

          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            backgroundColor: '#0a0d14',
            border: '1px solid #1e293b',
            padding: '5px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch'
          }}>

            <span style={{ color: '#94a3b8' }}>8B HEX:</span>
            <span style={{ color: '#f8fafc', fontWeight: 700 }}>
              <span style={{ color: '#38bdf8' }}>0x</span>
              <span style={{ color: '#4ade80' }}>{curCell.terrain.toString(16).padStart(2, '0')}</span>_
              <span style={{ color: '#facc15' }}>{curCell.object.toString(16).padStart(2, '0')}</span>_
              <span style={{ color: '#fb923c' }}>{curCell.state.toString(16).padStart(2, '0')}</span>_
              <span style={{ color: '#94a3b8' }}>{curCell.reserved.toString(16).padStart(2, '0')}</span>_
              <span style={{ color: '#c084fc' }}>{curCell.paramA.toString(16).padStart(4, '0')}</span>_
              <span style={{ color: '#f472b6' }}>{curCell.paramB.toString(16).padStart(4, '0')}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
