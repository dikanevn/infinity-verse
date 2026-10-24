import React, { useState, useRef } from 'react';
import type { CellData, PlayerData } from '../../types';
import { CellView } from './CellView';

interface WorldGridProps {
  cells: CellData[];
  selectedCoord: { x: number; y: number };
  player: PlayerData | null;
  focusCoord: { x: number; y: number };
  onSelectCoord: (coord: { x: number; y: number }) => void;
  onCenterPlayer: () => void;
}

export const WorldGrid: React.FC<WorldGridProps> = ({
  cells,
  selectedCoord,
  player,
  focusCoord,
  onSelectCoord,
  onCenterPlayer
}) => {
  // Масштаб регулируется строго через кнопки + и -
  const [scale, setScale] = useState<number>(0.85);

  // Центр активного окна 5х5 (фокусная точка): по умолчанию игрок или место куда кликнули
  const centerX = focusCoord.x;
  const centerY = focusCoord.y;

  // Строго 25 интерактивных клеток (5х5) вокруг точки фокуса
  const active5x5Coords: { x: number; y: number }[] = [];
  for (let y = centerY + 2; y >= centerY - 2; y--) {
    for (let x = centerX - 2; x <= centerX + 2; x++) {
      active5x5Coords.push({ x, y });
    }
  }

  // Размер одной клетки 62px + 1px разделитель = 63px
  const CELL_PITCH = 63;

  // Смещение поля
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  // Кнопка прицела центрирует камеру прямо на игроке и возвращает фокус на него
  const handleResetToPlayer = () => {
    setPosition({ x: 0, y: 0 });
    onCenterPlayer();
  };

  // Клик по бесконечному туману (контейнеру) пересчитывает координаты и переносит 5х5 окно
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - rect.width / 2 - position.x;
    const clickY = e.clientY - rect.top - rect.height / 2 - position.y;

    // В нашей системе координат: X вправо (+), Y вверх (+)
    const clickedGridX = centerX + Math.round(clickX / (CELL_PITCH * scale));
    const clickedGridY = centerY - Math.round(clickY / (CELL_PITCH * scale));

    onSelectCoord({ x: clickedGridX, y: clickedGridY });
  };

  // Drag мышью (только перемещение, без зума)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    setPosition({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Drag пальцем
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      posStartRef.current = { ...position };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      setPosition({
        x: posStartRef.current.x + dx,
        y: posStartRef.current.y + dy
      });
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        flex: 1,
        minHeight: '340px',
        maxHeight: '420px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        /* Бесконечный процедурный космический туман с облаками и сеткой */
        backgroundColor: '#070a14',
        backgroundImage: `
          radial-gradient(circle, rgba(148, 163, 184, 0.12) 1.5px, transparent 1.5px),
          repeating-linear-gradient(0deg, transparent, transparent ${62 * scale}px, rgba(71, 85, 105, 0.35) ${62 * scale}px, rgba(71, 85, 105, 0.35) ${63 * scale}px),
          repeating-linear-gradient(90deg, transparent, transparent ${62 * scale}px, rgba(71, 85, 105, 0.35) ${62 * scale}px, rgba(71, 85, 105, 0.35) ${63 * scale}px),
          radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.6) 0%, rgba(5, 7, 10, 0.98) 100%)
        `,
        backgroundSize: `${31.5 * scale}px ${31.5 * scale}px, 100% 100%, 100% 100%, 100% 100%`,
        border: '1px solid #475569',
        borderRadius: '0px',
        boxSizing: 'border-box'
      }}
    >
      {/* Кнопки зума (+, -) и центрирования (🎯) */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(2.0, s + 0.15)); }}
          title="Приблизить"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#f8fafc',
            fontWeight: 800,
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.08, s - 0.1)); }}
          title="Отдалить"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#f8fafc',
            fontWeight: 800,
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          -
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleResetToPlayer(); }}
          title="Центрировать на игроке"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#1e293b',
            border: '1px solid #8b5cf6',
            color: '#c084fc',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          🎯
        </button>
      </div>

      {/* Интерактивный слой мира (ровно 25 клеток 5х5 вокруг фокуса, нулевой оверхед на браузер) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDraggingRef.current ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 62px)',
          gridTemplateRows: 'repeat(5, 62px)',
          gap: '1px',
          backgroundColor: '#334155',
          padding: '0px',
          border: 'none',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.9)'
        }}
      >
        {active5x5Coords.map((coord) => {
          const cell = cells.find(c => c.x === coord.x && c.y === coord.y);
          const isSelected = selectedCoord.x === coord.x && selectedCoord.y === coord.y;

          return (
            <CellView
              key={`${coord.x},${coord.y}`}
              coord={coord}
              cell={cell}
              isSelected={isSelected}
              player={player}
              onSelect={onSelectCoord}
            />
          );
        })}
      </div>
    </div>
  );
};
