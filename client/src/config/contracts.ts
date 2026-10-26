import { createPublicClient, http, parseAbi, defineChain } from 'viem';

// ============================================================================
// === АКТУАЛЬНЫЕ КОНТРАКТЫ ЭПОХИ GA (MONAD TESTNET) ===
// ============================================================================
// Постоянное универсальное хранилище мира (Main Ga-1):
export const MAIN_CONTRACT_ADDRESS = '0xf32bd8705ee1c7682d9a5f2d00b18815929d4482';
// Исполнительная логика и игровой интерфейс (Ga_AAA_2 Module с поддержкой Звёзд и TTT):
export const AAA_CONTRACT_ADDRESS = '0x0ccc6b4121d30f8b287f486076a1e769e5279261';
// Токен Звёзд (Infinity Star ERC-20):
export const STAR_TOKEN_ADDRESS = '0xe4bc53bb392f6c96a4a6d6b7a72263731f599686';

export const DEFAULT_RPC_URL = 'https://testnet-rpc.monad.xyz';
export const getActiveRpcUrl = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('infinity_active_rpc') || DEFAULT_RPC_URL;
  }
  return DEFAULT_RPC_URL;
};
export const RPC_URL = getActiveRpcUrl();
export const RELAYER_URL = 'https://infinity-verse-relayer.infinity-verse.workers.dev';
export const CLIENT_VERSION = '2610260801';
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
    default: { http: [getActiveRpcUrl()] },
    public: { http: [getActiveRpcUrl()] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://testnet.monadvision.com' },
  },
  testnet: true,
});

// ============================================================================
// === ABI MAIN (УНИВЕРСАЛЬНЫЙ ДИСК МУЛЬТИВСЕЛЕННОЙ MAIN_GA_1) ===
// ============================================================================
export const MAIN_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function GENERATION() view returns (uint256)',
  'function totalGenerations() view returns (uint256)',
  'function getAllGenerations() view returns (address[])',
  'function readSector(bytes32 sector) view returns (bytes32)',
  'function readSectorBatch(bytes32[] sectors) view returns (bytes32[])'
]);

// ============================================================================
// === ABI AAA (ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ ИГРОВОЙ МОДУЛЬ GA_AAA) ===
// ============================================================================
export const AAA_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function mainContract() view returns (address)',
  'function relayer() view returns (address)',
  'function getCellKey(int32 x, int32 y) pure returns (bytes32)',
  'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved))',
  'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved)[])',
  'function getPlayer(address player) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry, uint64 registeredAtBlock, uint64 registeredAtTimestamp)',
  'function nonces(address player) view returns (uint256)',
  'function isSessionValid(address player, address key) view returns (bool)',
  // Прямые действия игрока за личный газ (Direct: MetaMask / Приватник)
  'function spawnDirect()',
  'function moveDirect(int32 targetX, int32 targetY)',
  'function discoverCellDirect(int32 targetX, int32 targetY)',
  'function discoverCellsBatchDirect(int32[] xs, int32[] ys)',
  'function authorizeSessionDirect(address sessionKey, uint256 expiry)',
  'function revokeSessionDirect()',
  // Спонсируемые действия по EIP-191 подписи (Gasless: Google / Релеер)
  'function spawnGasless(address player, bytes sig)',
  'function moveGasless(address player, int32 targetX, int32 targetY, bytes sig)',
  'function discoverCellGasless(address player, int32 targetX, int32 targetY, bytes sig)',
  'function discoverCellsBatchGasless(address player, int32[] xs, int32[] ys, bytes sig)',
  'function authorizeSessionGasless(address player, address sessionKey, uint256 expiry, bytes sig)',
  'function revokeSessionGasless(address player, bytes sig)'
]);


export const getPublicClient = (customRpc?: string) => {
  const url = customRpc || getActiveRpcUrl();
  return createPublicClient({
    chain: defineChain({
      ...monadTestnet,
      rpcUrls: {
        default: { http: [url] },
        public: { http: [url] }
      }
    }),
    transport: http(url)
  });
};

export const publicClient = getPublicClient();
