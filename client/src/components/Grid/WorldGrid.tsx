import React, { useState, useRef, useEffect } from 'react';
import type { CellData, PlayerData } from '../../types';
import { INITIAL_COORDS } from '../../config/constants';
import { CellView } from './CellView';

interface WorldGridProps {
  cells: CellData[];
  selectedCoord: { x: number; y: number };
  player: PlayerData | null;
  onSelectCoord: (coord: { x: number; y: number }) => void;
}

export const WorldGrid: React.FC<WorldGridProps> = ({
  cells,
  selectedCoord,
  player,
  onSelectCoord
}) => {
  // Масштаб регулируется строго через кнопки + и -
  const [scale, setScale] = useState<number>(0.85);

  // Смещение поля
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Размер одной клетки 62px + 4px отступ = 66px
  const CELL_PITCH = 66;

  // Автоматически удерживаем игрока строго по центру экрана при спавне или ходах
  useEffect(() => {
    if (player?.exists) {
      // Игрок на (player.x, player.y). Центр мира (0,0) в центре грида.
      // Чтобы клетка игрока была по центру экрана, смещаем контейнер на (-player.x, player.y) * CELL_PITCH * scale
      setPosition({
        x: -player.x * CELL_PITCH * scale,
        y: player.y * CELL_PITCH * scale
      });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  }, [player?.x, player?.y, player?.exists, scale]);

  // Кнопка прицела центрирует камеру прямо на игроке
  const centerOnPlayer = () => {
    if (player?.exists) {
      setPosition({
        x: -player.x * CELL_PITCH * scale,
        y: player.y * CELL_PITCH * scale
      });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Drag мышью (только перемещение, без зума)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Drag пальцем (только перемещение одним пальцем, жест масштабирования отключен)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      posStartRef.current = { ...position };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
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
        backgroundColor: '#05070a',
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
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(1.8, s + 0.15)); }}
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
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.4, s - 0.15)); }}
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
          onClick={(e) => { e.stopPropagation(); centerOnPlayer(); }}
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

      {/* Интерактивный слой 7х7 */}
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDraggingRef.current ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 62px)',
          gridTemplateRows: 'repeat(7, 62px)',
          gap: '4px',
          backgroundColor: '#10131d',
          padding: '6px',
          border: '3px solid #334155',
          boxShadow: '0 0 35px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        {INITIAL_COORDS.map((coord) => {
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
