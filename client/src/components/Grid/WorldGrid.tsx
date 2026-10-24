import React, { useState, useRef } from 'react';
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
  // Состояние камеры: масштаб (scale) и смещение (translateX, translateY)
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDistRef = useRef<number | null>(null);

  // Центрирование камеры на персонаже или на центре мира
  const centerCamera = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 1. Зум колесиком мыши
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prev) => Math.min(2.5, Math.max(0.6, prev * zoomFactor)));
  };

  // 2. Drag мышью
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // только левая кнопка
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

  // 3. Тач-жесты (Pinch-to-zoom двумя пальцами + Pan одним пальцем)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      posStartRef.current = { ...position };
      lastTouchDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      lastTouchDistRef.current = dist;
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
    } else if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = newDist / lastTouchDistRef.current;
      setScale((prev) => Math.min(2.5, Math.max(0.6, prev * ratio)));
      lastTouchDistRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    lastTouchDistRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
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
        backgroundColor: '#05070a'
      }}
    >
      {/* Кнопки зума и центрирования в правом верхнем углу холста */}
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
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(2.5, s + 0.25)); }}
          title="Приблизить"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#f8fafc',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.6, s - 0.25)); }}
          title="Отдалить"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#f8fafc',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          -
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); centerCamera(); }}
          title="Центрировать камеру"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: '#1e293b',
            border: '1px solid #8b5cf6',
            color: '#c084fc',
            fontWeight: 800,
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          🎯
        </button>
      </div>

      {/* Интерактивный трансформируемый слой игрового поля */}
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 62px)',
          gridTemplateRows: 'repeat(5, 62px)',
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
