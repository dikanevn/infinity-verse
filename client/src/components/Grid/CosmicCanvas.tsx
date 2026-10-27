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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Центр сетки (0, 0) на экране:
    const originX = width / 2 + position.x;
    const originY = height / 2 + position.y;

    const orders = [
      { order: 1, name: '10' },
      { order: 2, name: '100' },
      { order: 3, name: '1 000' },
      { order: 4, name: '10 000' },
      { order: 5, name: '100 000' },
      { order: 6, name: '1 млн' },
      { order: 7, name: '10 млн' },
      { order: 8, name: '100 млн' },
      { order: 9, name: '1 млрд' }
    ];

    for (const item of orders) {
      const radius = Math.floor(Math.pow(10, item.order) / 2); // например для 10: от -5 до +5

      // Координаты углов в мировых пикселях:
      // Клетка (x, y) имеет левый край: x * pitch - 31, правый край: x * pitch + 31
      // Верхний край: -y * pitch - 31, нижний край: -y * pitch + 31
      const worldLeft = -radius * cellPitch - 31;
      const worldRight = radius * cellPitch + 31;
      const worldTop = -radius * cellPitch - 31;
      const worldBottom = radius * cellPitch + 31;

      // Перевод в экранные пиксели:
      const screenLeft = originX + worldLeft * scale;
      const screenRight = originX + worldRight * scale;
      const screenTop = originY + worldTop * scale;
      const screenBottom = originY + worldBottom * scale;

      const screenWidth = screenRight - screenLeft;
      const screenHeight = screenBottom - screenTop;

      // Если рамка слишком маленькая (< 3px) или гигантская за экраном — пропускаем
      if (screenWidth < 3) continue;
      if (screenWidth > Math.max(width, height) * 6) continue;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenLeft, screenTop, screenWidth, screenHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`◽ 10^${item.order} (${item.name} кл)`, screenLeft + 6, screenTop + 14);
      ctx.restore();
    }
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
