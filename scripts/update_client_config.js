const fs = require('fs');

// 1. relayer/wrangler.toml
let wrangler = fs.readFileSync('relayer/wrangler.toml', 'utf8');
wrangler = wrangler.replace(/MAIN_CONTRACT_ADDRESS = "[^"]+"/, 'MAIN_CONTRACT_ADDRESS = "0x958ada5a6b17ddf69718a9cf8e51b7870f1a1737"');
wrangler = wrangler.replace(/AAA_CONTRACT_ADDRESS = "[^"]+"/, 'AAA_CONTRACT_ADDRESS = "0xef73b3b75619d52676e8942cab8886bbdf1bb38c"');
fs.writeFileSync('relayer/wrangler.toml', wrangler, 'utf8');
console.log('wrangler updated');

// 2. client/src/config/contracts.ts
let contracts = fs.readFileSync('client/src/config/contracts.ts', 'utf8');
contracts = contracts.replace(/export const MAIN_CONTRACT_ADDRESS = '[^']+';/, "export const MAIN_CONTRACT_ADDRESS = '0x958ada5a6b17ddf69718a9cf8e51b7870f1a1737';");
contracts = contracts.replace(/export const AAA_CONTRACT_ADDRESS = '[^']+';/, "export const AAA_CONTRACT_ADDRESS = '0xef73b3b75619d52676e8942cab8886bbdf1bb38c';");
contracts = contracts.replace(/export const STAR_TOKEN_ADDRESS = '[^']+';/, "export const STAR_TOKEN_ADDRESS = '0x6ed6fdc468bbadc3dad2467cade21bf6f8ac0956';");
contracts = contracts.replace(/export const CLIENT_VERSION = '[^']+';/, "export const CLIENT_VERSION = '2710261555';");

const mainAbiAdd = `,\n  'function totalPortals() view returns (uint256)',\n  'function getPortal(uint256 id) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt))',\n  'function getPortalsSequential(uint256 offset, uint256 count) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt)[])',\n  'function getPortalId(address targetContract) view returns (uint256)',\n  'function getPortalByFounder(address founder) view returns (uint256)',\n  'function transferPortalOwnership(uint256 portalId, address newOwner)',\n  'function destroyPortal(uint256 portalId)'\n]);`;
contracts = contracts.replace(/readSectorBatch\(bytes32\[\] sectors\) view returns \(bytes32\[\]\)'\r?\n\]\);/, "readSectorBatch(bytes32[] sectors) view returns (bytes32[])'" + mainAbiAdd);

const aaaAbiAdd = `,\n  // Управление порталами Мультивселенной\n  'function createPortalDirect(address targetContract, bytes32 founderName, bytes32 worldName, int32 portalX, int32 portalY) returns (uint256)',\n  'function transferPortalDirect(uint256 portalId, address newOwner)',\n  'function destroyPortalDirect(uint256 portalId, int32 portalX, int32 portalY)'\n]);`;
contracts = contracts.replace(/revokeSessionGasless\(address player, bytes sig\)'\r?\n\]\);/, "revokeSessionGasless(address player, bytes sig)'" + aaaAbiAdd);

fs.writeFileSync('client/src/config/contracts.ts', contracts, 'utf8');
console.log('contracts.ts updated');

// 3. client/package.json
let pkg = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
pkg.version = '2710261555';
fs.writeFileSync('client/package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('package.json updated');
