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
 * Единая чистая текстура песка: ровная бархатная россыпь золотых песчинок
 * без диагональных полос, гребней и волновых линий.
 */
function createUniformSandMatrix(size: number): PixelMatrix {
  const palette = [
    '#b58941', // 0: Базовый золотой песок (основной фон)
    '#be9047', // 1: Мягкий светлый полутон
    '#ab7f3b', // 2: Мягкий теплый полутон
    '#9e7434', // 3: Темная песчинка кремния
    '#facc15'  // 4: Сверкающая крупинка кварца
  ];

  const data: number[] = new Array(size * size).fill(0);

  // Фиксированный LCG псевдорандом для красивой и равномерной россыпи
  let s = 133742;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // Россыпь естественного шума по всей клетке
  for (let i = 0; i < size * size; i++) {
    const r = rnd();
    if (r < 0.60) {
      data[i] = 0; // Базовый песок (60%)
    } else if (r < 0.78) {
      data[i] = 1; // Светлая песчинка (18%)
    } else if (r < 0.93) {
      data[i] = 2; // Теплая песчинка (15%)
    } else if (r < 0.975) {
      data[i] = 3; // Темная крупинка кремния (4.5%)
    } else {
      data[i] = 4; // Сверкающая крупинка кварца (2.5%)
    }
  }

  return {
    width: size,
    height: size,
    palette,
    data
  };
}

// 1. Песок (единая 24x24 матрица россыпи)
export const SAND_PIXELS_24X24: PixelMatrix = createUniformSandMatrix(24);
// Алиас для обратной совместимости
export const SAND_PIXELS_8X8 = SAND_PIXELS_24X24;

/**
 * 2. Фиолетовая квантовая субстанция (бывший объект Звезда / $INFER) в разрешении 24x24.
 * Круглое разреженное полупрозрачное облачко квантового тумана с мерцающими микро-сгустками.
 */
export const STAR_PIXELS_24X24: PixelMatrix = (() => {
  const width = 24;
  const height = 24;
  const palette = [
    'transparent', // 0
    '#3b0764',     // 1: Глубокая фиолетовая вуаль
    '#581c87',     // 2: Разреженное облачко
    '#7e22ce',     // 3: Пурпурный газовый слой
    '#a855f7',     // 4: Яркий фиолетовый сгусток
    '#c084fc',     // 5: Светящийся эфирный пар
    '#e9d5ff',     // 6: Блик квантовой флуктуации
    '#ffffff'      // 7: Центр мерцания
  ];

  const data: number[] = new Array(width * height).fill(0);
  const centerX = 11.5;
  const centerY = 11.5;

  // Псевдослучайный генератор на базе seed для мягкой разреженности облака
  let s = 987654321;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const maxRadius = 10.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxRadius) continue;

      // Нормализованное расстояние от 0 (центр) до 1 (край облака)
      const normDist = dist / maxRadius;
      
      // Разреженность: вероятность появления пикселя падает к краю круга
      const density = Math.pow(1 - normDist, 1.25);
      const r = rnd();

      // Если случайная величина больше плотности — оставляем пустоту (прозрачность, разреженность)
      if (r > density * 1.05 && dist > 2.5) {
        continue;
      }

      // Назначаем цвет облачка в зависимости от близости к центру и случайных флуктуаций
      const noise = (rnd() - 0.5) * 0.35;
      const val = Math.max(0, Math.min(1, (1 - normDist) + noise));

      if (val > 0.88) {
        data[y * width + x] = 7; // Белый центр мерцания
      } else if (val > 0.72) {
        data[y * width + x] = 6; // Светло-лавандовый блик
      } else if (val > 0.54) {
        data[y * width + x] = 5; // Светящийся эфир
      } else if (val > 0.38) {
        data[y * width + x] = 4; // Фиолетовый сгусток
      } else if (val > 0.22) {
        data[y * width + x] = 3; // Пурпурный газ
      } else if (val > 0.10) {
        data[y * width + x] = 2; // Разреженная дымка
      } else {
        data[y * width + x] = 1; // Краевая вуаль
      }
    }
  }

  // Несколько разреженных одиночных квантовых пылинок вокруг облачка
  const outerSparks = [
    { x: 3, y: 11, c: 2 }, { x: 20, y: 12, c: 2 },
    { x: 11, y: 3, c: 3 }, { x: 12, y: 20, c: 2 },
    { x: 5, y: 6, c: 3 },  { x: 18, y: 6, c: 3 },
    { x: 5, y: 17, c: 2 }, { x: 18, y: 17, c: 3 }
  ];
  for (const p of outerSparks) {
    if (data[p.y * width + p.x] === 0) {
      data[p.y * width + p.x] = p.c;
    }
  }

  return {
    width,
    height,
    palette,
    data
  };
})();

