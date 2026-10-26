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
  onQuickMove?: (coord: { x: number; y: number }) => void;
}

export const CellView: React.FC<CellViewProps> = ({
  coord,
  cell,
  isSelected,
  player,
  onSelect,
  onQuickMove
}) => {
  // Туман войны — только если клетка вообще не прочитана из блокчейна (!cell)
  const isFog = !cell;

  const tInfo = cell ? (TERRAIN_CONFIG[cell.terrain] || { name: `T:${cell.terrain}`, icon: '', bg: '#14291e' }) : TERRAIN_CONFIG[0];
  const oInfo = cell ? (OBJECT_CONFIG[cell.object] || { name: `O:${cell.object}`, icon: '' }) : OBJECT_CONFIG[0];

  // Если это песок (terrain === 1), берем уникальную процедурную текстуру по координатам (x, y)
  const isSand = !isFog && cell.terrain === 1;
  const sandBgPattern = isSand ? getSandTextureForCoord(coord.x, coord.y) : undefined;

  // Если прочитано из блокчейна и terrain === 0 — это Квантовый Хаос
  const isChaos = !isFog && cell.terrain === 0;

  // Проверка: является ли клетка соседней для игрока (1 клетка по горизонтали, вертикали или диагонали)
  const isAdjacent = !!player?.exists && (() => {
    const dx = Math.abs(coord.x - player.x);
    const dy = Math.abs(coord.y - player.y);
    return (dx <= 1 && dy <= 1) && (dx + dy > 0);
  })();

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdjacent && onQuickMove) {
      onQuickMove(coord);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdjacent && onQuickMove) {
      onQuickMove(coord);
    } else {
      onSelect(coord);
    }
  };

  return (
    <button
      onClick={() => onSelect(coord)}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{
        boxSizing: 'border-box',
        width: '62px',
        height: '62px',
        background: isFog 
          ? 'radial-gradient(circle at 50% 50%, #475569 0%, #334155 45%, #1e293b 80%, #0f172a 100%)' 
          : (sandBgPattern ? `url("${sandBgPattern}") no-repeat center/cover` : (isChaos ? '#06080f' : tInfo.bg)),
        border: isSelected ? '2px solid #38bdf8' : isFog ? '1px dashed rgba(148, 163, 184, 0.25)' : 'none',
        opacity: isFog ? 0.88 : 1,
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
        boxShadow: isSelected 
          ? '0 0 14px rgba(56, 189, 248, 0.7)' 
          : isFog 
          ? 'inset 0 0 16px rgba(15, 23, 42, 0.9), 0 0 8px rgba(100, 116, 139, 0.2)' 
          : 'none',
        overflow: 'hidden'
      }}
    >
      {/* Слой пелены плотного полупрозрачного тумана над неизведанной клеткой */}
      {isFog && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(203, 213, 225, 0.22) 0%, rgba(100, 116, 139, 0.35) 60%, rgba(30, 41, 59, 0.8) 100%)',
            backdropFilter: 'blur(3px)',
            mixBlendMode: 'screen'
          }}
        />
      )}


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
          <span style={{ fontSize: '0.52rem', color: isFog ? '#64748b' : (isChaos ? '#a78bfa' : '#fef08a'), fontWeight: 700 }}>
            {isFog ? '🌫️ Туман' : (isChaos ? '🌀 Хаос' : tInfo.name)}
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
        {(!isFog && cell?.object) ? oInfo.icon : (isFog ? '☁️' : '')}
      </div>
    </button>
  );
};
