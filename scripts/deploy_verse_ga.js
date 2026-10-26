// scripts/deploy_verse_ga.js
// Скрипт деплоя и авторизации эпохи Ga (Поколение 1):
// 1. InfinityVerse_Main_Ga_1 (Постоянный универсальный диск)
// 2. InfinityVerse_Ga_AAA (Высокопроизводительный игровой модуль логики)
// 3. Авторизация Ga_AAA в Main_Ga_1 (allowAdmin с правами CLEARANCE_1)
// 4. Инициализация стартовой точки мира (0, 0 - Обелиск)

const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ДЕПЛОЙ ЭПОХИ GA (MAIN_GA_1 + GA_AAA) В MONAD TESTNET ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const sponsorAddress = getAddress(envFile.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));

  const monadTestnet = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: {
      decimals: 18,
      name: netConfig.currencySymbol,
      symbol: netConfig.currencySymbol,
    },
    rpcUrls: {
      default: { http: [netConfig.rpcUrl] },
      public: { http: [netConfig.rpcUrl] },
    },
    testnet: true,
  });

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http(netConfig.rpcUrl) });
  const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http(netConfig.rpcUrl) });

  console.log('Deployer Address:', account.address);
  console.log('Sponsor/Relayer Address:', sponsorAddress);
  const bal = await publicClient.getBalance({ address: account.address });
  console.log('Deployer Balance:', Number(bal) / 1e18, netConfig.currencySymbol);

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Ga_1.json'), 'utf8'));
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_AAA.json'), 'utf8'));

  // 1. Деплой InfinityVerse_Main_Ga_1 (Gen 1, без предка)
  console.log('\n1. Отправка транзакции деплоя InfinityVerse_Main_Ga_1 (Root Gen 1)...');
  const mainDeployHash = await walletClient.deployContract({
    abi: mainArtifact.abi,
    bytecode: mainArtifact.bytecode,
    args: ['0x0000000000000000000000000000000000000000']
  });
  console.log('Main_Ga_1 Tx Hash:', mainDeployHash);
  const mainReceipt = await publicClient.waitForTransactionReceipt({ hash: mainDeployHash, timeout: 120_000, retryCount: 60 });
  const mainAddress = mainReceipt.contractAddress;
  console.log('✅ InfinityVerse_Main_Ga_1 развернут по адресу:', mainAddress);

  // 2. Деплой InfinityVerse_Ga_AAA (Логика)
  console.log('\n2. Отправка транзакции деплоя InfinityVerse_Ga_AAA...');
  const aaaDeployHash = await walletClient.deployContract({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress]
  });
  console.log('Ga_AAA Tx Hash:', aaaDeployHash);
  const aaaReceipt = await publicClient.waitForTransactionReceipt({ hash: aaaDeployHash, timeout: 120_000, retryCount: 60 });
  const aaaAddress = aaaReceipt.contractAddress;
  console.log('✅ InfinityVerse_Ga_AAA развернут по адресу:', aaaAddress);

  // 3. Авторизация Ga_AAA в Main_Ga_1 с допуском CLEARANCE_1
  // CLEARANCE_1 = 1 << 0 = 1
  console.log('\n3. Авторизация: allowAdmin(Ga_AAA, CLEARANCE_1) в Main_Ga_1...');
  const allowHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'allowAdmin',
    args: [
      aaaAddress,
      1,     // perms: CLEARANCE_1 (доступ к Raw Disk и Eternal Storage)
      1,     // role: 1 (Game Engine)
      0,     // validFrom: 0 (сразу)
      0n,    // validUntil: 0 (бессрочно)
      0, 0, 0, 0 // params A-D
    ]
  });
  console.log('AllowAdmin Tx Hash:', allowHash);
  await publicClient.waitForTransactionReceipt({ hash: allowHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Модуль Ga_AAA успешно авторизован в Main_Ga_1!');

  // 4. Инициализация начальной точки мира (Обелиск на 0, 0)
  console.log('\n4. Инициализация начального мира: клетка (0, 0) Обелиск...');
  // Клетка (0,0): terrain = 1 (Песок), object = 1 (Обелиск)
  // PREFIX_CELL = "CELL" (0x43454c4c)
  const cellKey = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getCellKey',
    args: [0, 0]
  });

  // Записываем сектор через superAdmin напрямую в Main_Ga_1:
  // [terrain: 1B = 0x01][object: 1B = 0x01][state: 0][reserved: 0]...
  const obeliskData = '0x0101000000000000000000000000000000000000000000000000000000000000';
  const initHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [cellKey, obeliskData]
  });
  console.log('Obelisk Init Tx Hash:', initHash);
  await publicClient.waitForTransactionReceipt({ hash: initHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Обелиск (0, 0) успешно материализован в мире!');

  // Сохраняем адреса в .private/deployments.json
  const depPath = path.resolve(__dirname, '..', '.private', 'deployments.json');
  let deployments = {};
  if (fs.existsSync(depPath)) {
    try { deployments = JSON.parse(fs.readFileSync(depPath, 'utf8')); } catch (e) {}
  }
  deployments['Main_Ga_1'] = mainAddress;
  deployments['Ga_AAA'] = aaaAddress;
  deployments['deployedAt'] = new Date().toISOString();
  fs.writeFileSync(depPath, JSON.stringify(deployments, null, 2), 'utf8');
  console.log('\n💾 Адреса сохранены в .private/deployments.json');

  return { mainAddress, aaaAddress };
}

main().catch((err) => {
  console.error('\n❌ Ошибка деплоя:', err);
  process.exit(1);
});
