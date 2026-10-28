// client/src/config/sandTextures.ts
// Единая пиксельная текстура песка россыпью (24x24) на все клетки мира

import { SAND_PIXELS_24X24, type PixelMatrix } from './pixelTextures';

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

// Единый data-uri паттерн для всех клеток песка
export const UNIFORM_SAND_PATTERN: string = pixelMatrixToSvgUri(SAND_PIXELS_24X24);
export const SAND_PATTERNS: string[] = [UNIFORM_SAND_PATTERN];

/**
 * Возвращает единую чистую пиксельную россыпь песка для всех клеток
 */
export function getSandTextureForCoord(_x: number, _y: number): string {
  return UNIFORM_SAND_PATTERN;
}
