// client/src/config/sandTextures.ts
// 6 процедурных процедурно-генерируемых текстур песка (SVG Data URI)
// Высокооптимизированные векторные паттерны: нулевой вес, идеальная четкость на экранах Retina/OLED.

export const SAND_PATTERNS: string[] = [
  // 1. Дюны с мягкими волнами ветра
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="%23b47e2c"/><path d="M0,15 Q15,8 30,16 T62,12 M0,35 Q20,28 40,36 T62,32 M0,52 Q18,46 38,54 T62,50" stroke="%238a5b15" stroke-width="1.2" fill="none" opacity="0.45"/><circle cx="12" cy="24" r="1" fill="%23fde047" opacity="0.6"/><circle cx="48" cy="42" r="1.2" fill="%23713f12" opacity="0.5"/><circle cx="34" cy="18" r="0.8" fill="%23fef08a" opacity="0.7"/></svg>`,

  // 2. Песок с мелкой каменной крошкой и гравием
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="%23a87426"/><circle cx="8" cy="12" r="1.5" fill="%235c360a" opacity="0.7"/><circle cx="52" cy="18" r="2" fill="%23452205" opacity="0.6"/><circle cx="28" cy="45" r="1.8" fill="%235c360a" opacity="0.7"/><circle cx="42" cy="52" r="1" fill="%23fef08a" opacity="0.8"/><circle cx="16" cy="38" r="0.8" fill="%23fde047" opacity="0.7"/><circle cx="38" cy="22" r="1.2" fill="%2378350f" opacity="0.5"/><path d="M5,48 Q18,44 32,49" stroke="%23713f12" stroke-width="1" fill="none" opacity="0.35"/></svg>`,

  // 3. Ребристые дюны со светотенью
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="%23b88230"/><path d="M-5,10 Q15,18 35,8 T68,14" stroke="%23fde047" stroke-width="1.4" fill="none" opacity="0.4"/><path d="M-5,12 Q15,20 35,10 T68,16" stroke="%2378350f" stroke-width="1.2" fill="none" opacity="0.5"/><path d="M-5,42 Q20,50 42,38 T68,44" stroke="%23fde047" stroke-width="1.4" fill="none" opacity="0.35"/><path d="M-5,44 Q20,52 42,40 T68,46" stroke="%2378350f" stroke-width="1.2" fill="none" opacity="0.45"/><circle cx="22" cy="28" r="1" fill="%23fef08a" opacity="0.5"/></svg>`,

  // 4. Золотистая текстура с мелкими песчинками
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="%23ba8534"/><circle cx="14" cy="8" r="1" fill="%23fef08a" opacity="0.8"/><circle cx="26" cy="19" r="1.2" fill="%2378350f" opacity="0.6"/><circle cx="48" cy="12" r="0.8" fill="%23fde047" opacity="0.7"/><circle cx="10" cy="50" r="1.4" fill="%2378350f" opacity="0.5"/><circle cx="36" cy="38" r="1" fill="%23fef08a" opacity="0.8"/><circle cx="54" cy="46" r="1.2" fill="%235c360a" opacity="0.6"/><circle cx="24" cy="32" r="0.8" fill="%23fde047" opacity="0.7"/><path d="M12,28 Q28,24 45,30" stroke="%23854d0e" stroke-width="0.8" fill="none" opacity="0.4"/></svg>`,

  // 5. Спокойный песчаный бархан с диагональным рельефом
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="%23ae7a29"/><path d="M0,0 L62,62 M-10,25 L45,80 M20,-10 L75,45" stroke="%23854d0e" stroke-width="1" fill="none" opacity="0.3"/><path d="M1,0 L63,62 M-9,25 L46,80 M21,-10 L76,45" stroke="%23fef08a" stroke-width="0.8" fill="none" opacity="0.25"/><circle cx="45" cy="20" r="1.2" fill="%235c360a" opacity="0.6"/><circle cx="20" cy="48" r="1" fill="%23fde047" opacity="0.7"/></svg>`,

  // 6. Микро-кратер / песчаная воронка
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="%23b07c2b"/><ellipse cx="32" cy="30" rx="9" ry="5" fill="%236b3f07" opacity="0.5"/><ellipse cx="32" cy="29" rx="7" ry="4" fill="%23452205" opacity="0.4"/><path d="M15,31 Q32,38 49,31" stroke="%23fef08a" stroke-width="1" fill="none" opacity="0.4"/><circle cx="12" cy="14" r="1" fill="%23fde047" opacity="0.7"/><circle cx="50" cy="48" r="1.3" fill="%2378350f" opacity="0.6"/></svg>`
];

/**
 * Детерминированный математический псевдорандом от координат (X, Y).
 * Для одной и той же точки на карте узор ВСЕГДА будет один и тот же.
 * При движении игрока координаты на сетке меняются — и земля визуально сдвигается!
 */
export function getSandTextureForCoord(x: number, y: number): string {
  // Псевдо-хэш алгоритм на простых числах (Murmur-like)
  let h = (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  const index = Math.abs(h ^ (h >> 16)) % SAND_PATTERNS.length;
  return SAND_PATTERNS[index];
}
