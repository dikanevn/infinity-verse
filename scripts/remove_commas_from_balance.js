// scripts/remove_commas_from_balance.js
const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '..', 'client', 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Заменяем toLocaleString('en-US') на toFixed(2) без разделителей запятых
appCode = appCode.replace(
  `        const rawNum = Number(bal) / 1e18;
        const formatted = rawNum.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        setInferBalance(formatted);`,
  `        const rawNum = Number(bal) / 1e18;
        const formatted = rawNum.toFixed(2);
        setInferBalance(formatted);`
);

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('Removed commas from balance formatting in App.tsx');
