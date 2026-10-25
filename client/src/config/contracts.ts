import { createPublicClient, http, parseAbi, defineChain } from 'viem';

// ============================================================================
// === АКТУАЛЬНЫЕ КОНТРАКТЫ ПОКОЛЕНИЯ 2 (MONAD TESTNET) ===
// ============================================================================
// Хранилище мира (State Storage Generation 2):
export const MAIN_CONTRACT_ADDRESS = '0x022d01b6e057e62e6B7Be9a2bE2b76e0Af26109B';
// Исполнительная логика (AAA Module):
export const AAA_CONTRACT_ADDRESS = '0x035da1a59b049f9022984743f4c43fbc311d44d6';

export const DEFAULT_RPC_URL = 'https://testnet-rpc.monad.xyz';
export const getActiveRpcUrl = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('infinity_active_rpc') || DEFAULT_RPC_URL;
  }
  return DEFAULT_RPC_URL;
};
export const RPC_URL = getActiveRpcUrl();
export const RELAYER_URL = 'https://infinity-verse-relayer.infinity-verse.workers.dev';
export const CLIENT_VERSION = '2510260332';
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
