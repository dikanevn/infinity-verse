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

    // Внешние макро-порядки площади (10^2 .. 10^18)
    // 10x10 = 10^2 (100 кл)
    // 100x100 = 10^4 (10 000 кл)
    // ...
    // 10^9 x 10^9 = 10^18 (Граница мира / 2^64)
    const macroOrders = [
      { exp: 1, side: 10, power: 2, label: '10^2 (100 кл)' },
      { exp: 2, side: 100, power: 4, label: '10^4 (10 000 кл)' },
      { exp: 3, side: 1000, power: 6, label: '10^6 (1 млн кл)' },
      { exp: 4, side: 10000, power: 8, label: '10^8 (100 млн кл)' },
      { exp: 5, side: 100000, power: 10, label: '10^10 (10 млрд кл)' },
      { exp: 6, side: 1000000, power: 12, label: '10^12 (1 трлн кл)' },
      { exp: 7, side: 10000000, power: 14, label: '10^14' },
      { exp: 8, side: 100000000, power: 16, label: '10^16' },
      { exp: 9, side: 1000000000, power: 18, label: '10^18 (Граница мира)' }
    ];

    // Внутренние микро-порядки внутрь клетки
    const microOrders = [
      { exp: -1, fraction: 0.1, power: -2, label: '10^-2' },
      { exp: -2, fraction: 0.01, power: -4, label: '10^-4' },
      { exp: -3, fraction: 0.001, power: -6, label: '10^-6' },
      { exp: -4, fraction: 0.0001, power: -8, label: '10^-8' },
      { exp: -5, fraction: 0.00001, power: -10, label: '10^-10' },
      { exp: -6, fraction: 0.000001, power: -12, label: '10^-12' },
      { exp: -7, fraction: 0.0000001, power: -14, label: '10^-14' },
      { exp: -8, fraction: 0.00000001, power: -16, label: '10^-16' },
      { exp: -9, fraction: 0.000000001, power: -18, label: '10^-18 (Квантовое ядро)' }
    ];

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const originX = width / 2 + position.x;
      const originY = height / 2 + position.y;

      const t = (time - startTime) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);

      // 1. ВНЕШНИЕ РАМКИ
      for (let i = 0; i < macroOrders.length; i++) {
        const item = macroOrders[i];
        const isOuterMost = i === macroOrders.length - 1; // 10^18 Граница мира
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

      // 2. ВНУТРЕННИЕ МИКРО-РАМКИ ВГЛУБЬ КЛЕТКИ
      for (let i = 0; i < microOrders.length; i++) {
        const item = microOrders[i];
        const isCore = i === microOrders.length - 1; // 10^-18
        const halfWorldSize = (62 * item.fraction) / 2;

        const screenLeft = originX - halfWorldSize * scale;
        const screenTop = originY - halfWorldSize * scale;
        const screenWidth = halfWorldSize * 2 * scale;
        const screenHeight = screenWidth;

        if (screenWidth < 3 || screenWidth > Math.max(width, height) * 8) continue;

        ctx.save();
        if (isCore) {
          const grad = ctx.createLinearGradient(
            screenLeft,
            screenTop,
            screenLeft + screenWidth,
            screenTop + screenHeight
          );
          grad.addColorStop(0, `hsl(190, 100%, ${65 + pulse * 20}%)`);
          grad.addColorStop(0.5, `hsl(280, 100%, ${70 + pulse * 15}%)`);
          grad.addColorStop(1, `hsl(220, 100%, ${75 + pulse * 15}%)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5 + pulse * 1.5;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
          ctx.shadowBlur = 12 + pulse * 10;
          ctx.strokeRect(screenLeft, screenTop, screenWidth, screenHeight);

          ctx.fillStyle = '#bae6fd';
          ctx.font = 'bold 12px monospace';
          ctx.shadowColor = '#0284c7';
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
