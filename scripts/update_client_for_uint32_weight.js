// scripts/update_client_for_uint32_weight.js
const fs = require('fs');
const path = require('path');

const newAaaAddress = '0x28d37c320c6e58347d735fd89bb661f63c088fd1';
const newVersion = '2810260620';

// 1. types/index.ts
const typesPath = path.resolve(__dirname, '..', 'client', 'src', 'types', 'index.ts');
let typesCode = fs.readFileSync(typesPath, 'utf8');
if (!typesCode.includes('weight?: number;')) {
  typesCode = typesCode.replace(
    '  paramB: number;\n}',
    '  paramB: number;\n  weight?: number;\n}'
  );
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

// Обновляем Cell структуру в AAA_ABI: добавляем uint32 weight
contractsCode = contractsCode.replace(
  /'function getCell\(int32 x, int32 y\) view returns \(\(uint8 terrain, uint8 object, uint8 state, uint8 reserved\)\)',/g,
  `'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 weight))',`
);
contractsCode = contractsCode.replace(
  /'function getCellsBatch\(int32\[\] xs, int32\[\] ys\) view returns \(\(uint8 terrain, uint8 object, uint8 state, uint8 reserved\)\[\]\)',/g,
  `'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 weight)[])',`
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
  '          reserved: Number(c.reserved),\n          paramA: 0,',
  '          reserved: Number(c.reserved),\n          weight: Number(c.weight || 0),\n          paramA: 0,'
);
fs.writeFileSync(worldStatePath, worldCode, 'utf8');

// 5. CellView.tsx: отображение веса в бейдже над субстанцией
const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let cellCode = fs.readFileSync(cellViewPath, 'utf8');
cellCode = cellCode.replace(
  "if (cell?.object === 3) return 'Квантовая субстанция';",
  "if (cell?.object === 3) return cell.weight ? `Квантовая субстанция (${cell.weight} INFER)` : 'Квантовая субстанция';"
);
fs.writeFileSync(cellViewPath, cellCode, 'utf8');

// 6. relayer/wrangler.toml
const relayerPath = path.resolve(__dirname, '..', 'relayer', 'wrangler.toml');
let relayerCode = fs.readFileSync(relayerPath, 'utf8');
relayerCode = relayerCode.replace(
  /AAA_CONTRACT_ADDRESS = "[^"]+"/,
  `AAA_CONTRACT_ADDRESS = "${newAaaAddress}"`
);
fs.writeFileSync(relayerPath, relayerCode, 'utf8');

console.log('All client and relayer configs updated to AAA', newAaaAddress);
