// scripts/make_exact_infer_balance.js
const fs = require('fs');
const path = require('path');

// 1. Обновляем App.tsx: хранить raw BigInt баланс и форматировать через formatUnits
const appPath = path.resolve(__dirname, '..', 'client', 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

if (!appCode.includes('formatUnits')) {
  appCode = appCode.replace(
    "import { formatEther } from 'viem';",
    "import { formatEther, formatUnits } from 'viem';"
  );
  if (!appCode.includes('formatUnits')) {
    appCode = appCode.replace(
      "import { createPublicClient,",
      "import { formatUnits } from 'viem';\nimport { createPublicClient,"
    );
  }
}

appCode = appCode.replace(
  "const [inferBalance, setInferBalance] = useState<number | null>(null);",
  "const [inferBalance, setInferBalance] = useState<string | null>(null);"
);

appCode = appCode.replace(
  "setInferBalance(Number(bal) / 1e18);",
  `// Точное форматирование без округления с удалением хвостовых нулей
        let formatted = formatUnits(bal as bigint, 18);
        if (formatted.includes('.')) {
          formatted = formatted.replace(/\\.?0+$/, '');
        }
        setInferBalance(formatted || '0');`
);

fs.writeFileSync(appPath, appCode, 'utf8');

// 2. Обновляем WorldGrid.tsx: принимать inferBalance?: string | null и выводить строку целиком
const gridPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'WorldGrid.tsx');
let gridCode = fs.readFileSync(gridPath, 'utf8');

gridCode = gridCode.replace(
  "inferBalance?: number | null;",
  "inferBalance?: string | null;"
);

gridCode = gridCode.replace(
  "{inferBalance !== undefined && inferBalance !== null ? inferBalance.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '...'}",
  "{inferBalance !== undefined && inferBalance !== null ? inferBalance : '...'}"
);

fs.writeFileSync(gridPath, gridCode, 'utf8');

console.log('Updated exact balance formatting without rounding!');
