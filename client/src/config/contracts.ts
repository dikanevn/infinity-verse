import { createPublicClient, http, parseAbi, defineChain } from 'viem';

// ============================================================================
// === АКТУАЛЬНЫЕ КОНТРАКТЫ ЭПОХИ GB (MONAD TESTNET) ===
// ============================================================================
// Постоянное универсальное хранилище мира (Main Gb-1):
export const MAIN_CONTRACT_ADDRESS = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
// Исполнительная логика и игровой интерфейс (Gb_AAA_1 Module с поддержкой Порталов, Звёзд, 5x5 и Gasless сессий):
export const AAA_CONTRACT_ADDRESS = '0x1952c8260da039906b4e3129b701ae46de175b20';
// Токен Звёзд (Infinity Star ERC-20):
export const STAR_TOKEN_ADDRESS = '0x91d8e6749bf9018545fc7ef80c30306611c87033';

export const DEFAULT_RPC_URL = 'https://testnet-rpc.monad.xyz';
export const getActiveRpcUrl = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('infinity_active_rpc') || DEFAULT_RPC_URL;
  }
  return DEFAULT_RPC_URL;
};
export const RPC_URL = getActiveRpcUrl();
export const RELAYER_URL = 'https://infinity-verse-relayer.infinity-verse.workers.dev';
export const CLIENT_VERSION = '2810260817';
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
  'function getCurrentMiningReward() view returns (uint256 reward, uint256 deltaT, uint256 lastMined)',
  'function GENERATION() view returns (uint256)',
  'function totalGenerations() view returns (uint256)',
  'function getAllGenerations() view returns (address[])',
  'function readSector(bytes32 sector) view returns (bytes32)',
  'function readSectorBatch(bytes32[] sectors) view returns (bytes32[])',
  'function totalPortals() view returns (uint256)',
  'function getPortal(uint256 id) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt))',
  'function getPortalsSequential(uint256 offset, uint256 count) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt)[])',
  'function getPortalId(address targetContract) view returns (uint256)',
  'function getPortalByFounder(address founder) view returns (uint256)',
  'function transferPortalOwnership(uint256 portalId, address newOwner)',
  'function destroyPortal(uint256 portalId)'
]);

// ============================================================================
// === ABI AAA (ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ ИГРОВОЙ МОДУЛЬ GA_AAA) ===
// ============================================================================
export const AAA_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function mainContract() view returns (address)',
  'function relayer() view returns (address)',
  'function getCellKey(int32 x, int32 y) pure returns (bytes32)',
  'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight))',
  'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight)[])',
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
  'function revokeSessionGasless(address player, bytes sig)',
  // Управление порталами Мультивселенной
  'function createPortalDirect(address targetContract, bytes32 founderName, bytes32 worldName, int32 portalX, int32 portalY) returns (uint256)',
  'function transferPortalDirect(uint256 portalId, address newOwner)',
  'function destroyPortalDirect(uint256 portalId, int32 portalX, int32 portalY)'
]);


export const STAR_TOKEN_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
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
