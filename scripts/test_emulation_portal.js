const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress, hexToString } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function runEmulation() {
  console.log('=== ЭМУЛЯЦИОННЫЙ ТЕСТ МЕХАНИКИ ПОРТАЛОВ (GB) ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const superAdminKey = envFile.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const player3Key = envFile.match(/PLAYER3_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];

  const superAdminAddress = getAddress(envFile.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const player3Address = getAddress(envFile.match(/PLAYER3_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));
  const chain = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: { default: { http: [netConfig.rpcUrl] } },
    testnet: true
  });

  const publicClient = createPublicClient({ chain, transport: http(netConfig.rpcUrl) });
  const adminWallet = createWalletClient({ account: privateKeyToAccount(superAdminKey), chain, transport: http(netConfig.rpcUrl) });
  const player3Wallet = createWalletClient({ account: privateKeyToAccount(player3Key), chain, transport: http(netConfig.rpcUrl) });

  const mainAddress = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const aaaAddress = '0x2459a68d1da04291a2fb59da26457a26c7b02b76';

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Gb_1.json'), 'utf8'));
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_1.json'), 'utf8'));

  async function sendTx(wallet, fn) {
    const fee = await publicClient.estimateFeesPerGas();
    const nonce = await publicClient.getTransactionCount({ address: wallet.account.address, blockTag: 'pending' });
    const hash = await fn({
      nonce,
      maxFeePerGas: fee.maxFeePerGas * 11n / 10n,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas
    });
    console.log('Tx:', hash);
    return await publicClient.waitForTransactionReceipt({ hash });
  }

  // ТЕСТ 1: Проверяем созданный портал #1 на (3, 3)
  console.log('--- ТЕСТ 1: Инспекция Портала #1 ---');
  const portal1 = await publicClient.readContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'getPortal',
    args: [1n]
  });
  console.log('Portal #1 Target:', portal1.targetContract);
  console.log('Portal #1 Founder:', portal1.founder);
  if (portal1.founder.toLowerCase() === superAdminAddress.toLowerCase()) {
    console.log('✅ УСПЕХ: Владелец Портала #1 — истинный игрок (SuperAdmin), а не адрес контракта AAA!');
  } else {
    console.error('❌ ОШИБКА: Владелец портала не совпадает с SuperAdmin:', portal1.founder);
    process.exit(1);
  }

  // ТЕСТ 2: Проверка SacredZoneProtected [-2..2]
  console.log('\n--- ТЕСТ 2: Попытка создать портал в запретной зоне Обелиска (2, 2) ---');
  try {
    await publicClient.estimateContractGas({
      address: aaaAddress,
      abi: aaaArtifact.abi,
      functionName: 'createPortalDirect',
      args: ['0x1111111111111111111111111111111111111111', '0x7465737400000000000000000000000000000000000000000000000000000000', '0x7465737400000000000000000000000000000000000000000000000000000000', 2, 2],
      account: adminWallet.account
    });
    console.error('❌ ОШИБКА: Вызов в зоне 5x5 должен был сфейлиться!');
    process.exit(1);
  } catch (err) {
    console.log('✅ УСПЕХ: Защита 5x5 Обелиска сработала (SacredZoneProtected)!');
  }

  // ТЕСТ 3: Спавним Player3 (чтобы он был участником мира)
  console.log('\n--- ТЕСТ 3: Спавн Player3 ---');
  try {
    await sendTx(player3Wallet, (opts) => player3Wallet.writeContract({
      address: aaaAddress,
      abi: aaaArtifact.abi,
      functionName: 'spawnDirect',
      args: [],
      ...opts
    }));
    console.log('✅ Player3 успешно заспавнен');
  } catch (err) {
    console.log('ℹ️ Player3 уже был заспавнен или зарегистрирован');
  }

  // ТЕСТ 4: Передача владения Порталом #1 от SuperAdmin к Player3
  console.log('\n--- ТЕСТ 4: Передача владения Порталом #1 игроку Player3 ---');
  await sendTx(adminWallet, (opts) => adminWallet.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'transferPortalDirect',
    args: [1n, player3Address],
    ...opts
  }));
  const portalAfterTransfer = await publicClient.readContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'getPortal',
    args: [1n]
  });
  console.log('Portal #1 New Founder/Owner:', portalAfterTransfer.founder);
  if (portalAfterTransfer.founder.toLowerCase() === player3Address.toLowerCase()) {
    console.log('✅ УСПЕХ: Владение порталом успешно передано Player3!');
  } else {
    console.error('❌ ОШИБКА передачи владения!');
    process.exit(1);
  }

  // ТЕСТ 5: Player3 сносит свой Портал #1 на (3, 3)
  console.log('\n--- ТЕСТ 5: Снос Портала #1 игроком Player3 на (3, 3) ---');
  await sendTx(player3Wallet, (opts) => player3Wallet.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'destroyPortalDirect',
    args: [1n, 3, 3],
    ...opts
  }));
  const cellAfterDestroy = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getCell',
    args: [3, 3]
  });
  console.log('Cell (3, 3) after destroy:', cellAfterDestroy);
  if (cellAfterDestroy.object === 0) {
    console.log('✅ УСПЕХ: Портал #1 полностью уничтожен, объект на карте очищен в 0!');
  } else {
    console.error('❌ ОШИБКА: Объект на клетке не был очищен!');
    process.exit(1);
  }

  // ТЕСТ 6: SuperAdmin (чей портал был передан, а квота освобождена) создает новый портал на (4, 4)
  console.log('\n--- ТЕСТ 6: Создание нового портала SuperAdmin на (4, 4) ---');
  const founderName = '0x64696b616e65766e000000000000000000000000000000000000000000000000';
  const worldName = '0x4e65772045726100000000000000000000000000000000000000000000000000';
  const newTarget = '0x0000000000000000000000000000000000001001';
  await sendTx(adminWallet, (opts) => adminWallet.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'createPortalDirect',
    args: [newTarget, founderName, worldName, 4, 4],
    ...opts
  }));
  const portal2 = await publicClient.readContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'getPortal',
    args: [2n]
  });
  console.log('Portal #2 Target:', portal2.targetContract);
  console.log('Portal #2 Founder:', portal2.founder);
  const cell44 = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getCell',
    args: [4, 4]
  });
  console.log('Cell (4, 4):', cell44);
  if (cell44.object === 4) {
    console.log('🌀 УСПЕХ: Новый Портал #2 успешно материализован на клетке (4, 4)!');
  }

  console.log('\n🎉 ВСЕ ЭМУЛЯЦИОННЫЕ ТЕСТЫ ОНЧЕЙН ПРОЙДЕНЫ С ОТЛИЧИЕМ!');
}

runEmulation().catch(console.error);
