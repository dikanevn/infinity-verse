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

    const centerX = width / 2 + position.x;
    const centerY = height / 2 + position.y;

    const orders = [
      { order: 1, name: '10' },
      { order: 2, name: '100' },
      { order: 3, name: '1 000' },
      { order: 4, name: '10 000' },
      { order: 5, name: '100 000' },
      { order: 6, name: '1 000 000 (1 млн)' },
      { order: 7, name: '10 млн' },
      { order: 8, name: '100 млн' },
      { order: 9, name: '1 млрд (2^31 предел int32)' }
    ];

    for (const item of orders) {
      const cellCount = Math.pow(10, item.order);
      const halfSizePx = (cellCount * cellPitch / 2) * scale;
      const screenHalf = halfSizePx;

      if (screenHalf < 2) continue;
      if (screenHalf > Math.max(width, height) * 6) continue;

      const left = centerX - screenHalf;
      const top = centerY - screenHalf;
      const size = screenHalf * 2;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left, top, size, size);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`◽ 10^${item.order} (${item.name} кл)`, left + 6, top + 16);
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
        zIndex: 1
      }}
    />
  );
};
