// scripts/replace_portal_emojis.js
const fs = require('fs');
const path = require('path');

// 1. App.tsx
const appPath = path.resolve(__dirname, '..', 'client', 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Добавим импорт иконки портала
if (!appCode.includes('PORTAL_PIXELS_8X8')) {
  appCode = appCode.replace(
    "import { pixelMatrixToSvgUri } from './config/sandTextures';",
    "import { pixelMatrixToSvgUri } from './config/sandTextures';\nimport { PORTAL_PIXELS_8X8 } from './config/pixelTextures';"
  );
  appCode = appCode.replace(
    "export function App() {",
    "const PORTAL_ICON_URI = pixelMatrixToSvgUri(PORTAL_PIXELS_8X8);\n\nexport function App() {"
  );
}

// Заменим 🌀 в кнопках App.tsx на пиксельную иконку
appCode = appCode.replace(
  `                  <span>🌀</span>\n                  <span>ИНСПЕКТОР ВРАТ (ID #{portalId})</span>`,
  `                  <img src={PORTAL_ICON_URI} alt="Портал" style={{ width: '18px', height: '18px', imageRendering: 'pixelated' }} />\n                  <span>ИНСПЕКТОР ВРАТ (ID #{portalId})</span>`
);

appCode = appCode.replace(
  `                <span>🌀</span>\n                <span>Поставить портал справа от себя на ({player.x + 1}, {player.y})</span>`,
  `                <img src={PORTAL_ICON_URI} alt="Портал" style={{ width: '18px', height: '18px', imageRendering: 'pixelated' }} />\n                <span>Поставить портал справа от себя на ({player.x + 1}, {player.y})</span>`
);

fs.writeFileSync(appPath, appCode, 'utf8');

// 2. PortalModal.tsx
const portalModalPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Modals', 'PortalModal.tsx');
let modalCode = fs.readFileSync(portalModalPath, 'utf8');

if (!modalCode.includes('PORTAL_PIXELS_8X8')) {
  modalCode = `import { pixelMatrixToSvgUri } from '../../config/sandTextures';\nimport { PORTAL_PIXELS_8X8 } from '../../config/pixelTextures';\n` + modalCode;
  modalCode = modalCode.replace(
    'export const PortalModal: React.FC<PortalModalProps> = ({',
    'const PORTAL_ICON_URI = pixelMatrixToSvgUri(PORTAL_PIXELS_8X8);\n\nexport const PortalModal: React.FC<PortalModalProps> = ({'
  );
}

modalCode = modalCode.replace(
  `<span style={{ fontSize: '1.4rem' }}>🌀</span>`,
  `<img src={PORTAL_ICON_URI} alt="Портал" style={{ width: '24px', height: '24px', imageRendering: 'pixelated', filter: 'drop-shadow(0 0 6px rgba(192, 132, 252, 0.8))' }} />`
);

modalCode = modalCode.replace(
  `{actionLoading ? 'Создание мультивселенной в Monad...' : '🌀 Поставить портал в свою мультивселенную'}`,
  `<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <img src={PORTAL_ICON_URI} alt="Портал" style={{ width: '18px', height: '18px', imageRendering: 'pixelated' }} />
                <span>{actionLoading ? 'Создание мультивселенной в Monad...' : 'Поставить портал в свою мультивселенную'}</span>
              </div>`
);

fs.writeFileSync(portalModalPath, modalCode, 'utf8');

// 3. CellView.tsx
const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let cellViewCode = fs.readFileSync(cellViewPath, 'utf8');

cellViewCode = cellViewCode.replace(
  `<span>🌀</span>\n              <span>Врата #{portalId}</span>`,
  `<img src={PORTAL_PIXEL_SPRITE_URI} alt="Портал" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />\n              <span>Врата #{portalId}</span>`
);

cellViewCode = cellViewCode.replace(
  `{cell?.object === 2 && <span>🧱</span>}`,
  `{cell?.object === 2 && <span>🧱</span>}\n          {cell?.object === 4 && <img src={PORTAL_PIXEL_SPRITE_URI} alt="Портал" style={{ width: '14px', height: '14px', imageRendering: 'pixelated' }} />}`
);

fs.writeFileSync(cellViewPath, cellViewCode, 'utf8');

console.log('Replaced all portal emojis with unified pixel sprite!');
