import React from 'react';
import type { CellData, PlayerData } from '../../types';
import { TERRAIN_CONFIG, OBJECT_CONFIG } from '../../config/constants';
import { getSandTextureForCoord } from '../../config/sandTextures';

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
  // Если клетки вообще нет в кеше (за пределами 5х5 вокруг игрока) — это неизведанный туман войны
  const isFog = !cell;

  const tInfo = cell ? (TERRAIN_CONFIG[cell.terrain] || { name: `T:${cell.terrain}`, icon: '', bg: '#14291e' }) : TERRAIN_CONFIG[0];
  const oInfo = cell ? (OBJECT_CONFIG[cell.object] || { name: `O:${cell.object}`, icon: '' }) : OBJECT_CONFIG[0];

  // Если это песок (terrain === 1), берем уникальную процедурную текстуру по координатам (x, y)
  const isSand = !isFog && cell.terrain === 1;
  const sandBgPattern = isSand ? getSandTextureForCoord(coord.x, coord.y) : undefined;

  return (
    <button
      onClick={() => onSelect(coord)}
      style={{
        boxSizing: 'border-box',
        width: '62px',
        height: '62px',
        background: isFog 
          ? 'radial-gradient(circle, #0b0f19 20%, #030508 100%)' 
          : (sandBgPattern ? `url("${sandBgPattern}") no-repeat center/cover` : tInfo.bg),
        border: isSelected ? '2px solid #38bdf8' : (isFog ? '1px dashed #1e293b' : '1px solid #334155'),
        opacity: isFog ? 0.45 : 1,
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
          color: isSelected ? '#38bdf8' : (isFog ? '#475569' : '#cbd5e1'),
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
          <span style={{ fontSize: '0.52rem', color: isFog ? '#64748b' : '#fef08a', fontWeight: 700 }}>
            {isFog ? '🌫️ Туман' : tInfo.name}
          </span>
          <span style={{
            fontSize: '0.48rem',
            color: (!isFog && cell?.object) ? '#67e8f9' : '#64748b',
            fontWeight: (!isFog && cell?.object) ? 700 : 500
          }}>
            {(!isFog && cell?.object) ? oInfo.name : '—'}
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
          (!isFog && cell?.object) ? oInfo.icon : (isFog ? '☁️' : '')
        )}
      </div>
    </button>
  );
};
