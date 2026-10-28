// scripts/test_player4_spawn.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress, keccak256, encodePacked } = require('viem');
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');

async function main() {
  console.log('=== ТЕСТИРОВАНИЕ СПАВНА И АВТОРИЗАЦИИ СЕССИИ ИГРОКОМ 4 ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const player4Key = envFile.match(/PLAYER4_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const player4Account = privateKeyToAccount(player4Key);
  const player4Address = player4Account.address;

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));
  const chain = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: { default: { http: [netConfig.rpcUrl] } },
    testnet: true
  });

  const publicClient = createPublicClient({ chain, transport: http(netConfig.rpcUrl) });
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_1.json'), 'utf8'));
  const contractsCfg = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts'), 'utf8');
  const aaaAddress = contractsCfg.match(/AAA_CONTRACT_ADDRESS = '(0x[a-fA-F0-9]{40})'/)[1];
  const relayerUrl = 'https://infinity-verse-relayer.infinity-verse.workers.dev';

  console.log('Player 4 Address:', player4Address);
  console.log('AAA Contract:    ', aaaAddress);
  console.log('Relayer URL:     ', relayerUrl);

  // 1. Проверяем состояние Игрока 4 в контракте
  const pData = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getPlayer',
    args: [player4Address]
  });
  console.log('\nТекущее состояние в блокчейне:');
  console.log('Exists:', pData[2], 'X:', pData[0], 'Y:', pData[1], 'SessionKey:', pData[3]);

  // 2. Генерируем временный сессионный ключ (как в RAM браузера)
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  console.log('\nСгенерирован тестовый SessionKey:', sessionAccount.address);

  // 3. Получаем актуальный nonce
  const nonce = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'nonces',
    args: [player4Address]
  });
  console.log('Nonce:', nonce.toString());

  // 4. Подписываем AuthorizeSession кошельком игрока (EIP-191)
  const expiry = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 дней
  const authInnerHash = keccak256(
    encodePacked(
      ['string', 'address', 'address', 'uint256', 'uint256', 'uint256'],
      ['AuthorizeSession', player4Address, sessionAccount.address, BigInt(expiry), nonce, BigInt(10143)]
    )
  );
  const authSig = await player4Account.signMessage({
    message: { raw: authInnerHash }
  });

  console.log('\n--- Шаг 1: Авторизация сессии через Relayer (action: authorize_session) ---');
  const authRes = await fetch(relayerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'authorize_session',
      player: player4Address,
      sessionKey: sessionAccount.address,
      expiry,
      sig: authSig
    })
  });
  const authData = await authRes.json();
  console.log('Ответ Relayer при авторизации сессии:', authData);

  // 5. Проверяем, записалась ли сессия в ончейн
  const pDataAfterAuth = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getPlayer',
    args: [player4Address]
  });
  console.log('Ончейн SessionKey после авторизации:', pDataAfterAuth[3]);

  // 6. Подписываем Spawn сессионным ключом (как это делает клиент!)
  const updatedNonce = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'nonces',
    args: [player4Address]
  });
  console.log('\n--- Шаг 2: Спавн игрока через сессионный ключ (action: spawn) ---');
  console.log('Updated Nonce для Spawn:', updatedNonce.toString());

  const spawnInnerHash = keccak256(
    encodePacked(
      ['string', 'address', 'uint256', 'uint256'],
      ['Spawn', player4Address, updatedNonce, BigInt(10143)]
    )
  );
  const spawnSig = await sessionAccount.signMessage({
    message: { raw: spawnInnerHash }
  });

  const spawnRes = await fetch(relayerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'spawn',
      player: player4Address,
      sig: spawnSig
    })
  });
  const spawnData = await spawnRes.json();
  console.log('Ответ Relayer при spawn:', spawnData);

  // 7. Итоговое состояние
  const pDataFinal = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getPlayer',
    args: [player4Address]
  });
  console.log('\n🎉 Итоговое состояние Player 4:');
  console.log('Exists:', pDataFinal[2], 'X:', pDataFinal[0], 'Y:', pDataFinal[1]);
}

main().catch(console.error);
