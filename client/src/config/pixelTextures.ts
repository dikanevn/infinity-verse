// client/src/config/pixelTextures.ts
// Дискретные пиксельные матрицы для идеального бесконечного зума

export interface PixelMatrix {
  width: number;
  height: number;
  // Палитра цветов (индексы от 0 до N)
  palette: string[];
  // Сетка пикселей row by row
  data: number[];
}

/**
 * Процедурный генератор детализированной матрицы песка (24x24 или 32x32)
 * с мягкими микро-дюнами, перепадами золотого оттенка и отдельными крупинками кварца и кремния.
 */
function createSandMatrix(size: number, seed: number): PixelMatrix {
  const palette = [
    '#b58941', // 0: Базовый золотистый песок
    '#c49649', // 1: Светло-золотая дюна
    '#a87d37', // 2: Мягкая тень бархана
    '#946c2c', // 3: Глубокая тень бархана
    '#78531e', // 4: Темная крупинка кремния
    '#facc15', // 5: Яркая песчинка кварца (блик)
    '#d4a355'  // 6: Теплый полутон
  ];

  const data: number[] = new Array(size * size).fill(0);

  // Псевдослучайный генератор на базе seed
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // 1. Создаем плавные волнообразные микро-дюны по синусоиде
  const waveAngle = 0.45;
  const freq = 0.28;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x * Math.cos(waveAngle) + y * Math.sin(waveAngle);
      const wave = Math.sin(u * freq + seed);
      
      let colorIdx = 0;
      if (wave > 0.55) {
        colorIdx = 1; // Гребень
      } else if (wave > 0.2) {
        colorIdx = 6; // Полутон
      } else if (wave < -0.55) {
        colorIdx = 3; // Ложбина
      } else if (wave < -0.2) {
        colorIdx = 2; // Тень
      }
      data[y * size + x] = colorIdx;
    }
  }

  // 2. Добавляем дискретные песчинки кварца и кремния
  const grainCount = Math.floor(size * size * 0.08); // 8% поверхности
  for (let i = 0; i < grainCount; i++) {
    const gx = Math.floor(rnd() * size);
    const gy = Math.floor(rnd() * size);
    const idx = gy * size + gx;
    const type = rnd();
    if (type < 0.35) {
      data[idx] = 5; // Сверкающий кварц
    } else if (type < 0.70) {
      data[idx] = 4; // Кремний
    } else {
      data[idx] = 1; // Светлая точка
    }
  }

  return {
    width: size,
    height: size,
    palette,
    data
  };
}

// 1. Песок (детализированная 24x24 пиксельная сетка — в 3 раза плотнее 8x8)
export const SAND_PIXELS_24X24: PixelMatrix = createSandMatrix(24, 42);
// Алиас для обратной совместимости
export const SAND_PIXELS_8X8 = SAND_PIXELS_24X24;

// 2. Звезда ($INFER 8x8 пиксельный спрайт)
export const STAR_PIXELS_8X8: PixelMatrix = {
  width: 8,
  height: 8,
  palette: [
    'transparent', // 0
    '#fef08a',     // 1: Яркий центр
    '#facc15',     // 2: Золотое тело звезды
    '#ca8a04',     // 3: Контур
    '#ffffff'      // 4: Блик
  ],
  data: [
    0, 0, 0, 4, 1, 0, 0, 0,
    0, 0, 3, 1, 1, 3, 0, 0,
    3, 3, 2, 1, 1, 2, 3, 3,
    0, 3, 2, 1, 1, 2, 3, 0,
    0, 0, 3, 2, 2, 3, 0, 0,
    0, 3, 2, 3, 3, 2, 3, 0,
    0, 3, 2, 0, 0, 2, 3, 0,
    0, 0, 3, 0, 0, 3, 0, 0
  ]
};

// 3. Обелиск (Монолит 8x8)
export const OBELISK_PIXELS_8X8: PixelMatrix = {
  width: 8,
  height: 8,
  palette: [
    'transparent', // 0
    '#38bdf8',     // 1: Неоновый кристалл
    '#1e293b',     // 2: Темный камень
    '#0f172a',     // 3: Теневая сторона
    '#64748b'      // 4: Светлый срез
  ],
  data: [
    0, 0, 0, 1, 1, 0, 0, 0,
    0, 0, 4, 1, 1, 3, 0, 0,
    0, 0, 4, 2, 2, 3, 0, 0,
    0, 0, 4, 2, 2, 3, 0, 0,
    0, 0, 4, 2, 2, 3, 0, 0,
    0, 4, 2, 2, 2, 2, 3, 0,
    0, 4, 2, 2, 2, 2, 3, 0,
    4, 2, 2, 2, 2, 2, 2, 3
  ]
};

// 4. Портал Врат Мультивселенной (8x8 воронка)
export const PORTAL_PIXELS_8X8: PixelMatrix = {
  width: 8,
  height: 8,
  palette: [
    'transparent', // 0
    '#c084fc',     // 1: Фиолетовое кольцо
    '#a855f7',     // 2: Пурпурный горизонт
    '#3b0764',     // 3: Глубокая бездна
    '#38bdf8'      // 4: Искры
  ],
  data: [
    0, 0, 1, 2, 2, 1, 0, 0,
    0, 1, 2, 3, 3, 2, 4, 0,
    1, 2, 3, 4, 3, 3, 2, 1,
    2, 3, 3, 3, 4, 3, 3, 2,
    2, 3, 4, 3, 3, 3, 3, 2,
    1, 2, 3, 3, 4, 3, 2, 1,
    0, 4, 2, 3, 3, 2, 1, 0,
    0, 0, 1, 2, 2, 1, 0, 0
  ]
};

// 5. Игрок (Символ Первооткрывателя 8x8)
export const PLAYER_PIXELS_8X8: PixelMatrix = {
  width: 8,
  height: 8,
  palette: [
    'transparent', // 0
    '#38bdf8',     // 1: Неоновый шлем / визор
    '#e2e8f0',     // 2: Скафандр
    '#0284c7',     // 3: Контур
    '#f59e0b'      // 4: Энергетический ранец
  ],
  data: [
    0, 0, 3, 1, 1, 3, 0, 0,
    0, 3, 1, 1, 1, 1, 3, 0,
    0, 3, 2, 2, 2, 2, 3, 0,
    3, 4, 2, 2, 2, 2, 4, 3,
    3, 4, 2, 2, 2, 2, 4, 3,
    0, 3, 2, 2, 2, 2, 3, 0,
    0, 0, 3, 0, 0, 3, 0, 0,
    0, 3, 3, 0, 0, 3, 3, 0
  ]
};
