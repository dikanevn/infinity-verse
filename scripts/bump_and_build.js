// scripts/bump_and_build.js
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '..', 'client', 'package.json');
const contractsPath = path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts');

const newVer = '2810260644';

let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVer;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

let contracts = fs.readFileSync(contractsPath, 'utf8');
contracts = contracts.replace(/export const CLIENT_VERSION = '[^']+';/, `export const CLIENT_VERSION = '${newVer}';`);
fs.writeFileSync(contractsPath, contracts, 'utf8');

console.log('Bumped version to', newVer);
