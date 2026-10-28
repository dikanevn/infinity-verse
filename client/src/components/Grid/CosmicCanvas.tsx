import React, { useRef, useEffect } from 'react';
import type { CellData, PlayerData } from '../../types';
import {
  SAND_PIXELS_8X8,
  STAR_PIXELS_8X8,
  OBELISK_PIXELS_8X8,
  PORTAL_PIXELS_8X8,
  PLAYER_PIXELS_8X8,
  type PixelMatrix
} from '../../config/pixelTextures';

interface CosmicCanvasProps {
  scale: number;
  position: { x: number; y: number };
  cellPitch: number;
  width: number;
  height: number;
  cells: CellData[];
  player: PlayerData | null;
  selectedCoord: { x: number; y: number };
}

export const CosmicCanvas: React.FC<CosmicCanvasProps> = ({
  scale,
  position,
  cellPitch,
  width,
  height,
  cells,
  player,
  selectedCoord
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Включаем идеальный пиксельный рендеринг без размытия
    ctx.imageSmoothingEnabled = false;

    let startTime = performance.now();

    const macroOrders = [
      // 10^2 отключен по запросу пользователя
      { exp: 2, side: 100, label: '10^4 (10 000 кл)' },
      { exp: 3, side: 1000, label: '10^6 (1 млн кл)' },
      { exp: 4, side: 10000, label: '10^8 (100 млн кл)' },
      { exp: 5, side: 100000, label: '10^10 (10 млрд кл)' },
      { exp: 6, side: 1000000, label: '10^12 (1 трлн кл)' },
      { exp: 7, side: 10000000, label: '10^14' },
      { exp: 8, side: 100000000, label: '10^16' },
      { exp: 9, side: 1000000000, label: '10^18 (Граница мира)' }
    ];

    const drawMatrix = (
      matrix: PixelMatrix,
      startX: number,
      startY: number,
      cellSizePx: number
    ) => {
      const subPx = cellSizePx / matrix.width;
      for (let r = 0; r < matrix.height; r++) {
        for (let c = 0; c < matrix.width; c++) {
          const colorIdx = matrix.data[r * matrix.width + c];
          const color = matrix.palette[colorIdx];
          if (color === 'transparent') continue;

          const pxLeft = startX + c * subPx;
          const pxTop = startY + r * subPx;

          // Рисуем чистый цветной пиксель
          ctx.fillStyle = color;
          ctx.fillRect(pxLeft, pxTop, subPx, subPx);

          // При супер-приближении (когда пиксель > 16px) показываем суб-сетку пикселей
          if (subPx >= 16) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(pxLeft, pxTop, subPx, subPx);
          }
        }
      }
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const originX = width / 2 + position.x;
      const originY = height / 2 + position.y;

      const t = (time - startTime) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);

      // ============================================================
      // 1. ПИКСЕЛЬНЫЙ РЕНДЕР КЛЕТОК МИРА (ЧЕСТНЫЕ ДИСКРЕТНЫЕ ПИКСЕЛИ)
      // ============================================================
      const cellSizePx = 62 * scale;

      // Если клетки видны на экране
      if (cellSizePx >= 1.5) {
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const worldLeft = cell.x * cellPitch - 31;
          const worldTop = -cell.y * cellPitch - 31;

          const screenLeft = originX + worldLeft * scale;
          const screenTop = originY + worldTop * scale;

          // Culling: отсекаем то, что за экраном
          if (
            screenLeft + cellSizePx < 0 ||
            screenLeft > width ||
            screenTop + cellSizePx < 0 ||
            screenTop > height
          ) {
            continue;
          }

          // А. Отрисовка ландшафта (Terrain) в пикселях
          if (cell.terrain === 1) {
            drawMatrix(SAND_PIXELS_8X8, screenLeft, screenTop, cellSizePx);
          } else if (cell.terrain === 0) {
            // Хаос: темная космическая клетка
            ctx.fillStyle = '#06080f';
            ctx.fillRect(screenLeft, screenTop, cellSizePx, cellSizePx);
          } else {
            ctx.fillStyle = '#14291e';
            ctx.fillRect(screenLeft, screenTop, cellSizePx, cellSizePx);
          }

          // Б. Отрисовка объектов (Objects) в пикселях
          if (cell.object === 1 || cell.object === 9) {
            drawMatrix(OBELISK_PIXELS_8X8, screenLeft, screenTop, cellSizePx);
          } else if (cell.object === 3) {
            drawMatrix(STAR_PIXELS_8X8, screenLeft, screenTop, cellSizePx);
          } else if (cell.object === 4) {
            drawMatrix(PORTAL_PIXELS_8X8, screenLeft, screenTop, cellSizePx);
          }

          // В. Отрисовка жителей и толпы из блокчейна (доступно всем, даже без кошелька)
          const hasOccupants = (cell.crowdCount || 0) > 0;
          const isCurrentPlayerHere = player?.exists && player.x === cell.x && player.y === cell.y;

          if (hasOccupants && !isCurrentPlayerHere) {
            // Рисуем исследователя мира
            drawMatrix(PLAYER_PIXELS_8X8, screenLeft, screenTop, cellSizePx);

            // Если на клетке толпа (> 1 человека), рисуем стильный бейдж численности
            if ((cell.crowdCount || 0) > 1 && cellSizePx >= 16) {
              ctx.save();
              const badgeText = `${cell.crowdCount}`;
              ctx.font = `bold ${Math.max(9, Math.min(14, Math.floor(cellSizePx * 0.28)))}px monospace`;
              const textMetrics = ctx.measureText(badgeText);
              const bWidth = textMetrics.width + 6;
              const bHeight = Math.max(10, Math.floor(cellSizePx * 0.32));
              const bX = screenLeft + cellSizePx - bWidth - 2;
              const bY = screenTop + 2;

              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.roundRect(bX, bY, bWidth, bHeight, 3);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#38bdf8';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(badgeText, bX + bWidth / 2, bY + bHeight / 2);
              ctx.restore();
            }
          }

          // Г. Граница выбранной клетки
          if (selectedCoord.x === cell.x && selectedCoord.y === cell.y) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.min(4, Math.max(1.5, 2 * scale));
            ctx.strokeRect(screenLeft, screenTop, cellSizePx, cellSizePx);
          }
        }

        // Д. Отрисовка текущего подключенного игрока (с неоновым свечением первооткрывателя)
        if (player?.exists) {
          const pLeft = originX + (player.x * cellPitch - 31) * scale;
          const pTop = originY + (-player.y * cellPitch - 31) * scale;
          drawMatrix(PLAYER_PIXELS_8X8, pLeft, pTop, cellSizePx);

          // Неоновый ореол вокруг активного исследователя
          if (cellSizePx >= 12) {
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(pLeft - 1, pTop - 1, cellSizePx + 2, cellSizePx + 2);
            ctx.restore();
          }
        }
      }

      // ============================================================
      // 2. ВНЕШНИЕ РАМКИ ПРИ ОТДАЛЕНИИ (10^2 .. 10^18)
      // ============================================================
      for (let i = 0; i < macroOrders.length; i++) {
        const item = macroOrders[i];
        const isOuterMost = i === macroOrders.length - 1; // 10^18
        const radius = Math.floor(item.side / 2);

        const worldLeft = -radius * cellPitch - 31;
        const worldRight = radius * cellPitch + 31;
        const worldTop = -radius * cellPitch - 31;
        const worldBottom = radius * cellPitch + 31;

        const screenLeft = originX + worldLeft * scale;
        const screenRight = originX + worldRight * scale;
        const screenTop = originY + worldTop * scale;
        const screenBottom = originY + worldBottom * scale;

        const screenWidth = screenRight - screenLeft;
        const screenHeight = screenBottom - screenTop;

        if (screenWidth < 3 || screenWidth > Math.max(width, height) * 8) continue;

        ctx.save();
        if (isOuterMost) {
          const grad = ctx.createLinearGradient(
            screenLeft,
            screenTop,
            screenLeft + screenWidth,
            screenTop + screenHeight
          );
          const hueShift = Math.sin(t * 1.5) * 20;
          grad.addColorStop(0, `hsl(${270 + hueShift}, 100%, ${65 + pulse * 20}%)`);
          grad.addColorStop(0.35, `hsl(${300 + hueShift}, 100%, ${70 + pulse * 15}%)`);
          grad.addColorStop(0.7, `hsl(${260 + hueShift}, 100%, ${60 + pulse * 25}%)`);
          grad.addColorStop(1, `hsl(${285 + hueShift}, 100%, ${75 + pulse * 15}%)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5 + pulse * 1.5;
          ctx.shadowColor = 'rgba(192, 132, 252, 0.9)';
          ctx.shadowBlur = 12 + pulse * 10;
          ctx.strokeRect(screenLeft, screenTop, screenWidth, screenHeight);

          ctx.fillStyle = '#f5d0fe';
          ctx.font = 'bold 12px monospace';
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 8;
          ctx.fillText(item.label, screenLeft + 8, screenTop + 16);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 3;
          ctx.strokeRect(screenLeft, screenTop, screenWidth, screenHeight);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(item.label, screenLeft + 6, screenTop + 14);
        }
        ctx.restore();
      }

      // ============================================================
      // 3. БЕСКОНЕЧНЫЕ МИКРО-РАМКИ ПРИ ПРИБЛИЖЕНИИ (ВГЛУБЬ ПИКСЕЛЯ)
      // ============================================================
      if (scale > 1.2) {
        const curExp = Math.floor(Math.log10(scale));
        const minExp = Math.max(1, curExp - 2);
        const maxExp = curExp + 3;

        for (let exp = minExp; exp <= maxExp; exp++) {
          const power = exp * 2;
          const screenWidth = 62 * Math.pow(10, -exp) * scale;

          if (screenWidth < 3 || screenWidth > Math.max(width, height) * 6) continue;

          // Квадраты ровно и концентрически выходят из центра экрана (viewport center),
          // в который смотрит камера при зуме в любой точке мира
          const screenCenterX = width / 2;
          const screenCenterY = height / 2;

          const half = screenWidth / 2;
          const screenLeft = screenCenterX - half;
          const screenTop = screenCenterY - half;

          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 3;
          ctx.strokeRect(screenLeft, screenTop, screenWidth, screenWidth);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(`10^-${power}`, screenLeft + 6, screenTop + 14);
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [scale, position, cellPitch, width, height, cells, player, selectedCoord]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 1,
        imageRendering: 'pixelated'
      }}
    />
  );
};
