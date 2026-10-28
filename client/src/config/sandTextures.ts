// client/src/config/sandTextures.ts
// Дискретные 8x8 пиксельные текстуры песка (чистый пиксель-арт без сглаживания)

import { SAND_PIXELS_8X8, type PixelMatrix } from './pixelTextures';

/**
 * Вариации 8x8 пиксельных матриц песка для процедурного разнообразия тайлов.
 */
export const SAND_PIXEL_VARIANTS: PixelMatrix[] = [
  SAND_PIXELS_8X8,
  {
    width: 8,
    height: 8,
    palette: SAND_PIXELS_8X8.palette,
    data: [
      1, 0, 0, 0, 2, 3, 2, 0,
      0, 0, 1, 0, 0, 2, 0, 0,
      0, 2, 2, 0, 0, 0, 1, 4,
      2, 3, 2, 1, 0, 0, 0, 1,
      0, 2, 0, 4, 1, 0, 0, 0,
      0, 0, 0, 1, 0, 2, 2, 0,
      0, 1, 0, 0, 2, 3, 2, 0,
      0, 0, 0, 0, 0, 2, 0, 0
    ]
  },
  {
    width: 8,
    height: 8,
    palette: SAND_PIXELS_8X8.palette,
    data: [
      0, 0, 2, 3, 2, 0, 0, 1,
      0, 0, 0, 2, 0, 1, 4, 1,
      0, 1, 0, 0, 0, 0, 1, 0,
      1, 4, 1, 0, 2, 2, 0, 0,
      0, 1, 0, 2, 3, 2, 0, 0,
      0, 0, 0, 0, 2, 0, 0, 1,
      2, 2, 0, 0, 0, 0, 0, 0,
      3, 2, 0, 1, 0, 2, 2, 0
    ]
  },
  {
    width: 8,
    height: 8,
    palette: SAND_PIXELS_8X8.palette,
    data: [
      0, 1, 0, 0, 0, 1, 0, 0,
      2, 2, 0, 0, 1, 4, 1, 0,
      3, 2, 0, 0, 0, 1, 0, 2,
      0, 0, 0, 2, 2, 0, 2, 3,
      0, 0, 2, 3, 2, 0, 0, 2,
      0, 1, 0, 2, 0, 0, 0, 0,
      1, 4, 1, 0, 0, 0, 1, 0,
      0, 1, 0, 0, 0, 0, 0, 0
    ]
  }
];

/**
 * Конвертирует PixelMatrix в пиксельный data-uri SVG с crispedge rect-пикселями
 */
export function pixelMatrixToSvgUri(matrix: PixelMatrix): string {
  let rects = '';
  for (let r = 0; r < matrix.height; r++) {
    for (let c = 0; c < matrix.width; c++) {
      const colorIdx = matrix.data[r * matrix.width + c];
      const color = matrix.palette[colorIdx];
      if (!color || color === 'transparent') continue;
      rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="${color}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${matrix.width} ${matrix.height}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Предварительно сгенерированные data-uri текстуры песка
export const SAND_PATTERNS: string[] = SAND_PIXEL_VARIANTS.map(pixelMatrixToSvgUri);

/**
 * Вычисляет псевдослучайную 8x8 пиксельную текстуру песка по координатам клетки
 */
export function getSandTextureForCoord(x: number, y: number): string {
  let h = (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  const index = Math.abs(h ^ (h >> 16)) % SAND_PATTERNS.length;
  return SAND_PATTERNS[index];
}
