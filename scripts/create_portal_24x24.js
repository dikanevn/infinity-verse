// scripts/create_portal_24x24.js
const fs = require('fs');
const path = require('path');

const pixelTexturesPath = path.resolve(__dirname, '..', 'client', 'src', 'config', 'pixelTextures.ts');
let code = fs.readFileSync(pixelTexturesPath, 'utf8');

const portal24x24Code = `
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
`;

// Заменяем PORTAL_PIXELS_8X8 так, чтобы он ссылался на PORTAL_PIXELS_24X24
code = code.replace(
  /\/\/ 4\. Портал Врат Мультивселенной \(8x8 воронка\)[\s\S]*?export const PORTAL_PIXELS_8X8: PixelMatrix = {[\s\S]*?};/,
  `${portal24x24Code}\nexport const PORTAL_PIXELS_8X8: PixelMatrix = PORTAL_PIXELS_24X24;`
);

fs.writeFileSync(pixelTexturesPath, code, 'utf8');
console.log('Updated pixelTextures.ts with 24x24 portal');
