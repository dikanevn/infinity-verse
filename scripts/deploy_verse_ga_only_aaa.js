// scripts/deploy_verse_ga_only_aaa.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ДЕПЛОЙ ИСПРАВЛЕННОГО GA_AAA В MONAD TESTNET ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
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

  console.log('Deployer Balance:', Number(await publicClient.getBalance({ address: account.address })) / 1e18, 'MON');

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Ga_1.json'), 'utf8'));
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_AAA.json'), 'utf8'));

  // 1. Деплой Ga_AAA
  console.log('1. Деплой Ga_AAA...');
  const aaaDeployHash = await walletClient.deployContract({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress]
  });
  console.log('Ga_AAA Tx Hash:', aaaDeployHash);
  const aaaReceipt = await publicClient.waitForTransactionReceipt({ hash: aaaDeployHash, timeout: 120_000, retryCount: 60 });
  const aaaAddress = aaaReceipt.contractAddress;
  console.log('✅ Новый InfinityVerse_Ga_AAA развернут:', aaaAddress);

  // 2. Авторизация Ga_AAA в Main_Ga_1 (allowAdmin)
  console.log('2. allowAdmin в Main_Ga_1...');
  const allowHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'allowAdmin',
    args: [aaaAddress, 1, 1, 0, 0n, 0, 0, 0, 0]
  });
  console.log('Allow Tx Hash:', allowHash);
  await publicClient.waitForTransactionReceipt({ hash: allowHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Новый Ga_AAA успешно авторизован в Main_Ga_1!');

  // 3. Запись истинного Обелиска на (0, 0)
  console.log('3. Запись Обелиска на истинный ключ (0, 0)...');
  const trueCellKey = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getCellKey',
    args: [0, 0]
  });
  console.log('Истинный ключ клетки (0, 0):', trueCellKey);

  const obeliskData = '0x0101000000000000000000000000000000000000000000000000000000000000';
  const initHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [trueCellKey, obeliskData]
  });
  console.log('Init Tx Hash:', initHash);
  await publicClient.waitForTransactionReceipt({ hash: initHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Обелиск (0, 0) успешно записан в сектор!');

  // 4. Очистка старого фейкового сектора, куда ошибочно писалось
  const bogusKey = '0x4344d392b2fa34aaf1de1a32c6c247f093a35061efdcd7eeafc492cd9ba5d439';
  console.log('4. Зануление фантомного сектора:', bogusKey);
  const zeroData = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const clearHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [bogusKey, zeroData]
  });
  console.log('Clear Tx Hash:', clearHash);
  await publicClient.waitForTransactionReceipt({ hash: clearHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Фантомный сектор занулен!');

  // 5. Проверяем клетки (0,0) и (1,0)
  const c0 = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getCell',
    args: [0, 0]
  });
  const c1 = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getCell',
    args: [1, 0]
  });
  console.log('Проверка после фикса:');
  console.log('Клетка (0, 0) Обелиск:', c0);
  console.log('Клетка (1, 0) Пустота:', c1);

  // Обновляем .private/deployments.json
  const depPath = path.resolve(__dirname, '..', '.private', 'deployments.json');
  let deployments = {};
  if (fs.existsSync(depPath)) {
    try { deployments = JSON.parse(fs.readFileSync(depPath, 'utf8')); } catch (e) {}
  }
  deployments['Main_Ga_1'] = mainAddress;
  deployments['Ga_AAA'] = aaaAddress;
  deployments['deployedAt'] = new Date().toISOString();
  fs.writeFileSync(depPath, JSON.stringify(deployments, null, 2), 'utf8');

  return { mainAddress, aaaAddress };
}

main().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
