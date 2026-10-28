// scripts/rename_to_infer_test.js
const fs = require('fs');
const path = require('path');

// 1. WorldGrid.tsx: в бейдже баланса
const gridPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'WorldGrid.tsx');
let gridCode = fs.readFileSync(gridPath, 'utf8');

gridCode = gridCode.replace(
  `<span style={{ fontSize: '0.62rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1, fontWeight: 700 }}>\n            $INFER\n          </span>`,
  `<span style={{ fontSize: '0.62rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1, fontWeight: 700 }}>\n            $INFER-TEST\n          </span>`
);
gridCode = gridCode.replace('alt="$INFER"', 'alt="$INFER-TEST"');
fs.writeFileSync(gridPath, gridCode, 'utf8');

// 2. CellView.tsx: в подсказке над субстанцией
const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let cellCode = fs.readFileSync(cellViewPath, 'utf8');

cellCode = cellCode.replace(
  'return `Квантовая субстанция (${displayTokens} INFER)`;',
  'return `Квантовая субстанция (${displayTokens} INFER-TEST)`;'
);
fs.writeFileSync(cellViewPath, cellCode, 'utf8');

console.log('Renamed token to INFER-TEST in frontend');