// Алиас для обратной совместимости
export const STAR_PIXELS_8X8 = STAR_PIXELS_24X24;

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


/**
 * Портал Врат Мультивселенной (24x24 пикселя):
 * Детализированная круглая квантовая воронка с фиолетово-пурпурным свечением,
 * вихревыми спиральными рукавами, глубоким сингулярным центром и неоновыми искрами.
 * Одинаковое разрешение с песком, роботом и субстанцией!
 */
export const PORTAL_PIXELS_24X24: PixelMatrix = (() => {
  const width = 24;
  const height = 24;
  const palette = [
    'transparent', // 0
    '#f5d0fe',     // 1: Сверкающие белые/светло-розовые искры горизонта событий
    '#e879f9',     // 2: Яркий неоновый фуксия / пурпурный свет
    '#c084fc',     // 3: Светло-фиолетовый вихревой рукав
    '#a855f7',     // 4: Насыщенный фиолетовый эфир
    '#7e22ce',     // 5: Глубокий фиолетовый тон
    '#3b0764',     // 6: Темная бездна портала
    '#0f051d',     // 7: Центральная черная дыра сингулярности
    '#38bdf8'      // 8: Квантовые аква-всполохи (мост между мирами)
  ];

  const data: number[] = new Array(width * height).fill(0);
  const cx = 11.5;
  const cy = 11.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Внешний радиус воронки портала: 11 пикселей (круг вписывается в 24x24)
      if (dist > 11.2) {
        data[y * width + x] = 0;
        continue;
      }

      // Угол для создания спиральных вихревых рукавов
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;

      // Спиральный сдвиг фазы вихря (3 рукава)
      const spiral = (angle + dist * 0.7) % (Math.PI * 2);
      const wave = Math.sin(spiral * 3);

      if (dist < 2.2) {
        // Черная дыра сингулярности в самом центре
        data[y * width + x] = 7;
      } else if (dist < 4.2) {
        // Горизонт событий вокруг сингулярности с аква-всполохами
        data[y * width + x] = (x + y) % 3 === 0 ? 8 : 6;
      } else if (dist < 7.0) {
        // Внутренний вращающийся вихрь
        if (wave > 0.4) {
          data[y * width + x] = 2; // Яркая фуксия
        } else if (wave > -0.2) {
          data[y * width + x] = 4; // Пурпурный
        } else {
          data[y * width + x] = 5; // Темно-фиолетовый
        }
      } else if (dist < 9.5) {
        // Внешнее кольцо воронки
        if (wave > 0.3) {
          data[y * width + x] = 3; // Светло-фиолетовый
        } else if (wave < -0.4) {
          data[y * width + x] = (x * 7 + y * 13) % 5 === 0 ? 8 : 5;
        } else {
          data[y * width + x] = 4;
        }
      } else {
        // Краевое рассеяние эфира и искры
        if (wave > 0.5) {
          data[y * width + x] = 1; // Сверкающая искра
        } else if (wave > 0) {
          data[y * width + x] = 3;
        } else if ((x + y) % 2 === 0) {
          data[y * width + x] = 4;
        } else {
          data[y * width + x] = 0;
        }
      }
    }
  }

  return { width, height, palette, data };
})();

