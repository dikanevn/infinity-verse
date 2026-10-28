// scripts/fix_unused_format_units.js
const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '..', 'client', 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

appCode = appCode.replace("import { formatUnits } from 'viem';\n", "");

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('Removed unused formatUnits import');
