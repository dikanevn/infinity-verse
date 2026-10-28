// scripts/fix_app_import.js
const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '..', 'client', 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

if (!appCode.includes("from 'viem'")) {
  appCode = "import { formatUnits } from 'viem';\n" + appCode;
}

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('Fixed import formatUnits in App.tsx');
