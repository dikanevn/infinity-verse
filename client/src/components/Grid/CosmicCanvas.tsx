import React, { useRef, useEffect } from 'react';

interface CosmicCanvasProps {
  scale: number;
  position: { x: number; y: number };
  cellPitch: number;
  width: number;
  height: number;
}

export const CosmicCanvas: React.FC<CosmicCanvasProps> = ({
  scale,
  position,
  cellPitch,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    // Внешние порядки (от 10^1 до 10^9)
    const macroOrders = [
      { order: 1, name: '10' },
      { order: 2, name: '100' },
      { order: 3, name: '1 000' },
      { order: 4, name: '10 000' },
      { order: 5, name: '100 000' },
      { order: 6, name: '1 млн' },
      { order: 7, name: '10 млн' },
      { order: 8, name: '100 млн' },
      { order: 9, name: 'Граница мира' }
    ];

    // Внутренние микро-порядки внутрь клетки (от 10^-1 до 10^-9)
    const microOrders = [
      { order: -1, name: '0.1' },
      { order: -2, name: '0.01' },
      { order: -3, name: '0.001' },
      { order: -4, name: '10^-4' },
      { order: -5, name: '10^-5' },
      { order: -6, name: '10^-6 (Микро)' },
      { order: -7, name: '10^-7' },
      { order: -8, name: '10^-8' },
      { order: -9, name: 'Квантовое ядро' }
    ];

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const originX = width / 2 + position.x;
      const originY = height / 2 + position.y;

      const t = (time - startTime) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);

      // 1. ВНЕШНИЕ РАМКИ (10^1 .. 10^9)
      for (let i = 0; i < macroOrders.length; i++) {
        const item = macroOrders[i];
        const isOuterMost = i === macroOrders.length - 1; // 10^9
        const radius = Math.floor(Math.pow(10, item.order) / 2);

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
          ctx.fillText(`10^${item.order} (${item.name})`, screenLeft + 8, screenTop + 16);
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
          ctx.fillText(`10^${item.order} (${item.name} кл)`, screenLeft + 6, screenTop + 14);
        }
        ctx.restore();
      }

      // 2. ВНУТРЕННИЕ МИКРО-РАМКИ ВГЛУБЬ КЛЕТКИ (10^-1 .. 10^-9)
      // Рассчитываются от центра клетки (0, 0), размер: 62px * 10^order
      for (let i = 0; i < microOrders.length; i++) {
        const item = microOrders[i];
        const isCore = i === microOrders.length - 1; // 10^-9
        const fraction = Math.pow(10, item.order); // 0.1, 0.01, ...
        const halfWorldSize = (62 * fraction) / 2;

        const screenLeft = originX - halfWorldSize * scale;
        const screenTop = originY - halfWorldSize * scale;
        const screenWidth = halfWorldSize * 2 * scale;
        const screenHeight = screenWidth;

        if (screenWidth < 3 || screenWidth > Math.max(width, height) * 8) continue;

        ctx.save();
        if (isCore) {
          // Внутреннее квантовое ядро 10^-9: неоновый лазурно-фиолетовый пульсирующий свет
          const grad = ctx.createLinearGradient(
            screenLeft,
            screenTop,
            screenLeft + screenWidth,
            screenTop + screenHeight
          );
          grad.addColorStop(0, `hsl(${190}, 100%, ${65 + pulse * 20}%)`);
          grad.addColorStop(0.5, `hsl(${280}, 100%, ${70 + pulse * 15}%)`);
          grad.addColorStop(1, `hsl(${220}, 100%, ${75 + pulse * 15}%)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5 + pulse * 1.5;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
          ctx.shadowBlur = 12 + pulse * 10;
          ctx.strokeRect(screenLeft, screenTop, screenWidth, screenHeight);

          ctx.fillStyle = '#bae6fd';
          ctx.font = 'bold 12px monospace';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 8;
          ctx.fillText(`10^${item.order} (${item.name})`, screenLeft + 8, screenTop + 16);
        } else {
          // Белые рамки микро-порядков
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 3;
          ctx.strokeRect(screenLeft, screenTop, screenWidth, screenHeight);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(`10^${item.order} (${item.name})`, screenLeft + 6, screenTop + 14);
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [scale, position, cellPitch, width, height]);

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
        zIndex: 5
      }}
    />
  );
};
