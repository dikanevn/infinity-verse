const fs = require('fs');
const path = require('path');

const mainAddress = '0x29f3106e7dc53a737f51464644c4aac05ddc01f4';
const aaaAddress = '0x2ff17cc7f3f22c54019480f5548f9792bff70d55';
const tttAddress = '0xee7bc7021d41b6582bea28e6ad0b506a12ef13cf';

// 1. relayer/wrangler.toml
let wrangler = fs.readFileSync('relayer/wrangler.toml', 'utf8');
wrangler = wrangler.replace(/MAIN_CONTRACT_ADDRESS = "[^"]+"/, 'MAIN_CONTRACT_ADDRESS = "' + mainAddress + '"');
wrangler = wrangler.replace(/AAA_CONTRACT_ADDRESS = "[^"]+"/, 'AAA_CONTRACT_ADDRESS = "' + aaaAddress + '"');
fs.writeFileSync('relayer/wrangler.toml', wrangler, 'utf8');

// 2. client/src/config/contracts.ts
let contracts = fs.readFileSync('client/src/config/contracts.ts', 'utf8');
contracts = contracts.replace(/export const MAIN_CONTRACT_ADDRESS = '[^']+';/, "export const MAIN_CONTRACT_ADDRESS = '" + mainAddress + "';");
contracts = contracts.replace(/export const AAA_CONTRACT_ADDRESS = '[^']+';/, "export const AAA_CONTRACT_ADDRESS = '" + aaaAddress + "';");
contracts = contracts.replace(/export const STAR_TOKEN_ADDRESS = '[^']+';/, "export const STAR_TOKEN_ADDRESS = '" + tttAddress + "';");
fs.writeFileSync('client/src/config/contracts.ts', contracts, 'utf8');

// 3. deployments.json
const deploymentsFile = path.resolve('.private', 'deployments.json');
let history = {};
if (fs.existsSync(deploymentsFile)) {
  try { history = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8')); } catch (e) {}
}
if (!history.monad_testnet) history.monad_testnet = {};
if (!history.monad_testnet.contracts) history.monad_testnet.contracts = {};
history.monad_testnet.contracts['InfinityVerse_Main_Gb_1'] = { address: mainAddress, deployedAt: new Date().toISOString() };
history.monad_testnet.contracts['InfinityVerse_Gb_AAA_1'] = { address: aaaAddress, deployedAt: new Date().toISOString() };
history.monad_testnet.contracts['InfinityVerse_Ga_TTT_Gb'] = { address: tttAddress, deployedAt: new Date().toISOString() };
fs.writeFileSync(deploymentsFile, JSON.stringify(history, null, 2), 'utf8');

console.log('Configs synchronized to:');
console.log('Main:', mainAddress);
console.log('AAA: ', aaaAddress);
console.log('TTT: ', tttAddress);
