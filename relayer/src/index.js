import { createWalletClient, createPublicClient, http, defineChain, parseAbi, keccak256, encodePacked } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

// ============================================================================
// === АКТУАЛЬНЫЕ АДРЕСА ЭПОХИ GA (MAIN_GA_1 + СИММЕТРИЧНЫЙ GA_AAA) ===
// ============================================================================
const MAIN_GA1_ADDRESS = '0xf32bd8705ee1c7682d9a5f2d00b18815929d4482';
const AAA_ADDRESS = '0x90fb2752cd408d727029243cf5f913e1c331053e';

// ABI для чтения нонсов и состояния из хранилища Main_G_2
const MAIN_ABI = parseAbi([
  'function nonces(address player) view returns (uint256)',
  'function getPlayer(address player) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry, uint256 registeredAtBlock, uint256 registeredAtTimestamp)'
]);

// Симметричный ABI логического модуля AAA (все спонсируемые действия: ...Gasless)
const AAA_ABI = parseAbi([
  'function spawnGasless(address player, bytes sig)',
  'function moveGasless(address player, int32 targetX, int32 targetY, bytes sig)',
  'function discoverCellGasless(address player, int32 targetX, int32 targetY, bytes sig)',
  'function discoverCellsBatchGasless(address player, int32[] xs, int32[] ys, bytes sig)',
  'function authorizeSessionGasless(address player, address sessionKey, uint256 expiry, bytes sig)',
  'function revokeSessionGasless(address player, bytes sig)'
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

// ============================================================================
// === КРИПТОГРАФИЯ ДЛЯ EMBEDDED КОШЕЛЬКОВ GOOGLE (AES-GCM-256) ===
// ============================================================================
function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(clean.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getMasterCryptoKey(masterKeyHex) {
  const keyBytes = hexToBytes(masterKeyHex);
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPrivateKey(privateKey, masterKeyHex) {
  const cryptoKey = await getMasterCryptoKey(masterKeyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(privateKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );
  return {
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(encrypted))
  };
}

async function decryptPrivateKey(encryptedObj, masterKeyHex) {
  const cryptoKey = await getMasterCryptoKey(masterKeyHex);
  const iv = hexToBytes(encryptedObj.iv);
  const ciphertext = hexToBytes(encryptedObj.ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// Проверка Google id_token через официальный endpoint Google
async function verifyGoogleIdToken(idToken, expectedClientId) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    throw new Error('Invalid Google id_token');
  }
  const payload = await res.json();
  if (payload.aud !== expectedClientId) {
    throw new Error('Google token aud mismatch');
  }
  if (!payload.sub) {
    throw new Error('Missing Google sub');
  }
  return payload;
}

// ============================================================================
// === ОЧЕРЕДЬ ТРАНЗАКЦИЙ И УПРАВЛЕНИЕ NONCE СПОНСОРА (FIFO TRANSACTION QUEUE) ===
// ============================================================================
let txQueuePromise = Promise.resolve();
let localNonce = null;
let lastNonceSyncTime = 0;

async function executeQueuedTx(publicClient, sponsorAddress, writeAction) {
  const result = new Promise((resolve, reject) => {
    txQueuePromise = txQueuePromise.then(async () => {
      try {
        const now = Date.now();
        if (localNonce === null || (now - lastNonceSyncTime) > 15000) {
          const onchainNonce = await publicClient.getTransactionCount({
            address: sponsorAddress,
            blockTag: 'pending'
          });
          localNonce = Number(onchainNonce);
          lastNonceSyncTime = now;
        }

        const currentNonce = localNonce;
        localNonce++;

        const hash = await writeAction(currentNonce);
        resolve(hash);
      } catch (err) {
        localNonce = null;
        reject(err);
      }
    });
  });

  return await result;
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

    const mainContractAddress = env.MAIN_CONTRACT_ADDRESS || MAIN_GA1_ADDRESS;
    const aaaContractAddress = env.AAA_CONTRACT_ADDRESS || AAA_ADDRESS;
    const rpcUrl = env.RPC_URL || 'https://testnet-rpc.monad.xyz';
    const chainId = Number(env.CHAIN_ID || 10143);

    const monadTestnet = defineChain({
      id: chainId,
      name: 'Monad Testnet',
      nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
      rpcUrls: { default: { http: [rpcUrl] } }
    });

    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(rpcUrl)
    });

    if (request.method === 'GET' && url.pathname === '/') {
      return jsonResponse({
        status: 'online',
        service: 'Infinity-Verse Cryptographic Session Relayer',
        mainContract: mainContractAddress,
        aaaContract: aaaContractAddress,
        timestamp: Date.now()
      });
    }

    // ============================================================================
    // === GOOGLE OAUTH: ВХОД И СОЗДАНИЕ/ПОЛУЧЕНИЕ ЗАЩИЩЕННОГО EMBEDDED WALLET ===
    // ============================================================================
    if (request.method === 'POST' && url.pathname === '/auth/google') {
      try {
        const body = await request.json();
        const { idToken } = body;
        if (!idToken) return jsonResponse({ error: 'idToken is required' }, 400);

        const clientId = env.GOOGLE_CLIENT_ID;
        const masterKeyHex = env.WALLET_MASTER_KEY;
        if (!clientId || !masterKeyHex) {
          return jsonResponse({ error: 'Worker secrets not configured' }, 500);
        }

        const googleUser = await verifyGoogleIdToken(idToken, clientId);
        const kvKey = `google_user:${googleUser.sub}`;
        let walletRecord = await env.GOOGLE_WALLETS.get(kvKey, { type: 'json' });

        if (!walletRecord) {
          const newPrivateKey = generatePrivateKey();
          const newAccount = privateKeyToAccount(newPrivateKey);
          const encrypted = await encryptPrivateKey(newPrivateKey, masterKeyHex);

          walletRecord = {
            address: newAccount.address,
            email: googleUser.email,
            encryptedKey: encrypted,
            createdAt: Date.now()
          };

          await env.GOOGLE_WALLETS.put(kvKey, JSON.stringify(walletRecord));
        }

        return jsonResponse({
          success: true,
          address: walletRecord.address,
          email: walletRecord.email,
          isNew: !walletRecord.createdAt || (Date.now() - walletRecord.createdAt < 5000)
        });
      } catch (err) {
        console.error('Google auth error:', err);
        return jsonResponse({ error: err.message || 'Google authentication failed' }, 401);
      }
    }

    // ============================================================================
    // === АВТОРИЗАЦИЯ СЕССИИ ДЛЯ GOOGLE WALLET ===
    // ============================================================================
    if (request.method === 'POST' && url.pathname === '/auth/google/authorize-session') {
      try {
        const body = await request.json();
        const { idToken, sessionKey, expiry } = body;
        if (!idToken || !sessionKey || !expiry) {
          return jsonResponse({ error: 'idToken, sessionKey, expiry required' }, 400);
        }

        const googleUser = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
        const kvKey = `google_user:${googleUser.sub}`;
        const walletRecord = await env.GOOGLE_WALLETS.get(kvKey, { type: 'json' });

        if (!walletRecord || !walletRecord.encryptedKey) {
          return jsonResponse({ error: 'Wallet not found for this Google account' }, 404);
        }

        const playerPrivateKey = await decryptPrivateKey(walletRecord.encryptedKey, env.WALLET_MASTER_KEY);
        const playerAccount = privateKeyToAccount(playerPrivateKey);

        const playerNonce = await publicClient.readContract({
          address: aaaContractAddress,
          abi: AAA_ABI,
          functionName: 'nonces',
          args: [playerAccount.address]
        });

        const innerHash = keccak256(
          encodePacked(
            ['string', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            ['AuthorizeSession', playerAccount.address, sessionKey, BigInt(expiry), playerNonce, BigInt(chainId)]
          )
        );

        const sig = await playerAccount.signMessage({
          message: { raw: innerHash }
        });

        const sponsorAccount = privateKeyToAccount(env.SPONSOR_PRIVATE_KEY);
        const walletClient = createWalletClient({
          account: sponsorAccount,
          chain: monadTestnet,
          transport: http(rpcUrl)
        });

        const hash = await executeQueuedTx(publicClient, sponsorAccount.address, (nonce) =>
          walletClient.writeContract({
            address: aaaContractAddress,
            abi: AAA_ABI,
            functionName: 'authorizeSessionGasless',
            args: [playerAccount.address, sessionKey, BigInt(expiry), sig],
            nonce
          })
        );

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return jsonResponse({
          success: true,
          player: playerAccount.address,
          txHash: hash,
          blockNumber: receipt.blockNumber.toString()
        });
      } catch (err) {
        console.error('Authorize Google session error:', err);
        return jsonResponse({ error: err.shortMessage || err.message || 'Authorization failed' }, 500);
      }
    }

    // ============================================================================
    // === ВЫВОД МОНЕТ (TRANSFER MON) С GOOGLE EMBEDDED WALLET ===
    // ============================================================================
    if (request.method === 'POST' && url.pathname === '/auth/google/withdraw') {
      try {
        const body = await request.json();
        const { idToken, targetAddress } = body;
        if (!idToken || !targetAddress || !targetAddress.startsWith('0x')) {
          return jsonResponse({ error: 'idToken and valid targetAddress required' }, 400);
        }

        const googleUser = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
        const kvKey = `google_user:${googleUser.sub}`;
        const walletRecord = await env.GOOGLE_WALLETS.get(kvKey, { type: 'json' });

        if (!walletRecord || !walletRecord.encryptedKey) {
          return jsonResponse({ error: 'Wallet not found' }, 404);
        }

        const playerPrivateKey = await decryptPrivateKey(walletRecord.encryptedKey, env.WALLET_MASTER_KEY);
        const playerAccount = privateKeyToAccount(playerPrivateKey);

        const balance = await publicClient.getBalance({ address: playerAccount.address });
        const gasBuffer = 5000000000000000n; // 0.005 MON
        if (balance <= gasBuffer) {
          return jsonResponse({ error: 'Balance too low to cover transaction gas fee' }, 400);
        }

        const amountToSend = balance - gasBuffer;
        const playerWalletClient = createWalletClient({
          account: playerAccount,
          chain: monadTestnet,
          transport: http(rpcUrl)
        });

        const hash = await playerWalletClient.sendTransaction({
          to: targetAddress,
          value: amountToSend
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return jsonResponse({
          success: true,
          txHash: hash,
          sentAmount: amountToSend.toString(),
          targetAddress,
          blockNumber: receipt.blockNumber.toString()
        });
      } catch (err) {
        console.error('Withdraw error:', err);
        return jsonResponse({ error: err.shortMessage || err.message || 'Withdrawal failed' }, 500);
      }
    }

    // ============================================================================
    // === УНИВЕРСАЛЬНЫЕ СПОНСИРУЕМЫЕ ОНЧЕЙН-ДЕЙСТВИЯ (GASLESS) ===
    // ============================================================================
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

        const sponsorAccount = privateKeyToAccount(sponsorPk);
        const walletClient = createWalletClient({
          account: sponsorAccount,
          chain: monadTestnet,
          transport: http(rpcUrl)
        });

        // 1. Авторизация сессии игрока (authorizeSessionGasless)
        if (action === 'authorize_session') {
          if (!sessionKey || !expiry || !sig) {
            return jsonResponse({ error: 'sessionKey, expiry, sig required' }, 400);
          }

          const hash = await executeQueuedTx(publicClient, sponsorAccount.address, (nonce) =>
            walletClient.writeContract({
              address: aaaContractAddress,
              abi: AAA_ABI,
              functionName: 'authorizeSessionGasless',
              args: [player, sessionKey, BigInt(expiry), sig],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 2. Отзыв сессии игрока (revokeSessionGasless)
        if (action === 'revoke_session') {
          if (!sig) return jsonResponse({ error: 'sig required for revoke' }, 400);

          const hash = await executeQueuedTx(publicClient, sponsorAccount.address, (nonce) =>
            walletClient.writeContract({
              address: aaaContractAddress,
              abi: AAA_ABI,
              functionName: 'revokeSessionGasless',
              args: [player, sig],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 3. Спавн игрока в мир (spawnGasless)
        if (action === 'spawn') {
          if (!sig) return jsonResponse({ error: 'sig required for spawn' }, 400);

          const hash = await executeQueuedTx(publicClient, sponsorAccount.address, (nonce) =>
            walletClient.writeContract({
              address: aaaContractAddress,
              abi: AAA_ABI,
              functionName: 'spawnGasless',
              args: [player, sig],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 4. Криптографический ход с подписью сессии (moveGasless)
        if (action === 'move') {
          if (targetX === undefined || targetY === undefined || !moveSig) {
            return jsonResponse({ error: 'targetX, targetY and moveSig required' }, 400);
          }

          const hash = await executeQueuedTx(publicClient, sponsorAccount.address, (nonce) =>
            walletClient.writeContract({
              address: aaaContractAddress,
              abi: AAA_ABI,
              functionName: 'moveGasless',
              args: [player, Number(targetX), Number(targetY), moveSig],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 5. Разведка/создание 1 клетки песка (discoverCellGasless)
        if (action === 'discover_cell') {
          if (targetX === undefined || targetY === undefined || !sig) {
            return jsonResponse({ error: 'targetX, targetY and sig required' }, 400);
          }

          const hash = await executeQueuedTx(publicClient, sponsorAccount.address, (nonce) =>
            walletClient.writeContract({
              address: aaaContractAddress,
              abi: AAA_ABI,
              functionName: 'discoverCellGasless',
              args: [player, Number(targetX), Number(targetY), sig],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 6. Пакетная разведка/создание до 9 клеток песка (discoverCellsBatchGasless)
        if (action === 'discover_batch') {
          const { xs, ys } = body;
          if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length === 0 || !sig) {
            return jsonResponse({ error: 'xs, ys arrays and sig required' }, 400);
          }

          const parsedXs = xs.map(Number);
          const parsedYs = ys.map(Number);

          const hash = await executeQueuedTx(publicClient, sponsorAccount.address, (nonce) =>
            walletClient.writeContract({
              address: aaaContractAddress,
              abi: AAA_ABI,
              functionName: 'discoverCellsBatchGasless',
              args: [player, parsedXs, parsedYs, sig],
              nonce
            })
          );
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
