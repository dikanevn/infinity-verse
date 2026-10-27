// scripts/deploy_verse_gb.js
// Скрипт деплоя эпохи Gb в Monad Testnet (Chain ID 10143):
// 1. InfinityVerse_Main_Gb_1 (Корневое хранилище поколения Gb, prevMain = 0x0)
// 2. InfinityVerse_Gb_AAA_1 (Модуль движения, спавна и порталов)
// 3. InfinityVerse_Ga_TTT ($INFER токен со сменой минтера на Gb_AAA_1)
// 4. Авторизация Gb_AAA_1 в Main_Gb_1 (CLEARANCE_1 + CLEARANCE_2)
// 5. Инициализация стартового Обелиска (0, 0)
// 6. Материализация первого Портала Мультивселенной на (2, 2)
// 7. Обновление .private/wallets.env, relayer/wrangler.toml, deployments.json

const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress, keccak256, encodePacked } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ДЕПЛОЙ ЭПОХИ GB (MAIN_GB_1 + GB_AAA_1 + TTT) В MONAD TESTNET ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const superAdminAddress = getAddress(envFile.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const sponsorAddress = getAddress(envFile.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const player3Address = getAddress(envFile.match(/PLAYER3_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);

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

  console.log('SuperAdmin Address:', account.address);
  console.log('Backup SuperAdmin (Player3):', player3Address);
  console.log('Relayer/Sponsor Address:', sponsorAddress);
  const saBalance = await publicClient.getBalance({ address: account.address });
  console.log('SuperAdmin Balance:', Number(saBalance) / 1e18, 'MON');

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Gb_1.json'), 'utf8'));
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_1.json'), 'utf8'));
  const tttArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_TTT.json'), 'utf8'));

  // 1. Деплой InfinityVerse_Main_Gb_1 (Root Gen 1, prevMain = 0x0)
  console.log('\n--- 1. Деплой InfinityVerse_Main_Gb_1 (Root Gen 1) ---');
  const mainDeployHash = await walletClient.deployContract({
    abi: mainArtifact.abi,
    bytecode: mainArtifact.bytecode,
    args: [
      superAdminAddress,
      '0x0000000000000000000000000000000000000000',
      player3Address // backupSuperAdmin
    ]
  });
  console.log('Main_Gb_1 Tx Hash:', mainDeployHash);
  const mainReceipt = await publicClient.waitForTransactionReceipt({ hash: mainDeployHash, timeout: 120_000, retryCount: 60 });
  const mainAddress = mainReceipt.contractAddress;
  console.log('✅ InfinityVerse_Main_Gb_1 развернут:', mainAddress);

  // 2. Деплой InfinityVerse_Gb_AAA_1
  console.log('\n--- 2. Деплой InfinityVerse_Gb_AAA_1 (Игровая логика + Порталы) ---');
  const aaaDeployHash = await walletClient.deployContract({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress]
  });
  console.log('Gb_AAA_1 Tx Hash:', aaaDeployHash);
  const aaaReceipt = await publicClient.waitForTransactionReceipt({ hash: aaaDeployHash, timeout: 120_000, retryCount: 60 });
  const aaaAddress = aaaReceipt.contractAddress;
  console.log('✅ InfinityVerse_Gb_AAA_1 развернут:', aaaAddress);

  // 3. Деплой InfinityVerse_Ga_TTT ($INFER токен, SuperAdmin = Gb_AAA_1)
  console.log('\n--- 3. Деплой InfinityVerse_Ga_TTT ($INFER) ---');
  const tttDeployHash = await walletClient.deployContract({
    abi: tttArtifact.abi,
    bytecode: tttArtifact.bytecode,
    args: ['Infinity Infer', 'INFER', aaaAddress]
  });
  console.log('Ga_TTT Tx Hash:', tttDeployHash);
  const tttReceipt = await publicClient.waitForTransactionReceipt({ hash: tttDeployHash, timeout: 120_000, retryCount: 60 });
  const tttAddress = tttReceipt.contractAddress;
  console.log('✅ InfinityVerse_Ga_TTT ($INFER) развернут:', tttAddress);

  // 4. Привязка токена Ga_TTT в Gb_AAA_1 (setStarToken)
  console.log('\n--- 4. Привязка $INFER к модулю Gb_AAA_1 ---');
  const setTokenHash = await walletClient.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'setStarToken',
    args: [tttAddress]
  });
  console.log('setStarToken Tx Hash:', setTokenHash);
  await publicClient.waitForTransactionReceipt({ hash: setTokenHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ $INFER успешно привязан к Gb_AAA_1!');

  // 5. Авторизация Gb_AAA_1 в Main_Gb_1 (allowAdmin)
  // perms = 3 (CLEARANCE_1 | CLEARANCE_2)
  console.log('\n--- 5. Авторизация Gb_AAA_1 в Main_Gb_1 (allowAdmin) ---');
  const allowHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'allowAdmin',
    args: [
      aaaAddress,
      3,     // perms: CLEARANCE_1 | CLEARANCE_2
      1,     // role: 1 (Game Engine)
      0,     // validFrom: 0 (сразу)
      0n,    // validUntil: 0 (бессрочно)
      0, 0, 0, 0
    ]
  });
  console.log('allowAdmin Tx Hash:', allowHash);
  await publicClient.waitForTransactionReceipt({ hash: allowHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Gb_AAA_1 получил права записи в Main_Gb_1!');

  // 6. Инициализация начальной точки мира (Обелиск на 0, 0)
  console.log('\n--- 6. Инициализация клетки (0, 0) Обелиск ---');
  const cell00Key = keccak256(encodePacked(['bytes4', 'int32', 'int32'], ['0x43454c4c', 0, 0]));
  // terrain = 1 (Песок), object = 1 (Обелиск) => 0x01010000...
  const obeliskData = '0x0101000000000000000000000000000000000000000000000000000000000000';
  const obeliskTx = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [cell00Key, obeliskData]
  });
  console.log('Obelisk Tx Hash:', obeliskTx);
  await publicClient.waitForTransactionReceipt({ hash: obeliskTx, timeout: 120_000, retryCount: 60 });
  console.log('✅ Обелиск (0, 0) материализован в Main_Gb_1!');

  // 7. Роняем первую звезду на (1, 1)
  console.log('\n--- 7. Первичная звезда на (1, 1) с весом = 2 ---');
  const starCellKey = keccak256(encodePacked(['bytes4', 'int32', 'int32'], ['0x43454c4c', 1, 1]));
  // terrain = 1 (Песок), object = 3 (Звезда), weight = 2 => 0x01030200...
  const starCellData = '0x0103020000000000000000000000000000000000000000000000000000000000';
  const dropStarTx = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [starCellKey, starCellData]
  });
  console.log('Star Tx Hash:', dropStarTx);
  await publicClient.waitForTransactionReceipt({ hash: dropStarTx, timeout: 120_000, retryCount: 60 });
  console.log('✅ Звезда на (1, 1) успешно создана!');

  // 8. Рождение SuperAdmin и Создание Первого Портала Мультивселенной на (2, 2)
  console.log('\n--- 8. Спавн SuperAdmin и Создание Первого Портала Мультивселенной на (2, 2) ---');
  const spawnTx = await walletClient.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'spawnDirect',
    args: []
  });
  console.log('Spawn Tx Hash:', spawnTx);
  await publicClient.waitForTransactionReceipt({ hash: spawnTx, timeout: 120_000, retryCount: 60 });
  console.log('✅ SuperAdmin успешно заспавнился в мире Gb!');

  // targetContract = старое хранилище Ga-1 (как портал в прародину), founderName = 'dikanevn', worldName = 'Origin Genesis'
  const founderNameBytes = '0x64696b616e65766e000000000000000000000000000000000000000000000000';
  const worldNameBytes = '0x4f726967696e2047656e65736973000000000000000000000000000000000000';
  const prevGa1 = '0xf32bd8705ee1c7682d9a5f2d00b18815929d4482';

  const portalTx = await walletClient.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'createPortalDirect',
    args: [
      prevGa1,
      founderNameBytes,
      worldNameBytes,
      2, // X = 2
      2  // Y = 2
    ]
  });
  console.log('Portal Tx Hash:', portalTx);
  await publicClient.waitForTransactionReceipt({ hash: portalTx, timeout: 120_000, retryCount: 60 });
  console.log('🌀 Первый Портал Мультивселенной успешно открыт на клетке (2, 2)!');

  console.log('\n========================================');
  console.log('=== ИТОГИ ДЕПЛОЯ ПОКОЛЕНИЯ GB ===');
  console.log('MAIN_GB_1: ', mainAddress);
  console.log('GB_AAA_1:  ', aaaAddress);
  console.log('INFER_TTT: ', tttAddress);
  console.log('========================================\n');

  // Сохраняем результат в deployments.json
  const deploymentsFile = path.resolve(__dirname, '..', '.private', 'deployments.json');
  let history = {};
  if (fs.existsSync(deploymentsFile)) {
    try { history = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8')); } catch (e) {}
  }
  if (!history.monad_testnet) history.monad_testnet = {};
  if (!history.monad_testnet.contracts) history.monad_testnet.contracts = {};
  history.monad_testnet.contracts['InfinityVerse_Main_Gb_1'] = {
    address: mainAddress,
    deployTx: mainDeployHash,
    deployedAt: new Date().toISOString()
  };
  history.monad_testnet.contracts['InfinityVerse_Gb_AAA_1'] = {
    address: aaaAddress,
    deployTx: aaaDeployHash,
    deployedAt: new Date().toISOString()
  };
  history.monad_testnet.contracts['InfinityVerse_Ga_TTT_Gb'] = {
    address: tttAddress,
    deployTx: tttDeployHash,
    deployedAt: new Date().toISOString()
  };
  fs.writeFileSync(deploymentsFile, JSON.stringify(history, null, 2), 'utf8');
}

main().catch(err => {
  console.error('Ошибка деплоя:', err);
  process.exit(1);
});
