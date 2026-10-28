// scripts/update_client_for_seconds_mining.js
const fs = require('fs');
const path = require('path');

const newAaaAddress = '0xcbb11633010b459310637aa65f3d0b3fba76561c';
const newVersion = '2810260650';

// 1. types/index.ts
const typesPath = path.resolve(__dirname, '..', 'client', 'src', 'types', 'index.ts');
let typesCode = fs.readFileSync(typesPath, 'utf8');
if (!typesCode.includes('secondsWeight?: number;')) {
  typesCode = typesCode.replace('weight?: number;', 'secondsWeight?: number;');
  fs.writeFileSync(typesPath, typesCode, 'utf8');
}

// 2. contracts.ts
const contractsPath = path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts');
let contractsCode = fs.readFileSync(contractsPath, 'utf8');
contractsCode = contractsCode.replace(
  /export const AAA_CONTRACT_ADDRESS = '[^']+';/,
  `export const AAA_CONTRACT_ADDRESS = '${newAaaAddress}';`
);
contractsCode = contractsCode.replace(
  /export const CLIENT_VERSION = '[^']+';/,
  `export const CLIENT_VERSION = '${newVersion}';`
);

fs.writeFileSync(contractsPath, contractsCode, 'utf8');

// 3. package.json
const pkgPath = path.resolve(__dirname, '..', 'client', 'package.json');
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

// 4. relayer/wrangler.toml
const relayerPath = path.resolve(__dirname, '..', 'relayer', 'wrangler.toml');
let relayerCode = fs.readFileSync(relayerPath, 'utf8');
relayerCode = relayerCode.replace(
  /AAA_CONTRACT_ADDRESS = "[^"]+"/,
  `AAA_CONTRACT_ADDRESS = "${newAaaAddress}"`
);
fs.writeFileSync(relayerPath, relayerCode, 'utf8');

console.log('All configs updated for AAA', newAaaAddress);
