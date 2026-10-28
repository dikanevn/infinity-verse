// scripts/update_client_for_seconds_mining.js
const fs = require('fs');
const path = require('path');

const newAaaAddress = '0x59b85a9ce34be3d22281726f943306ddddb31c2a';
const newVersion = '2810260630';

// 1. types/index.ts
const typesPath = path.resolve(__dirname, '..', 'client', 'src', 'types', 'index.ts');
let typesCode = fs.readFileSync(typesPath, 'utf8');
typesCode = typesCode.replace('weight?: number;', 'secondsWeight?: number;');
fs.writeFileSync(typesPath, typesCode, 'utf8');

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

contractsCode = contractsCode.replace(
  /'function getCell\(int32 x, int32 y\) view returns \(\(uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 weight\)\)',/g,
  `'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight))',`
);
contractsCode = contractsCode.replace(
  /'function getCellsBatch\(int32\[\] xs, int32\[\] ys\) view returns \(\(uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 weight\)\[\]\)',/g,
  `'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight)[])',`
);

fs.writeFileSync(contractsPath, contractsCode, 'utf8');

// 3. package.json
const pkgPath = path.resolve(__dirname, '..', 'client', 'package.json');
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

// 4. useWorldState.ts
const worldStatePath = path.resolve(__dirname, '..', 'client', 'src', 'hooks', 'useWorldState.ts');
let worldCode = fs.readFileSync(worldStatePath, 'utf8');
worldCode = worldCode.replace(
  'weight: Number(c.weight || 0),',
  'secondsWeight: Number(c.secondsWeight || 0),'
);
fs.writeFileSync(worldStatePath, worldCode, 'utf8');

// 5. CellView.tsx: красивое отображение веса в токенах INFER:
// secondsWeight * 50 / 600 токенов (1 сек = ~0.0833 INFER)
const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let cellCode = fs.readFileSync(cellViewPath, 'utf8');

const oldLogic = "if (cell?.object === 3) return cell.weight ? `Квантовая субстанция (${cell.weight} INFER)` : 'Квантовая субстанция';";
const newLogic = `if (cell?.object === 3) {
      const sec = cell.secondsWeight || 1;
      const tokens = (sec * 50) / 600;
      const displayTokens = tokens < 1 ? tokens.toFixed(3) : tokens >= 100 ? Math.round(tokens).toString() : tokens.toFixed(1);
      return \`Квантовая субстанция (\${displayTokens} INFER)\`;
    }`;

cellCode = cellCode.replace(oldLogic, newLogic);
fs.writeFileSync(cellViewPath, cellCode, 'utf8');

// 6. relayer/wrangler.toml
const relayerPath = path.resolve(__dirname, '..', 'relayer', 'wrangler.toml');
let relayerCode = fs.readFileSync(relayerPath, 'utf8');
relayerCode = relayerCode.replace(
  /AAA_CONTRACT_ADDRESS = "[^"]+"/,
  `AAA_CONTRACT_ADDRESS = "${newAaaAddress}"`
);
fs.writeFileSync(relayerPath, relayerCode, 'utf8');

console.log('All configs updated for seconds-based mining!');
