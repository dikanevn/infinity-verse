import { createPublicClient, http, parseAbi, defineChain } from 'viem';

export const CONTRACT_ADDRESS = '0x171814e6567896597dc79311b48f70ab6a79ced6';
export const RPC_URL = 'https://testnet-rpc.monad.xyz';
export const RELAYER_URL = 'https://infinity-verse-relayer.infinity-verse.workers.dev';
export const CLIENT_VERSION = '0.0.0.0.15';
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

export const VERSE_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function getCellKey(int32 x, int32 y) pure returns (bytes32)',
  'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint16 paramA, uint16 paramB))',
  'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint16 paramA, uint16 paramB)[])',
  'function getPlayer(address player) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry)',
  'function spawn(address player) returns (int32, int32)',
  'function moveDirect(int32 targetX, int32 targetY)',
  'function authorizeSessionWithSig(address player, address sessionKey, uint256 expiry, bytes sig)',
  'function revokeSessionWithSig(address player, bytes sig)',
  'function revokeSessionDirect()',
  'function moveWithSession(address player, int32 targetX, int32 targetY, bytes moveSig)',
  'function nonces(address player) view returns (uint256)'
]);

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL)
});
