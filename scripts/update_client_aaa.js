// scripts/update_client_aaa.js
const fs = require('fs');
const path = require('path');

const contractsPath = path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts');
let contractsTs = fs.readFileSync(contractsPath, 'utf8');

contractsTs = contractsTs.replace(
  /export const AAA_CONTRACT_ADDRESS = '[^']+';/,
  "export const AAA_CONTRACT_ADDRESS = '0x6b7fa42017eee9a2fe1d8ac3c51d71312d463316';"
);

// Добавляем getCurrentMiningReward в AAA_ABI если нет
if (!contractsTs.includes('getCurrentMiningReward')) {
  contractsTs = contractsTs.replace(
    "'function VERSION() view returns (string)',",
    `'function VERSION() view returns (string)',
  'function getCurrentMiningReward() view returns (uint256 reward, uint256 deltaT, uint256 lastMined)',`
  );
}

const packageJsonPath = path.resolve(__dirname, '..', 'client', 'package.json');
let pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVer = '2810260555';
pkg.version = newVer;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf8');

contractsTs = contractsTs.replace(
  /export const CLIENT_VERSION = '[^']+';/,
  `export const CLIENT_VERSION = '${newVer}';`
);

fs.writeFileSync(contractsPath, contractsTs, 'utf8');
console.log(`Updated contracts.ts and package.json to version ${newVer} with AAA 0x6b7fa42017eee9a2fe1d8ac3c51d71312d463316`);
