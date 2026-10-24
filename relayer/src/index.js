import { createWalletClient, createPublicClient, http, defineChain, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const VERSE_ABI = parseAbi([
  'function spawn(address player) returns (int32, int32)',
  'function authorizeSessionWithSig(address player, address sessionKey, uint256 expiry, bytes sig)',
  'function revokeSessionWithSig(address player, bytes sig)',
  'function moveWithSession(address player, int32 targetX, int32 targetY, bytes moveSig)',
  'function getPlayer(address player) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry)',
  'function nonces(address player) view returns (uint256)'
]);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return jsonResponse({
        status: 'online',
        service: 'Infinity-Verse Cryptographic Session Relayer',
        contract: env.CONTRACT_ADDRESS,
        timestamp: Date.now()
      });
    }

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { action, player, sessionKey, expiry, sig, targetX, targetY, moveSig } = body;

        if (!player || !player.startsWith('0x')) {
          return jsonResponse({ error: 'Invalid player address' }, 400);
        }

        const sponsorPk = env.SPONSOR_PRIVATE_KEY;
        if (!sponsorPk) {
          return jsonResponse({ error: 'SPONSOR_PRIVATE_KEY secret is not set in Worker' }, 500);
        }

        const monadTestnet = defineChain({
          id: Number(env.CHAIN_ID || 10143),
          name: 'Monad Testnet',
          nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
          rpcUrls: { default: { http: [env.RPC_URL] } }
        });

        const account = privateKeyToAccount(sponsorPk);
        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(env.RPC_URL)
        });

        const walletClient = createWalletClient({
          account,
          chain: monadTestnet,
          transport: http(env.RPC_URL)
        });

        // 1. Авторизация сессии игрока (кошелёк игрока подписывает сессионный ключ)
        if (action === 'authorize_session') {
          if (!sessionKey || !expiry || !sig) {
            return jsonResponse({ error: 'sessionKey, expiry, sig required' }, 400);
          }

          const hash = await walletClient.writeContract({
            address: env.CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'authorizeSessionWithSig',
            args: [player, sessionKey, BigInt(expiry), sig]
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 1.1 Отзыв сессии игрока (кошелёк игрока подписывает команду отзыва)
        if (action === 'revoke_session') {
          if (!sig) {
            return jsonResponse({ error: 'sig required for revoke' }, 400);
          }

          const hash = await walletClient.writeContract({
            address: env.CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'revokeSessionWithSig',
            args: [player, sig]
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 2. Спавн игрока в мир
        if (action === 'spawn') {
          const hash = await walletClient.writeContract({
            address: env.CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'spawn',
            args: [player]
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 3. Защищённый криптографический ход с подписью сессионного ключа
        if (action === 'move') {
          if (targetX === undefined || targetY === undefined || !moveSig) {
            return jsonResponse({ error: 'targetX, targetY and moveSig required' }, 400);
          }

          const hash = await walletClient.writeContract({
            address: env.CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'moveWithSession',
            args: [player, Number(targetX), Number(targetY), moveSig]
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        return jsonResponse({ error: 'Unknown action' }, 400);
      } catch (err) {
        console.error('Relayer error:', err);
        return jsonResponse({
          error: err.shortMessage || err.message || 'Transaction failed'
        }, 500);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
};
