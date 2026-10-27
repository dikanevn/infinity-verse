import { CosmicCanvas } from './CosmicCanvas';
import React, { useState, useRef, useEffect } from 'react';
import type { CellData, PlayerData } from '../../types';
import { CellView } from './CellView';

interface WorldGridProps {
  cells: CellData[];
  selectedCoord: { x: number; y: number };
  player: PlayerData | null;
  focusCoord: { x: number; y: number };
  inferBalance?: number | null;
  onSelectCoord: (coord: { x: number; y: number }) => void;
  onCenterPlayer: () => void;
  onQuickMove?: (coord: { x: number; y: number }) => void;
}

export const WorldGrid: React.FC<WorldGridProps> = ({
  cells,
  selectedCoord,
  player,
  focusCoord,
  inferBalance,
  onSelectCoord,
  onCenterPlayer,
  onQuickMove
}) => {
  const [scale, setScale] = useState<number>(0.85);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  // Рефы для актуальных значений без задержек стейта React
  const scaleRef = useRef<number>(0.85);
  scaleRef.current = scale;
  const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  positionRef.current = position;

  

  // Собираем все координаты для отрисовки из загруженных cells
  // Если клеток еще нет — дефолтно рисуем 5х5 вокруг фокуса
  const coordsToRender = cells.length > 0 
    ? cells.map(c => ({ x: c.x, y: c.y }))
    : (() => {
        const fallback: { x: number; y: number }[] = [];
        for (let y = focusCoord.y + 2; y >= focusCoord.y - 2; y--) {
          for (let x = focusCoord.x - 2; x <= focusCoord.x + 2; x++) {
            fallback.push({ x, y });
          }
        }
        return fallback;
      })();

  // Размер одной клетки 62px + 1px разделитель = 63px
  const CELL_PITCH = 63;

  const isFirstMountRef = useRef<boolean>(true);

  // Автоматически центрируем камеру на игроке при начальной загрузке и при каждом изменении координат игрока (после хода)
  useEffect(() => {
    if (player?.exists) {
      isFirstMountRef.current = false;
      const targetPos = {
        x: -player.x * CELL_PITCH * scaleRef.current,
        y: player.y * CELL_PITCH * scaleRef.current
      };
      setPosition(targetPos);
      positionRef.current = targetPos;
    }
  }, [player?.x, player?.y, player?.exists]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 400, height: 380 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height)
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const isDraggingRef = useRef<boolean>(false);
  const isPinchingRef = useRef<boolean>(false);
  const hasMovedRef = useRef<boolean>(false);

  // Для 1 пальца (панорамирование)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Для 2 пальцев (зум + панорамирование)
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(0.85);
  const pinchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Масштабирование по кнопкам относительно центра экрана
  const handleZoomIn = () => {
    const curScale = scaleRef.current;
    const newScale = curScale * 1.5;
    const scaleMultiplier = newScale / curScale;
    setScale(newScale);
    setPosition(prev => {
      const nextPos = {
        x: prev.x * scaleMultiplier,
        y: prev.y * scaleMultiplier
      };
      positionRef.current = nextPos;
      return nextPos;
    });
  };

  const handleZoomOut = () => {
    const curScale = scaleRef.current;
    const newScale = Math.max(0.0000000001, curScale * 0.6);
    const scaleMultiplier = newScale / curScale;
    setScale(newScale);
    setPosition(prev => {
      const nextPos = {
        x: prev.x * scaleMultiplier,
        y: prev.y * scaleMultiplier
      };
      positionRef.current = nextPos;
      return nextPos;
    });
  };

  const handleResetToPlayer = () => {
    const defaultScale = 0.85;
    setScale(defaultScale);
    let nextPos = { x: 0, y: 0 };
    if (player?.exists) {
      nextPos = {
        x: -player.x * CELL_PITCH * defaultScale,
        y: player.y * CELL_PITCH * defaultScale
      };
    }
    setPosition(nextPos);
    positionRef.current = nextPos;
    onCenterPlayer();
  };

  // Клик по бесконечному туману (контейнеру) пересчитывает координаты и переносит фокус
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - rect.width / 2 - positionRef.current.x;
    const clickY = e.clientY - rect.top - rect.height / 2 - positionRef.current.y;

    // В абсолютных координатах мира: X вправо (+), Y вверх (+)
    const clickedGridX = Math.round(clickX / (CELL_PITCH * scaleRef.current));
    const clickedGridY = -Math.round(clickY / (CELL_PITCH * scaleRef.current));

    onSelectCoord({ x: clickedGridX, y: clickedGridY });
  };

  // Drag мышью (только перемещение, без зума)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    setIsInteracting(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...positionRef.current };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    const nextPos = {
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy
    };
    positionRef.current = nextPos;
    setPosition(nextPos);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsInteracting(false);
  };

  // Нативные touch-листенери с { passive: false } для стабильного pinch-to-zoom на мобильных
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        isPinchingRef.current = false;
        setIsInteracting(true);
        hasMovedRef.current = false;
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        posStartRef.current = { ...positionRef.current };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        isDraggingRef.current = false;
        isPinchingRef.current = true;
        setIsInteracting(true);
        hasMovedRef.current = true;

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchStartDistRef.current = Math.max(10, dist);
        pinchStartScaleRef.current = scaleRef.current;
        pinchStartCenterRef.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        pinchStartPosRef.current = { ...positionRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMovedRef.current = true;
        }
        const nextPos = {
          x: posStartRef.current.x + dx,
          y: posStartRef.current.y + dy
        };
        positionRef.current = nextPos;
        setPosition(nextPos);
      } else if (e.touches.length === 2 && isPinchingRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const distRatio = curDist / pinchStartDistRef.current;
        const newScale = Math.max(0.0000000001, pinchStartScaleRef.current * distRatio);

        const curMidX = (t1.clientX + t2.clientX) / 2;
        const curMidY = (t1.clientY + t2.clientY) / 2;
        const panDx = curMidX - pinchStartCenterRef.current.x;
        const panDy = curMidY - pinchStartCenterRef.current.y;

        // Масштабирование относительно центра контейнера с учетом начальной точки
        const scaleFactor = newScale / pinchStartScaleRef.current;
        const nextPos = {
          x: pinchStartPosRef.current.x * scaleFactor + panDx,
          y: pinchStartPosRef.current.y * scaleFactor + panDy
        };

        scaleRef.current = newScale;
        positionRef.current = nextPos;
        setScale(newScale);
        setPosition(nextPos);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Плавный переход с двух пальцев на один без рывка
        isDraggingRef.current = true;
        isPinchingRef.current = false;
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        posStartRef.current = { ...positionRef.current };
      } else if (e.touches.length === 0) {
        isDraggingRef.current = false;
        isPinchingRef.current = false;
        setIsInteracting(false);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const curScale = scaleRef.current;
    const newScale = Math.max(0.0000000001, curScale * zoomFactor);

    const scaleMultiplier = newScale / curScale;
    setScale(newScale);
    setPosition(prev => {
      const nextPos = {
        x: prev.x * scaleMultiplier,
        y: prev.y * scaleMultiplier
      };
      positionRef.current = nextPos;
      return nextPos;
    });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onClick={handleBackgroundClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
        /* Бесконечный процедурный космический туман БЕЗ лишней сетки */
        backgroundColor: '#090d16',
        backgroundImage: `
          radial-gradient(circle, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
          radial-gradient(ellipse at 30% 20%, rgba(71, 85, 105, 0.45) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 80%, rgba(51, 65, 85, 0.5) 0%, transparent 65%),
          radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.6) 0%, rgba(9, 13, 22, 0.98) 100%)
        `,
        backgroundSize: `48px 48px, 100% 100%, 100% 100%, 100% 100%`,
        border: '1px solid #475569',
        borderRadius: '0px',
        boxSizing: 'border-box'
      }}
    >
      {/* Виджет баланса токенов $INFER в левом верхнем углу карты */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #eab308',
        boxShadow: '0 0 10px rgba(234, 179, 8, 0.2)',
        padding: '4px 8px',
        borderRadius: '4px',
        pointerEvents: 'auto',
        userSelect: 'none'
      }}>
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>⭐</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
            $INFER
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fef08a', fontFamily: 'monospace', lineHeight: 1.1 }}>
            {inferBalance !== undefined && inferBalance !== null ? inferBalance.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '...'}
          </span>
        </div>
      </div>

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
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
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
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
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

      {/* Легковесный 2D Canvas для космических рамок масштаба */}
      <CosmicCanvas
        scale={scale}
        position={position}
        cellPitch={CELL_PITCH}
        width={containerDimensions.width}
        height={containerDimensions.height}
        cells={cells}
        player={player}
        selectedCoord={selectedCoord}
      />

      {/* Интерактивный слой мира (отрисовывает активные клетки на абсолютных координатах мира) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${Math.min(4, Math.max(0.01, scale))})`,
          display: scale > 4 || scale < 0.02 ? 'none' : 'block',
          transformOrigin: 'center center',
          transition: isInteracting ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
          position: 'relative',
          width: '0px',
          height: '0px'
        }}
      >
        
        {(scale >= 0.02 && scale <= 4 ? coordsToRender : []).map((coord) => {
          const cell = cells.find(c => c.x === coord.x && c.y === coord.y);
          const isSelected = selectedCoord.x === coord.x && selectedCoord.y === coord.y;

          // В абсолютных координатах мира относительно центра (0,0):
          // X растет вправо: left = coord.x * 63 - 31
          // Y растет вверх:  top = -coord.y * 63 - 31
          return (
            <div
              key={`${coord.x},${coord.y}`}
              style={{
                position: 'absolute',
                left: `${coord.x * CELL_PITCH - 31}px`,
                top: `${-coord.y * CELL_PITCH - 31}px`,
                width: '62px',
                height: '62px'
              }}
            >
              <CellView
                coord={coord}
                cell={cell}
                isSelected={isSelected}
                player={player}
                onSelect={onSelectCoord}
                onQuickMove={onQuickMove}
              />
            </div>
          );
        })}


      </div>
    </div>
  );
};