export const PORTAL_PIXELS_8X8: PixelMatrix = PORTAL_PIXELS_24X24;

/**
 * 5. Игрок: Детализированный Робот-Первооткрыватель (24x24 пикселя)
 */
export const PLAYER_PIXELS_24X24: PixelMatrix = (() => {
  const width = 24;
  const height = 24;
  const palette = [
    'transparent', // 0
    '#0b1220',     // 1: Глубокий темный контур (сталь)
    '#64748b',     // 2: Базовая серая титановая броня
    '#94a3b8',     // 3: Светлый титан
    '#e2e8f0',     // 4: Хромированный зеркальный блик
    '#38bdf8',     // 5: Неоновый голубой визор / сенсоры
    '#0284c7',     // 6: Тень визора
    '#f59e0b',     // 7: Энергетическое ядро / реактор
    '#fbbf24',     // 8: Яркая плазма реактора
    '#ef4444'      // 9: Аварийный маячок / антенна
  ];

  const data: number[] = new Array(width * height).fill(0);

  const setPixel = (x: number, y: number, color: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      data[y * width + x] = color;
    }
  };

  const fillRect = (x1: number, y1: number, w: number, h: number, color: number) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPixel(x1 + dx, y1 + dy, color);
      }
    }
  };

  // --- 1. Антенна со сферическим маячком на макушке (Y = 1 .. 4) ---
  fillRect(11, 1, 2, 2, 9);
  fillRect(11, 3, 2, 2, 1);

  // --- 2. Голова робота (Y = 5 .. 10, X = 7 .. 16) ---
  fillRect(7, 5, 10, 6, 1);
  fillRect(8, 6, 8, 4, 3);
  fillRect(8, 6, 2, 4, 4);
  fillRect(9, 7, 6, 2, 6);
  fillRect(10, 7, 5, 2, 5);
  fillRect(13, 7, 1, 2, 4);

  // --- 3. Шея / шарнир (Y = 11, X = 10 .. 13) ---
  fillRect(10, 11, 4, 1, 1);

  // --- 4. Плечи и корпус (Y = 12 .. 17, X = 5 .. 18) ---
  fillRect(5, 12, 14, 6, 1);
  fillRect(6, 13, 12, 4, 2);
  fillRect(6, 13, 3, 4, 4);
  fillRect(15, 13, 2, 4, 3);
  fillRect(10, 13, 4, 3, 7);
  fillRect(11, 14, 2, 1, 8);

  // --- 5. Руки-манипуляторы (Y = 14 .. 18, X = 4..5 и X = 18..19) ---
  fillRect(4, 14, 2, 4, 1);
  fillRect(4, 15, 1, 3, 3);
  fillRect(18, 14, 2, 4, 1);
  fillRect(19, 15, 1, 3, 3);

  // --- 6. Пояс / силовой привод (Y = 18, X = 7 .. 16) ---
  fillRect(7, 18, 10, 1, 1);
  fillRect(9, 18, 6, 1, 3);

  // --- 7. Ноги / сервоопоры (Y = 19 .. 22) ---
  fillRect(7, 19, 4, 3, 1);
  fillRect(8, 19, 2, 2, 3);
  fillRect(8, 19, 1, 2, 4);
  fillRect(13, 19, 4, 3, 1);
  fillRect(14, 19, 2, 2, 3);
  fillRect(14, 19, 1, 2, 4);

  // --- 8. Гусеничные / магнитные стопы (Y = 22 .. 23) ---
  fillRect(6, 22, 5, 2, 1);
  fillRect(7, 22, 4, 1, 4);
  fillRect(13, 22, 5, 2, 1);
  fillRect(13, 22, 4, 1, 4);

  return {
    width,
    height,
    palette,
    data
  };
})();

// Алиас для обратной совместимости
export const PLAYER_PIXELS_8X8 = PLAYER_PIXELS_24X24;
