import { createWalletClient, createPublicClient, http, defineChain, parseAbi } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

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
// Исключает гонку потоков и ошибки "nonce too low" / "replacement underpriced"
// при одновременных ходах нескольких игроков.
let txQueuePromise = Promise.resolve();
let localNonce = null;
let lastNonceSyncTime = 0;

async function executeQueuedTx(publicClient, walletClient, sponsorAddress, writeAction) {
  // Сериализуем выполнение в строгую очередь FIFO
  const result = new Promise((resolve, reject) => {
    txQueuePromise = txQueuePromise.then(async () => {
      try {
        const now = Date.now();
        // Синхронизируем базовый nonce из сети, если прошло больше 15 секунд или локальный nonce пуст
        if (localNonce === null || (now - lastNonceSyncTime) > 15000) {
          const onchainNonce = await publicClient.getTransactionCount({
            address: sponsorAddress,
            blockTag: 'pending'
          });
          localNonce = Number(onchainNonce);
          lastNonceSyncTime = now;
        }

        const currentNonce = localNonce;
        localNonce++; // Локально резервируем следующий nonce для параллельных запросов в очереди

        const hash = await writeAction(currentNonce);
        resolve(hash);
      } catch (err) {
        // При ошибке рассинхрона nonce сбрасываем локальный кэш
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

    if (request.method === 'GET' && url.pathname === '/') {
      return jsonResponse({
        status: 'online',
        service: 'Infinity-Verse Cryptographic Session Relayer',
        contract: env.CONTRACT_ADDRESS,
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
        if (!idToken) {
          return jsonResponse({ error: 'idToken is required' }, 400);
        }

        const clientId = env.GOOGLE_CLIENT_ID;
        if (!clientId) {
          return jsonResponse({ error: 'GOOGLE_CLIENT_ID not configured in worker' }, 500);
        }

        const masterKeyHex = env.WALLET_MASTER_KEY;
        if (!masterKeyHex) {
          return jsonResponse({ error: 'WALLET_MASTER_KEY secret not configured in worker' }, 500);
        }

        // Проверяем токен у Google
        const googleUser = await verifyGoogleIdToken(idToken, clientId);
        const sub = googleUser.sub; // Уникальный неизменный ID пользователя Google
        const kvKey = `google_user:${sub}`;

        let walletRecord = await env.GOOGLE_WALLETS.get(kvKey, { type: 'json' });

        if (!walletRecord) {
          // Пользователь первый раз — генерируем новый EVM приватник
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

        // Возвращаем фронтенду публичный адрес игрока (приватник НЕ передается)
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
    // Браузер генерирует RAM-сессию, шлет idToken + sessionKey, Worker сам подписывает
    // onchain-авторизацию сессии расшифрованным в памяти приватником и отправляет tx.
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

        // Расшифровываем ключ строго в оперативной памяти воркера для подписи
        const playerPrivateKey = await decryptPrivateKey(walletRecord.encryptedKey, env.WALLET_MASTER_KEY);
        const playerAccount = privateKeyToAccount(playerPrivateKey);

        const monadTestnet = defineChain({
          id: Number(env.CHAIN_ID || 10143),
          name: 'Monad Testnet',
          nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
          rpcUrls: { default: { http: [env.RPC_URL] } }
        });

        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(env.RPC_URL)
        });

        // Получаем nonce игрока для безопасной подписи EIP-191
        const playerNonce = await publicClient.readContract({
          address: env.CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'nonces',
          args: [playerAccount.address]
        });

        const domain = {
          name: 'InfinityVerse',
          version: '1',
          chainId: BigInt(env.CHAIN_ID || 10143),
          verifyingContract: env.CONTRACT_ADDRESS
        };

        const types = {
          AuthorizeSession: [
            { name: 'player', type: 'address' },
            { name: 'sessionKey', type: 'address' },
            { name: 'expiry', type: 'uint256' },
            { name: 'nonce', type: 'uint256' }
          ]
        };

        const sig = await playerAccount.signTypedData({
          domain,
          types,
          primaryType: 'AuthorizeSession',
          message: {
            player: playerAccount.address,
            sessionKey,
            expiry: BigInt(expiry),
            nonce: playerNonce
          }
        });

        // Отправляем транзакцию через спонсора релеера
        const sponsorAccount = privateKeyToAccount(env.SPONSOR_PRIVATE_KEY);
        const walletClient = createWalletClient({
          account: sponsorAccount,
          chain: monadTestnet,
          transport: http(env.RPC_URL)
        });

        const hash = await executeQueuedTx(publicClient, walletClient, sponsorAccount.address, (nonce) =>
          walletClient.writeContract({
            address: env.CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'authorizeSessionWithSig',
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
    // === ВЫВОД МОНЕТ (TRANSFER MON) С GOOGLE EMBEDDED WALLET НА СВОЙ КОШЕЛЕК ===
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

        const monadTestnet = defineChain({
          id: Number(env.CHAIN_ID || 10143),
          name: 'Monad Testnet',
          nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
          rpcUrls: { default: { http: [env.RPC_URL] } }
        });

        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(env.RPC_URL)
        });

        const balance = await publicClient.getBalance({ address: playerAccount.address });
        if (balance <= 0n) {
          return jsonResponse({ error: 'Balance is 0 MON' }, 400);
        }

        // Оставляем запас на gas (например ~0.005 MON), остальное отправляем
        const gasBuffer = 5000000000000000n; // 0.005 MON
        if (balance <= gasBuffer) {
          return jsonResponse({ error: 'Balance too low to cover transaction gas fee' }, 400);
        }

        const amountToSend = balance - gasBuffer;

        const playerWalletClient = createWalletClient({
          account: playerAccount,
          chain: monadTestnet,
          transport: http(env.RPC_URL)
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

          const hash = await executeQueuedTx(publicClient, walletClient, account.address, (nonce) =>
            walletClient.writeContract({
              address: env.CONTRACT_ADDRESS,
              abi: VERSE_ABI,
              functionName: 'authorizeSessionWithSig',
              args: [player, sessionKey, BigInt(expiry), sig],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 1.1 Отзыв сессии игрока (кошелёк игрока подписывает команду отзыва)
        if (action === 'revoke_session') {
          if (!sig) {
            return jsonResponse({ error: 'sig required for revoke' }, 400);
          }

          const hash = await executeQueuedTx(publicClient, walletClient, account.address, (nonce) =>
            walletClient.writeContract({
              address: env.CONTRACT_ADDRESS,
              abi: VERSE_ABI,
              functionName: 'revokeSessionWithSig',
              args: [player, sig],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 2. Спавн игрока в мир
        if (action === 'spawn') {
          const hash = await executeQueuedTx(publicClient, walletClient, account.address, (nonce) =>
            walletClient.writeContract({
              address: env.CONTRACT_ADDRESS,
              abi: VERSE_ABI,
              functionName: 'spawn',
              args: [player],
              nonce
            })
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return jsonResponse({ success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() });
        }

        // 3. Защищённый криптографический ход с подписью сессионного ключа
        if (action === 'move') {
          if (targetX === undefined || targetY === undefined || !moveSig) {
            return jsonResponse({ error: 'targetX, targetY and moveSig required' }, 400);
          }

          const hash = await executeQueuedTx(publicClient, walletClient, account.address, (nonce) =>
            walletClient.writeContract({
              address: env.CONTRACT_ADDRESS,
              abi: VERSE_ABI,
              functionName: 'moveWithSession',
              args: [player, Number(targetX), Number(targetY), moveSig],
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
