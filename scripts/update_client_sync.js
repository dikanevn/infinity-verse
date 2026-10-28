// scripts/update_client_sync.js
const fs = require('fs');
const path = require('path');

const newAaaAddress = '0x1952c8260da039906b4e3129b701ae46de175b20';
const newVersion = '2610280658';

// 1. types/index.ts
const typesPath = path.resolve(__dirname, '..', 'client', 'src', 'types', 'index.ts');
let typesCode = fs.readFileSync(typesPath, 'utf8');
if (!typesCode.includes('secondsWeight?: number;')) {
  typesCode = typesCode.replace('weight?: number;', 'secondsWeight?: number;');
  if (!typesCode.includes('secondsWeight?: number;')) {
    typesCode = typesCode.replace('  paramB: number;\n}', '  paramB: number;\n  secondsWeight?: number;\n}');
  }
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

// Обновляем getCell и getCellsBatch в AAA_ABI: добавляем secondsWeight
contractsCode = contractsCode.replace(
  /'function getCell\(int32 x, int32 y\) view returns \(\(uint8 terrain, uint8 object, uint8 state, uint8 reserved\)\)',/g,
  `'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight))',`
);
contractsCode = contractsCode.replace(
  /'function getCellsBatch\(int32\[\] xs, int32\[\] ys\) view returns \(\(uint8 terrain, uint8 object, uint8 state, uint8 reserved\)\[\]\)',/g,
  `'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight)[])',`
);

fs.writeFileSync(contractsPath, contractsCode, 'utf8');

// 3. package.json
const pkgPath = path.resolve(__dirname, '..', 'client', 'package.json');
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

// 4. useWorldState.ts
const worldPath = path.resolve(__dirname, '..', 'client', 'src', 'hooks', 'useWorldState.ts');
let worldCode = fs.readFileSync(worldPath, 'utf8');
if (!worldCode.includes('secondsWeight: Number(c.secondsWeight || 0),')) {
  worldCode = worldCode.replace(
    '          reserved: Number(c.reserved),\n          paramA: 0,',
    '          reserved: Number(c.reserved),\n          secondsWeight: Number(c.secondsWeight || 0),\n          paramA: 0,'
  );
  fs.writeFileSync(worldPath, worldCode, 'utf8');
}

// 5. relayer/wrangler.toml
const relayerPath = path.resolve(__dirname, '..', 'relayer', 'wrangler.toml');
let relayerCode = fs.readFileSync(relayerPath, 'utf8');
relayerCode = relayerCode.replace(
  /AAA_CONTRACT_ADDRESS = "[^"]+"/,
  `AAA_CONTRACT_ADDRESS = "${newAaaAddress}"`
);
fs.writeFileSync(relayerPath, relayerCode, 'utf8');

console.log('Client and relayer configs updated for AAA', newAaaAddress);
