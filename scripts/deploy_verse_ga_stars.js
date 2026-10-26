// scripts/deploy_verse_ga_stars.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ДЕПЛОЙ GA_AAA_2 И GA_TTT (ЗВЁЗДЫ) В MONAD TESTNET ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const superAdminAddress = getAddress(envFile.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const sponsorAddress = getAddress(envFile.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);

  const mainAddress = '0xf32bd8705ee1c7682d9a5f2d00b18815929d4482';

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));
  const monadTestnet = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: netConfig.currencySymbol, symbol: netConfig.currencySymbol },
    rpcUrls: { default: { http: [netConfig.rpcUrl] }, public: { http: [netConfig.rpcUrl] } },
    testnet: true,
  });

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http(netConfig.rpcUrl) });
  const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http(netConfig.rpcUrl) });

  console.log('SuperAdmin Address:', account.address);
  console.log('SuperAdmin Balance:', Number(await publicClient.getBalance({ address: account.address })) / 1e18, 'MON');

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Ga_1.json'), 'utf8'));
  const aaa2Artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_AAA_2.json'), 'utf8'));
  const tttArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_TTT.json'), 'utf8'));

  // 1. Деплой Ga_AAA_2
  console.log('\n--- 1. Деплой InfinityVerse_Ga_AAA_2 ---');
  const aaa2DeployHash = await walletClient.deployContract({
    abi: aaa2Artifact.abi,
    bytecode: aaa2Artifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress]
  });
  console.log('Ga_AAA_2 Deploy Tx Hash:', aaa2DeployHash);
  const aaa2Receipt = await publicClient.waitForTransactionReceipt({ hash: aaa2DeployHash, timeout: 120_000, retryCount: 60 });
  const aaa2Address = aaa2Receipt.contractAddress;
  console.log('✅ InfinityVerse_Ga_AAA_2 развернут:', aaa2Address);

  // 2. Деплой Ga_TTT токена (SuperAdmin = Ga_AAA_2)
  console.log('\n--- 2. Деплой InfinityVerse_Ga_TTT (STAR токен) ---');
  const tttDeployHash = await walletClient.deployContract({
    abi: tttArtifact.abi,
    bytecode: tttArtifact.bytecode,
    args: ['Infinity Star', 'STAR', aaa2Address]
  });
  console.log('Ga_TTT Deploy Tx Hash:', tttDeployHash);
  const tttReceipt = await publicClient.waitForTransactionReceipt({ hash: tttDeployHash, timeout: 120_000, retryCount: 60 });
  const tttAddress = tttReceipt.contractAddress;
  console.log('✅ InfinityVerse_Ga_TTT развернут:', tttAddress);

  // 3. Привязка токена Ga_TTT в Ga_AAA_2 (setStarToken)
  console.log('\n--- 3. Привязка Ga_TTT к модулю Ga_AAA_2 ---');
  const setTokenHash = await walletClient.writeContract({
    address: aaa2Address,
    abi: aaa2Artifact.abi,
    functionName: 'setStarToken',
    args: [tttAddress]
  });
  console.log('setStarToken Tx Hash:', setTokenHash);
  await publicClient.waitForTransactionReceipt({ hash: setTokenHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Ga_TTT успешно привязан к Ga_AAA_2!');

  // 4. Авторизация Ga_AAA_2 в Main_Ga_1 (allowAdmin)
  console.log('\n--- 4. Авторизация Ga_AAA_2 в Main_Ga_1 (allowAdmin) ---');
  const allowHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'allowAdmin',
    args: [aaa2Address, 1, 1, 0, 0n, 0, 0, 0, 0]
  });
  console.log('allowAdmin Tx Hash:', allowHash);
  await publicClient.waitForTransactionReceipt({ hash: allowHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Ga_AAA_2 получил права записи в Main_Ga_1!');

  // 5. Роняем первую звезду на (1, 1)!
  console.log('\n--- 5. Роняем первую ончейн-звезду на (1, 1) ---');
  const starCellKey = await publicClient.readContract({
    address: aaa2Address,
    abi: aaa2Artifact.abi,
    functionName: 'getCellKey',
    args: [1, 1]
  });
  console.log('Ключ сектора для звезды (1, 1):', starCellKey);

  // terrain = 1 (Песок), object = 3 (Звезда) => 0x01030000...
  const starCellData = '0x0103000000000000000000000000000000000000000000000000000000000000';
  const dropStarHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [starCellKey, starCellData]
  });
  console.log('Drop Star Tx Hash:', dropStarHash);
  await publicClient.waitForTransactionReceipt({ hash: dropStarHash, timeout: 120_000, retryCount: 60 });
  console.log('🌟 ПЕРВАЯ ЗВЕЗДА УСПЕШНО УПАЛА НА КЛЕТКУ (1, 1)!');

  // 6. Проверяем состояние клетки (1, 1) через Ga_AAA_2
  const starCell = await publicClient.readContract({
    address: aaa2Address,
    abi: aaa2Artifact.abi,
    functionName: 'getCell',
    args: [1, 1]
  });
  console.log('Проверка клетки (1, 1) [terrain, object, state, reserved]:', starCell);

  // 7. Сохранение адресов в deployments.json
  const deployPath = path.resolve(__dirname, '..', '.private', 'deployments.json');
  let deployments = {};
  if (fs.existsSync(deployPath)) {
    try { deployments = JSON.parse(fs.readFileSync(deployPath, 'utf8')); } catch (e) {}
  }
  deployments['Main_Ga_1'] = mainAddress;
  deployments['Ga_AAA_2'] = aaa2Address;
  deployments['Ga_TTT'] = tttAddress;
  deployments['starDroppedAt'] = { x: 1, y: 1 };
  deployments['lastDeployedAt'] = new Date().toISOString();
  fs.writeFileSync(deployPath, JSON.stringify(deployments, null, 2), 'utf8');

  console.log('\n=== ВСЕ ЭТАПЫ УСПЕШНО ЗАВЕРШЕНЫ ===');
  console.log('Main_Ga_1: ', mainAddress);
  console.log('Ga_AAA_2:  ', aaa2Address);
  console.log('Ga_TTT:    ', tttAddress);
  console.log('Звезда на: (1, 1)');
}

main().catch(err => {
  console.error('Ошибка деплоя:', err);
  process.exit(1);
});
