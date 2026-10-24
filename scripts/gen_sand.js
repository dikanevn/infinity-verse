const fs = require('fs');

const svgs = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#b47e2c"/><path d="M0,15 Q15,8 30,16 T62,12 M0,35 Q20,28 40,36 T62,32 M0,52 Q18,46 38,54 T62,50" stroke="#78350f" stroke-width="2" fill="none" opacity="0.6"/><circle cx="12" cy="24" r="2" fill="#fde047" opacity="0.8"/><circle cx="48" cy="42" r="2.5" fill="#451a03" opacity="0.7"/><circle cx="34" cy="18" r="1.5" fill="#fef08a" opacity="0.9"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#a87426"/><circle cx="8" cy="12" r="2.5" fill="#451a03" opacity="0.8"/><circle cx="52" cy="18" r="3" fill="#291102" opacity="0.8"/><circle cx="28" cy="45" r="2.5" fill="#451a03" opacity="0.8"/><circle cx="42" cy="52" r="2" fill="#fef08a" opacity="0.9"/><circle cx="16" cy="38" r="1.5" fill="#fde047" opacity="0.8"/><circle cx="38" cy="22" r="2" fill="#78350f" opacity="0.7"/><path d="M5,48 Q18,44 32,49" stroke="#451a03" stroke-width="2" fill="none" opacity="0.6"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#b88230"/><path d="M-5,10 Q15,18 35,8 T68,14" stroke="#fde047" stroke-width="2.5" fill="none" opacity="0.7"/><path d="M-5,12 Q15,20 35,10 T68,16" stroke="#451a03" stroke-width="2.2" fill="none" opacity="0.7"/><path d="M-5,42 Q20,50 42,38 T68,44" stroke="#fde047" stroke-width="2.5" fill="none" opacity="0.6"/><path d="M-5,44 Q20,52 42,40 T68,46" stroke="#451a03" stroke-width="2.2" fill="none" opacity="0.7"/><circle cx="22" cy="28" r="2" fill="#fef08a" opacity="0.8"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ba8534"/><circle cx="14" cy="8" r="2" fill="#fef08a" opacity="0.9"/><circle cx="26" cy="19" r="2.5" fill="#451a03" opacity="0.7"/><circle cx="48" cy="12" r="1.5" fill="#fde047" opacity="0.9"/><circle cx="10" cy="50" r="2.5" fill="#451a03" opacity="0.8"/><circle cx="36" cy="38" r="2" fill="#fef08a" opacity="0.9"/><circle cx="54" cy="46" r="2.5" fill="#291102" opacity="0.8"/><circle cx="24" cy="32" r="1.5" fill="#fde047" opacity="0.8"/><path d="M12,28 Q28,24 45,30" stroke="#78350f" stroke-width="1.8" fill="none" opacity="0.6"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#ae7a29"/><path d="M0,0 L62,62 M-10,25 L45,80 M20,-10 L75,45" stroke="#451a03" stroke-width="1.8" fill="none" opacity="0.5"/><path d="M1,0 L63,62 M-9,25 L46,80 M21,-10 L76,45" stroke="#fef08a" stroke-width="1.5" fill="none" opacity="0.5"/><circle cx="45" cy="20" r="2.5" fill="#291102" opacity="0.8"/><circle cx="20" cy="48" r="2" fill="#fde047" opacity="0.9"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" fill="#b07c2b"/><ellipse cx="32" cy="30" rx="12" ry="7" fill="#451a03" opacity="0.7"/><ellipse cx="32" cy="29" rx="8" ry="4" fill="#1e0b02" opacity="0.6"/><path d="M14,31 Q32,40 50,31" stroke="#fef08a" stroke-width="1.8" fill="none" opacity="0.6"/><circle cx="12" cy="14" r="2" fill="#fde047" opacity="0.9"/><circle cx="50" cy="48" r="2.5" fill="#291102" opacity="0.8"/></svg>'
];

const b64 = svgs.map(s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64'));

const fileContent = `// client/src/config/sandTextures.ts
// 6 контрастных процедурных текстур песка (Base64 SVG Data URI)

export const SAND_PATTERNS: string[] = ${JSON.stringify(b64, null, 2)};

export function getSandTextureForCoord(x: number, y: number): string {
  let h = (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  const index = Math.abs(h ^ (h >> 16)) % SAND_PATTERNS.length;
  return SAND_PATTERNS[index];
}
`;

fs.writeFileSync('C:/Users/dikan/projects/windows-infinity-verse/client/src/config/sandTextures.ts', fileContent, 'utf8');
console.log('sandTextures.ts updated with high-contrast Base64 patterns!');
