import { createPublicClient, http, parseAbi, defineChain } from 'viem';

// ============================================================================
// === АКТУАЛЬНЫЕ КОНТРАКТЫ ПОКОЛЕНИЯ 2 (MONAD TESTNET) ===
// ============================================================================
// Хранилище мира (State Storage Generation 2):
export const MAIN_CONTRACT_ADDRESS = '0x022d01b6e057e62e6B7Be9a2bE2b76e0Af26109B';
// Исполнительная логика (AAA Module):
export const AAA_CONTRACT_ADDRESS = '0x2a8d707aa28f35596805d5668bc531afec9eeafd';

export const RPC_URL = 'https://testnet-rpc.monad.xyz';
export const RELAYER_URL = 'https://infinity-verse-relayer.infinity-verse.workers.dev';
export const CLIENT_VERSION = '2610242333';
export const GOOGLE_CLIENT_ID = '302988323060-edu3imkm9esfe41g4658va7gqmfd7up6.apps.googleusercontent.com';

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://testnet.monadvision.com' },
  },
  testnet: true,
});

// ============================================================================
// === ABI MAIN (ХРАНИЛИЩЕ МИРА И СОСТОЯНИЯ ИГРОКОВ) ===
// ============================================================================
export const MAIN_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function GENERATION() view returns (uint256)',
  'function contractAAA() view returns (address)',
  'function getCellKey(int32 x, int32 y) pure returns (bytes32)',
  'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved))',
  'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved)[])',
  'function getPlayer(address player) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry, uint256 registeredAtBlock, uint256 registeredAtTimestamp)',
  'function nonces(address player) view returns (uint256)'
]);

// ============================================================================
// === ABI AAA (СИММЕТРИЧНЫЙ МОДУЛЬ ЛОГИКИ: DIRECT <-> GASLESS) ===
// ============================================================================
export const AAA_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function mainContract() view returns (address)',
  'function relayer() view returns (address)',
  'function isSessionValid(address player, address key) view returns (bool)',
  // Прямые действия игрока за личный газ (Direct: MetaMask / Приватник)
  'function spawnDirect()',
  'function moveDirect(int32 targetX, int32 targetY)',
  'function authorizeSessionDirect(address sessionKey, uint256 expiry)',
  'function revokeSessionDirect()',
  // Спонсируемые действия по EIP-191 подписи (Gasless: Google / Релеер)
  'function spawnGasless(address player)',
  'function moveGasless(address player, int32 targetX, int32 targetY, bytes sig)',
  'function authorizeSessionGasless(address player, address sessionKey, uint256 expiry, bytes sig)',
  'function revokeSessionGasless(address player, bytes sig)'
]);


export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL)
});
