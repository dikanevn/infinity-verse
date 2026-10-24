import React from 'react';
import type { CellData, PlayerData } from '../../types';
import { TERRAIN_CONFIG, OBJECT_CONFIG } from '../../config/constants';

interface CellViewProps {
  coord: { x: number; y: number };
  cell?: CellData;
  isSelected: boolean;
  player: PlayerData | null;
  onSelect: (coord: { x: number; y: number }) => void;
}

export const CellView: React.FC<CellViewProps> = ({
  coord,
  cell,
  isSelected,
  player,
  onSelect
}) => {
  const tInfo = cell ? (TERRAIN_CONFIG[cell.terrain] || { name: `T:${cell.terrain}`, icon: '', bg: '#14291e' }) : TERRAIN_CONFIG[0];
  const oInfo = cell ? (OBJECT_CONFIG[cell.object] || { name: `O:${cell.object}`, icon: '' }) : OBJECT_CONFIG[0];

  return (
    <button
      onClick={() => onSelect(coord)}
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
      {/* Верхняя строка: Координаты и Названия */}
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

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          textAlign: 'right'
        }}>
          <span style={{ fontSize: '0.52rem', color: '#fef08a', fontWeight: 700 }}>
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
};
