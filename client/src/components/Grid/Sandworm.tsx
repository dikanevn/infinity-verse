import React, { useEffect, useState, useRef } from 'react';

interface SandwormProps {
  x: number;
  y: number;
  cellPitch: number;
  isEatingStar?: boolean;
}

export const Sandworm: React.FC<SandwormProps> = ({
  x,
  y,
  cellPitch,
  isEatingStar = false
}) => {
  // Вычисляем целевой пиксельный центр
  const targetPxX = x * cellPitch;
  const targetPxY = -y * cellPitch;

  // Позиции сегментов тела червя для плавной кинематики ползания (IK tail)
  // [голова, шея, тело1, тело2, хвост]
  const [segments, setSegments] = useState<Array<{ x: number; y: number }>>(() => [
    { x: targetPxX, y: targetPxY },
    { x: targetPxX - 5, y: targetPxY + 5 },
    { x: targetPxX - 10, y: targetPxY + 10 },
    { x: targetPxX - 15, y: targetPxY + 15 },
    { x: targetPxX - 20, y: targetPxY + 20 }
  ]);

  // Угол поворота головы в радианах
  const [headAngle, setHeadAngle] = useState<number>(0);
  const [isLunging, setIsLunging] = useState<boolean>(false);
  const prevCoordRef = useRef<{ x: number; y: number }>({ x, y });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Проверяем, изменились ли координаты
    const prev = prevCoordRef.current;
    if (prev.x !== x || prev.y !== y) {
      const dx = x - prev.x;
      const dy = -(y - prev.y); // Инвертируем Y для экранных координат
      const angle = Math.atan2(dy, dx);
      setHeadAngle(angle);
      prevCoordRef.current = { x, y };

      // Запуск всплытия / атаки из песка (lunge)
      setIsLunging(true);
      const timer = setTimeout(() => setIsLunging(false), 900);
      return () => clearTimeout(timer);
    }
  }, [x, y]);

  // Анимация сегментов с легким изгибом и плавным следованием за головой
  useEffect(() => {
    let active = true;

    const updateKinematics = () => {
      setSegments(prevSegs => {
        const next = [...prevSegs];
        // Голова стремится к targetPxX, targetPxY
        const head = next[0];
        const hDx = targetPxX - head.x;
        const hDy = targetPxY - head.y;
        head.x += hDx * 0.18;
        head.y += hDy * 0.18;

        // Последующие сегменты тянутся друг за другом с фиксированной дистанцией
        const segmentDist = 11;
        for (let i = 1; i < next.length; i++) {
          const leader = next[i - 1];
          const follower = next[i];
          const fdx = follower.x - leader.x;
          const fdy = follower.y - leader.y;
          const curDist = Math.hypot(fdx, fdy);
          if (curDist > 0.1) {
            follower.x = leader.x + (fdx / curDist) * segmentDist;
            follower.y = leader.y + (fdy / curDist) * segmentDist;
          }
        }
        return next;
      });

      if (active) {
        animFrameRef.current = requestAnimationFrame(updateKinematics);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateKinematics);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetPxX, targetPxY]);

  const head = segments[0] || { x: targetPxX, y: targetPxY };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 20
      }}
    >
      {/* Сегменты тела червя (хвост и кольца тела) */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          overflow: 'visible'
        }}
      >
        <defs>
          <radialGradient id="wormSandBurst" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#92400e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Облако пыли и песка под червем при движении */}
        <ellipse
          cx={head.x}
          cy={head.y + 4}
          rx={isLunging ? 32 : 22}
          ry={isLunging ? 22 : 14}
          fill="url(#wormSandBurst)"
          style={{
            transition: 'rx 0.3s ease, ry 0.3s ease',
            filter: 'blur(3px)'
          }}
        />

        {/* Сегменты туловища от хвоста к шее */}
        {segments.slice(1).map((seg, idx) => {
          // idx 0 -> сегмент 1 (шея), idx 3 -> хвост
          const r = Math.max(5, 14 - idx * 2.8);
          return (
            <g key={idx}>
              <circle
                cx={seg.x}
                cy={seg.y}
                r={r}
                fill="#543828"
                stroke="#291a10"
                strokeWidth="2.5"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
                }}
              />
              {/* Кольца панциря червя */}
              <circle
                cx={seg.x}
                cy={seg.y}
                r={r * 0.7}
                fill="#784b30"
                opacity="0.9"
              />
            </g>
          );
        })}
      </svg>

      {/* Голова песчаного червя Шаи-Хулуда (Пасть с клыками) */}
      <div
        style={{
          position: 'absolute',
          left: `${head.x}px`,
          top: `${head.y}px`,
          transform: `translate(-50%, -50%) rotate(${headAngle}rad) scale(${isLunging ? 1.25 : 1})`,
          transition: 'transform 0.12s ease-out',
          width: '46px',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg
          width="46"
          height="46"
          viewBox="0 0 100 100"
          style={{
            overflow: 'visible',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.85))'
          }}
        >
          {/* Наружное бронированное кольцо чешуи */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="#3d2415"
            stroke="#1d1109"
            strokeWidth="5"
          />

          {/* Внутренняя зияющая бездна пасти */}
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="#120703"
          />

          {/* Трёхстворчатые мощные челюсти Дюны */}
          <path
            d="M 50 15 Q 40 38 50 50 Q 60 38 50 15 Z"
            fill="#6b3a24"
            stroke="#261309"
            strokeWidth="2"
          />
          <path
            d="M 20 70 Q 38 60 50 50 Q 30 50 20 70 Z"
            fill="#6b3a24"
            stroke="#261309"
            strokeWidth="2"
          />
          <path
            d="M 80 70 Q 70 50 50 50 Q 62 60 80 70 Z"
            fill="#6b3a24"
            stroke="#261309"
            strokeWidth="2"
          />

          {/* Концентрические ряды кристаллических зубов (Крис-ножи) */}
          {/* Внешний ряд зубов */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
            <polygon
              key={`t1-${i}`}
              points="50,18 47,27 53,27"
              fill="#fef08a"
              stroke="#ca8a04"
              strokeWidth="0.8"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}

          {/* Внутренний ряд зубов */}
          {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg, i) => (
            <polygon
              key={`t2-${i}`}
              points="50,28 48,34 52,34"
              fill="#ffffff"
              stroke="#a1a1aa"
              strokeWidth="0.6"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}

          {/* Глубинное огненное свечение в жерле спайса */}
          <circle
            cx="50"
            cy="50"
            r="12"
            fill="#ea580c"
            opacity={isEatingStar ? 0.95 : 0.65}
            style={{
              animation: 'spicePulse 1.5s infinite alternate'
            }}
          />
        </svg>

        {/* Анимация поглощения звезды снизу пастью червя */}
        {isEatingStar && (
          <div
            style={{
              position: 'absolute',
              fontSize: '1.4rem',
              animation: 'starDevour 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              zIndex: 30,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 0 10px #facc15)'
            }}
          >
            ⭐
          </div>
        )}
      </div>

      <style>{`
        @keyframes spicePulse {
          0% { r: 9px; opacity: 0.5; filter: drop-shadow(0 0 4px #f97316); }
          100% { r: 13px; opacity: 0.85; filter: drop-shadow(0 0 10px #eab308); }
        }
        @keyframes starDevour {
          0% {
            transform: scale(1.6) translateY(12px);
            opacity: 1;
            filter: drop-shadow(0 0 14px #facc15);
          }
          50% {
            transform: scale(1.1) translateY(2px);
            opacity: 0.9;
          }
          100% {
            transform: scale(0.1) translateY(-8px) rotate(180deg);
            opacity: 0;
            filter: drop-shadow(0 0 0px #000);
          }
        }
      `}</style>
    </div>
  );
};
