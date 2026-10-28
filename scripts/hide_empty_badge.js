// scripts/hide_empty_badge.js
const fs = require('fs');
const path = require('path');

const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let code = fs.readFileSync(cellViewPath, 'utf8');

// Заменяем условие показа бейджа: только если есть объект (hasObject)
code = code.replace(
  '{isSelected && !isChaos && !isPortal && (',
  '{isSelected && !isChaos && !isPortal && hasObject && ('
);

fs.writeFileSync(cellViewPath, code, 'utf8');
console.log('CellView.tsx updated: hidden badge when empty!');
