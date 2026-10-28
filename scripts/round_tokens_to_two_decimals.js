// scripts/round_tokens_to_two_decimals.js
const fs = require('fs');
const path = require('path');

// 1. App.tsx: округление баланса до 2 знаков после точки
const appPath = path.resolve(__dirname, '..', 'client', 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Меняем форматирование баланса на 2 знака
appCode = appCode.replace(
  `// Точное форматирование без округления с удалением хвостовых нулей
        let formatted = formatUnits(bal as bigint, 18);
        if (formatted.includes('.')) {
          formatted = formatted.replace(/\\.?0+$/, '');
        }
        setInferBalance(formatted || '0');`,
  `// Округление баланса токенов INFER строго до 2 знаков после точки
        const rawNum = Number(bal) / 1e18;
        const formatted = rawNum.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        setInferBalance(formatted);`
);

fs.writeFileSync(appPath, appCode, 'utf8');

// 2. CellView.tsx: округление веса субстанции на плашке до 2 знаков после точки
const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let cellCode = fs.readFileSync(cellViewPath, 'utf8');

cellCode = cellCode.replace(
  `if (cell?.object === 3) {
      const sec = cell.secondsWeight || 1;
      const tokens = (sec * 50) / 600;
      const displayTokens = tokens < 1 ? tokens.toFixed(3) : tokens >= 100 ? Math.round(tokens).toString() : tokens.toFixed(1);
      return \`Квантовая субстанция (\${displayTokens} INFER)\`;
    }`,
  `if (cell?.object === 3) {
      const sec = cell.secondsWeight || 1;
      const tokens = (sec * 50) / 600;
      const displayTokens = tokens.toFixed(2);
      return \`Квантовая субстанция (\${displayTokens} INFER)\`;
    }`
);

fs.writeFileSync(cellViewPath, cellCode, 'utf8');

console.log('Successfully rounded tokens to 2 decimals in App.tsx and CellView.tsx!');
