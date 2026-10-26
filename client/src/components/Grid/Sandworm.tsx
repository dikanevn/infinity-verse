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
  // Координаты центра текущей клетки в пикселях мира
  const targetPxX = x * cellPitch;
  const targetPxY = -y * cellPitch;

  // Сегменты кинематики ползания червя (голова, 4 сегмента шеи и хвоста)
  const [segments, setSegments] = useState<Array<{ x: number; y: number }>>(() => [
    { x: targetPxX, y: targetPxY },
    { x: targetPxX - 6, y: targetPxY + 6 },
    { x: targetPxX - 12, y: targetPxY + 12 },
    { x: targetPxX - 18, y: targetPxY + 18 },
    { x: targetPxX - 24, y: targetPxY + 24 }
  ]);

  // Угол поворота червя по вектору движения
  const [headAngle, setHeadAngle] = useState<number>(0);

  // Стадия выныривания из песка:
  // При каждом новом ходе червь уходит под песок (подземная волна песчаной ряби),
  // а затем эффектно выныривает на новой клетке!
  const [isSurfacing, setIsSurfacing] = useState<boolean>(false);
  const [isBurrowing, setIsBurrowing] = useState<boolean>(false);

  const prevCoordRef = useRef<{ x: number; y: number }>({ x, y });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevCoordRef.current;
    if (prev.x !== x || prev.y !== y) {
      const dx = x - prev.x;
      const dy = -(y - prev.y);
      const angle = Math.atan2(dy, dx);
      setHeadAngle(angle);
      prevCoordRef.current = { x, y };

      // Фаза 1: уход под песок в предыдущей точке (нырок)
      setIsBurrowing(true);
      const diveTimeout = setTimeout(() => {
        setIsBurrowing(false);
        // Фаза 2: мощное выныривание на целевой клетке с песчаным гейзером
        setIsSurfacing(true);
        const surfaceTimeout = setTimeout(() => {
          setIsSurfacing(false);
        }, 850);
        return () => clearTimeout(surfaceTimeout);
      }, 250);

      return () => clearTimeout(diveTimeout);
    }
  }, [x, y]);

  // Плавное следование тела за головой (Inverse Kinematics)
  useEffect(() => {
    let active = true;

    const updateKinematics = () => {
      setSegments(prevSegs => {
        const next = [...prevSegs];
        const head = next[0];
        const hDx = targetPxX - head.x;
        const hDy = targetPxY - head.y;
        head.x += hDx * 0.22;
        head.y += hDy * 0.22;

        const segmentDist = 12;
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

  // Состояние рта: открыт ТОЛЬКО когда червь ест звезду
  const mouthOpen = isEatingStar;

  // Видимость червя: при обычном нырке он погружается в песок,
  // при выныривании эффектно поднимается наружу
  const wormScale = isBurrowing ? 0.35 : isSurfacing ? 1.15 : 1.0;
  const wormOpacity = isBurrowing ? 0.35 : 1.0;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 25
      }}
    >
      {/* 1. Песчаный гейзер / пылевое облако выныривания из-под земли */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          overflow: 'visible'
        }}
      >
        <defs>
          <radialGradient id="sandGeyser" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#92400e" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sandTrack" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#451a03" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#451a03" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Песчаная воронка на месте выныривания */}
        <ellipse
          cx={head.x}
          cy={head.y + 4}
          rx={isSurfacing ? 34 : 20}
          ry={isSurfacing ? 24 : 12}
          fill="url(#sandGeyser)"
          style={{
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: 'blur(2px)'
          }}
        />

        {/* Подземные борозды и кольца песчаного червя */}
        {segments.slice(1).map((seg, idx) => {
          const r = Math.max(4, 13 - idx * 2.5);
          return (
            <g
              key={idx}
              style={{
                opacity: wormOpacity * (1 - idx * 0.12),
                transition: 'opacity 0.2s ease'
              }}
            >
              {/* Тень под телом */}
              <circle
                cx={seg.x}
                cy={seg.y + 2}
                r={r + 2}
                fill="url(#sandTrack)"
              />
              {/* Сегмент чешуи Шаи-Хулуда */}
              <circle
                cx={seg.x}
                cy={seg.y}
                r={r}
                fill="#4a2e1d"
                stroke="#291a10"
                strokeWidth="2.2"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))'
                }}
              />
              {/* Бронированный щиток */}
              <circle
                cx={seg.x}
                cy={seg.y}
                r={r * 0.65}
                fill="#6e4226"
              />
            </g>
          );
        })}
      </svg>

      {/* 2. Голова Песчаного Червя (выныривает из песка) */}
      <div
        style={{
          position: 'absolute',
          left: `${head.x}px`,
          top: `${head.y}px`,
          transform: `translate(-50%, -50%) rotate(${headAngle}rad) scale(${wormScale})`,
          transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease',
          opacity: wormOpacity,
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 100 100"
          style={{
            overflow: 'visible',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.9))'
          }}
        >
          {/* Внешний массивный панцирь головы червя */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="#361f12"
            stroke="#1a0e08"
            strokeWidth="5"
          />

          {/* Чешуйчатые складки вокруг пасти */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="#4d2c19"
            stroke="#26140b"
            strokeWidth="2.5"
          />

          {/* Жерло/внутренняя полость: видна широко ТОЛЬКО когда открывает рот для поедания */}
          <circle
            cx="50"
            cy="50"
            r={mouthOpen ? 30 : 12}
            fill="#0f0502"
            style={{
              transition: 'r 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          />

          {/* Трёхдольные мощные броне-челюсти червя */}
          {/* При обычном движении — челюсти сомкнуты в заостренную бронированную форму для пробивания песка! */}
          {/* При поедании звезды (mouthOpen) — челюсти резко распахиваются наружу в стороны! */}
          <g style={{ transition: 'transform 0.3s ease', transformOrigin: '50px 50px' }}>
            {/* Верхняя створка */}
            <path
              d={mouthOpen 
                ? "M 50 8 Q 36 28 42 42 Q 58 28 50 8 Z" 
                : "M 50 16 Q 42 38 50 50 Q 58 38 50 16 Z"}
              fill="#6b3a24"
              stroke="#261309"
              strokeWidth="2.5"
              style={{ transition: 'd 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            />
            {/* Левая нижняя створка */}
            <path
              d={mouthOpen 
                ? "M 14 74 Q 30 52 42 44 Q 24 64 14 74 Z" 
                : "M 22 68 Q 38 58 50 50 Q 30 52 22 68 Z"}
              fill="#6b3a24"
              stroke="#261309"
              strokeWidth="2.5"
              style={{ transition: 'd 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            />
            {/* Правая нижняя створка */}
            <path
              d={mouthOpen 
                ? "M 86 74 Q 70 52 58 44 Q 76 64 86 74 Z" 
                : "M 78 68 Q 62 58 50 50 Q 70 52 78 68 Z"}
              fill="#6b3a24"
              stroke="#261309"
              strokeWidth="2.5"
              style={{ transition: 'd 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            />
          </g>

          {/* Клыки крис-ножей: обнажаются во всей красе ТОЛЬКО когда червь раскрывает пасть */}
          {mouthOpen && (
            <g style={{ animation: 'teethGleam 0.3s ease-out' }}>
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                <polygon
                  key={`t1-${i}`}
                  points="50,18 47,28 53,28"
                  fill="#fef08a"
                  stroke="#ca8a04"
                  strokeWidth="0.8"
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
              {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg, i) => (
                <polygon
                  key={`t2-${i}`}
                  points="50,29 48,36 52,36"
                  fill="#ffffff"
                  stroke="#a1a1aa"
                  strokeWidth="0.6"
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
            </g>
          )}

          {/* Спайсовое пламя в центре пасти (вспыхивает при поедании звезды) */}
          <circle
            cx="50"
            cy="50"
            r={mouthOpen ? 16 : 4}
            fill="#f97316"
            opacity={mouthOpen ? 0.95 : 0.3}
            style={{
              transition: 'all 0.3s ease',
              filter: mouthOpen ? 'drop-shadow(0 0 10px #ea580c)' : 'none'
            }}
          />
        </svg>

        {/* 3. Анимация затягивания звезды снизу в открытую пасть */}
        {mouthOpen && (
          <div
            style={{
              position: 'absolute',
              fontSize: '1.5rem',
              animation: 'starDevour 1.0s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              zIndex: 35,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 0 14px #facc15)'
            }}
          >
            ⭐
          </div>
        )}
      </div>

      <style>{`
        @keyframes teethGleam {
          0% { opacity: 0; transform: scale(0.6); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes starDevour {
          0% {
            transform: scale(1.6) translateY(18px);
            opacity: 1;
            filter: drop-shadow(0 0 16px #facc15);
          }
          40% {
            transform: scale(1.2) translateY(6px);
            opacity: 0.95;
          }
          75% {
            transform: scale(0.6) translateY(-4px) rotate(140deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.05) translateY(-12px) rotate(240deg);
            opacity: 0;
            filter: drop-shadow(0 0 0px #000);
          }
        }
      `}</style>
    </div>
  );
};
