// client/src/config/sandTextures.ts
// Дискретные пиксельные текстуры песка повышенной детализации (24x24, в 3 раза мельче пиксели)

import { SAND_PIXELS_24X24, type PixelMatrix } from './pixelTextures';

/**
 * Вариации 24x24 пиксельных матриц песка для процедурного разнообразия тайлов.
 */
function generateVariations(base: PixelMatrix, count: number): PixelMatrix[] {
  const list: PixelMatrix[] = [base];
  const size = base.width;

  for (let v = 1; v < count; v++) {
    const data = [...base.data];
    // Сдвиг узора дюн и вариация крупиц
    const shift = (v * 7) % size;
    const shiftedData = new Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x + shift) % size;
        const ny = (y + (v * 5)) % size;
        shiftedData[ny * size + nx] = data[y * size + x];
      }
    }
    list.push({
      width: size,
      height: size,
      palette: base.palette,
      data: shiftedData
    });
  }
  return list;
}

export const SAND_PIXEL_VARIANTS: PixelMatrix[] = generateVariations(SAND_PIXELS_24X24, 6);

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

// Предварительно сгенерированные data-uri текстуры песка 24x24
export const SAND_PATTERNS: string[] = SAND_PIXEL_VARIANTS.map(pixelMatrixToSvgUri);

/**
 * Вычисляет псевдослучайную пиксельную текстуру песка по координатам клетки
 */
export function getSandTextureForCoord(x: number, y: number): string {
  let h = (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  const index = Math.abs(h ^ (h >> 16)) % SAND_PATTERNS.length;
  return SAND_PATTERNS[index];
}
