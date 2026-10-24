const fs = require('fs');

// Создаем 6 естественных вариантов строго в понравившемся стиле:
// Теплый песок #ba8534, мелкие золотые песчинки, редкие темные камешки и легкая песчаная волна дюны в разных местах
const svgs = [
  // 1. Волна сверху-по центру (как на (2, 0))
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ba8534"/><circle cx="26" cy="10" r="2.2" fill="#451a03" opacity="0.75"/><circle cx="24" cy="22" r="1.5" fill="#fef08a" opacity="0.95"/><circle cx="35" cy="25" r="1.8" fill="#fde047" opacity="0.9"/><circle cx="11" cy="38" r="2.2" fill="#451a03" opacity="0.75"/><circle cx="51" cy="34" r="2" fill="#291102" opacity="0.7"/><path d="M13,20 Q32,15 49,21" stroke="#78350f" stroke-width="1.8" fill="none" opacity="0.65"/></svg>',

  // 2. Волна снизу (как на (2, -1))
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ba8534"/><circle cx="10" cy="11" r="2.2" fill="#451a03" opacity="0.75"/><circle cx="50" cy="13" r="2.5" fill="#291102" opacity="0.75"/><circle cx="36" cy="17" r="1.8" fill="#78350f" opacity="0.65"/><circle cx="16" cy="38" r="1.5" fill="#fde047" opacity="0.9"/><circle cx="28" cy="41" r="2.2" fill="#451a03" opacity="0.75"/><circle cx="40" cy="47" r="1.8" fill="#fef08a" opacity="0.95"/><path d="M6,44 Q19,40 33,45" stroke="#78350f" stroke-width="1.8" fill="none" opacity="0.65"/></svg>',

  // 3. Волна по диагонали справа-налево
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ba8534"/><circle cx="15" cy="15" r="1.6" fill="#fef08a" opacity="0.95"/><circle cx="48" cy="18" r="2.4" fill="#451a03" opacity="0.75"/><circle cx="20" cy="30" r="2.2" fill="#291102" opacity="0.7"/><circle cx="38" cy="36" r="1.5" fill="#fde047" opacity="0.9"/><circle cx="52" cy="46" r="1.8" fill="#fef08a" opacity="0.9"/><circle cx="12" cy="50" r="2.2" fill="#451a03" opacity="0.7"/><path d="M18,34 Q36,28 54,35" stroke="#78350f" stroke-width="1.8" fill="none" opacity="0.65"/></svg>',

  // 4. Две легкие мягкие дуги волн + рассыпанные песчинки
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ba8534"/><circle cx="20" cy="12" r="1.8" fill="#fde047" opacity="0.9"/><circle cx="45" cy="14" r="2.2" fill="#451a03" opacity="0.75"/><circle cx="14" cy="32" r="2.2" fill="#291102" opacity="0.7"/><circle cx="32" cy="38" r="1.6" fill="#fef08a" opacity="0.95"/><circle cx="48" cy="44" r="2" fill="#451a03" opacity="0.7"/><path d="M8,24 Q24,19 40,25" stroke="#78350f" stroke-width="1.7" fill="none" opacity="0.6"/><path d="M22,48 Q38,43 54,49" stroke="#78350f" stroke-width="1.7" fill="none" opacity="0.6"/></svg>',

  // 5. Волна в центре с песчинками вокруг
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ba8534"/><circle cx="12" cy="14" r="2.2" fill="#451a03" opacity="0.75"/><circle cx="38" cy="12" r="1.6" fill="#fef08a" opacity="0.95"/><circle cx="52" cy="26" r="2.4" fill="#291102" opacity="0.7"/><circle cx="22" cy="40" r="1.8" fill="#fde047" opacity="0.9"/><circle cx="44" cy="48" r="2" fill="#451a03" opacity="0.7"/><path d="M10,30 Q30,24 50,31" stroke="#78350f" stroke-width="1.8" fill="none" opacity="0.65"/></svg>',

  // 6. Волна справа внизу + золотые песчинки
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ba8534"/><circle cx="25" cy="15" r="2.4" fill="#451a03" opacity="0.75"/><circle cx="42" cy="18" r="1.6" fill="#fef08a" opacity="0.95"/><circle cx="14" cy="28" r="1.8" fill="#fde047" opacity="0.9"/><circle cx="52" cy="38" r="2.2" fill="#291102" opacity="0.7"/><circle cx="18" cy="48" r="2" fill="#451a03" opacity="0.75"/><path d="M20,44 Q36,38 52,45" stroke="#78350f" stroke-width="1.8" fill="none" opacity="0.65"/></svg>'
];

const b64 = svgs.map(s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64'));

const fileContent = `// client/src/config/sandTextures.ts
// 6 аккуратных процедурных текстур песка (в едином минималистичном стиле: дюна + песчинки)

export const SAND_PATTERNS: string[] = ${JSON.stringify(b64, null, 2)};

export function getSandTextureForCoord(x: number, y: number): string {
  let h = (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  const index = Math.abs(h ^ (h >> 16)) % SAND_PATTERNS.length;
  return SAND_PATTERNS[index];
}
`;

fs.writeFileSync('C:/Users/dikan/projects/windows-infinity-verse/client/src/config/sandTextures.ts', fileContent, 'utf8');
console.log('sandTextures.ts successfully updated with 6 matching dune-style textures!');
