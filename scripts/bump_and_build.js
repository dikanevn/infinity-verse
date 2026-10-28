// scripts/bump_and_build.js
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '..', 'client', 'package.json');
const contractsPath = path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts');

const now = new Date();
const mskOffset = 3 * 60;
const utc = now.getTime() + now.getTimezoneOffset() * 60000;
const msk = new Date(utc + mskOffset * 60000);

const dd = String(msk.getDate()).padStart(2, '0');
const MM = String(msk.getMonth() + 1).padStart(2, '0');
const yy = String(msk.getFullYear()).slice(-2);
const HH = String(msk.getHours()).padStart(2, '0');
const mm = String(msk.getMinutes()).padStart(2, '0');
const newVer = `${dd}${MM}${yy}${HH}${mm}`;

let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVer;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

let contracts = fs.readFileSync(contractsPath, 'utf8');
contracts = contracts.replace(/export const CLIENT_VERSION = '[^']+';/, `export const CLIENT_VERSION = '${newVer}';`);
fs.writeFileSync(contractsPath, contracts, 'utf8');

console.log('Bumped version to', newVer);
