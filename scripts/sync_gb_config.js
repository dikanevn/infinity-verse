const fs = require('fs');

const mainAddr = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
const aaaAddr = '0xc84be36834d491c662b589ad38c063ec8b662ced';
const starAddr = '0x91d8e6749bf9018545fc7ef80c30306611c87033';
const version = '2810260424';

// 1. wrangler.toml
let wr = fs.readFileSync('relayer/wrangler.toml', 'utf8');
wr = wr.replace(/MAIN_CONTRACT_ADDRESS = "[^"]+"/, `MAIN_CONTRACT_ADDRESS = "${mainAddr}"`);
wr = wr.replace(/AAA_CONTRACT_ADDRESS = "[^"]+"/, `AAA_CONTRACT_ADDRESS = "${aaaAddr}"`);
fs.writeFileSync('relayer/wrangler.toml', wr, 'utf8');

// 2. contracts.ts
let c = fs.readFileSync('client/src/config/contracts.ts', 'utf8');
c = c.replace(/export const MAIN_CONTRACT_ADDRESS = '[^']+';/, `export const MAIN_CONTRACT_ADDRESS = '${mainAddr}';`);
c = c.replace(/export const AAA_CONTRACT_ADDRESS = '[^']+';/, `export const AAA_CONTRACT_ADDRESS = '${aaaAddr}';`);
c = c.replace(/export const STAR_TOKEN_ADDRESS = '[^']+';/, `export const STAR_TOKEN_ADDRESS = '${starAddr}';`);
c = c.replace(/export const CLIENT_VERSION = '[^']+';/, `export const CLIENT_VERSION = '${version}';`);
fs.writeFileSync('client/src/config/contracts.ts', c, 'utf8');

// 3. package.json
let p = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
p.version = version;
fs.writeFileSync('client/package.json', JSON.stringify(p, null, 2) + '\n', 'utf8');

console.log('Configs successfully updated with Gb addresses!');
