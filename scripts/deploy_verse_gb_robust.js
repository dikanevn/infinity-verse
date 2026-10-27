// scripts/deploy_verse_gb_robust.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress, keccak256, encodePacked } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ПОЛНЫЙ ДЕПЛОЙ GB В MONAD TESTNET ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const superAdminAddress = getAddress(envFile.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const sponsorAddress = getAddress(envFile.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const player3Address = getAddress(envFile.match(/PLAYER3_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));

  const monadTestnet = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: netConfig.currencySymbol, symbol: netConfig.currencySymbol },
    rpcUrls: { default: { http: [netConfig.rpcUrl] } },
    testnet: true,
  });

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http(netConfig.rpcUrl) });
  const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http(netConfig.rpcUrl) });

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Gb_1.json'), 'utf8'));
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_1.json'), 'utf8'));
  const tttArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_TTT.json'), 'utf8'));

  async function sendWithPriority(fn) {
    const fee = await publicClient.estimateFeesPerGas();
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
    const hash = await fn({
      nonce,
      maxFeePerGas: fee.maxFeePerGas * 11n / 10n,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas
    });
    console.log('Tx:', hash);
    return await publicClient.waitForTransactionReceipt({ hash });
  }

  // 1. Деплой Main
  console.log('\n--- 1. Деплой InfinityVerse_Main_Gb_1 ---');
  const mainRec = await sendWithPriority((opts) => walletClient.deployContract({
    abi: mainArtifact.abi,
    bytecode: mainArtifact.bytecode,
    args: [superAdminAddress, '0x0000000000000000000000000000000000000000', player3Address],
    gas: 6_000_000n,
    ...opts
  }));
  const mainAddress = mainRec.contractAddress;
  console.log('✅ Main_Gb_1:', mainAddress);

  // 2. Деплой AAA
  console.log('\n--- 2. Деплой InfinityVerse_Gb_AAA_1 ---');
  const aaaRec = await sendWithPriority((opts) => walletClient.deployContract({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress],
    gas: 6_000_000n,
    ...opts
  }));
  const aaaAddress = aaaRec.contractAddress;
  console.log('✅ Gb_AAA_1:', aaaAddress);

  // 3. Деплой TTT
  console.log('\n--- 3. Деплой InfinityVerse_Ga_TTT ---');
  const tttRec = await sendWithPriority((opts) => walletClient.deployContract({
    abi: tttArtifact.abi,
    bytecode: tttArtifact.bytecode,
    args: ['Infinity Infer', 'INFER', aaaAddress],
    gas: 4_000_000n,
    ...opts
  }));
  const tttAddress = tttRec.contractAddress;
  console.log('✅ Ga_TTT:', tttAddress);

  // 4. setStarToken
  console.log('\n--- 4. Привязка $INFER к Gb_AAA_1 ---');
  await sendWithPriority((opts) => walletClient.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'setStarToken',
    args: [tttAddress],
    ...opts
  }));
  console.log('✅ $INFER привязан');

  // 5. allowAdmin
  console.log('\n--- 5. allowAdmin в Main_Gb_1 ---');
  await sendWithPriority((opts) => walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'allowAdmin',
    args: [aaaAddress, 3, 1, 0, 0n, 0, 0, 0, 0],
    ...opts
  }));
  console.log('✅ allowAdmin успешен');

  // 6. Обелиск (0, 0)
  console.log('\n--- 6. Обелиск (0, 0) ---');
  const cell00Key = keccak256(encodePacked(['bytes4', 'int32', 'int32'], ['0x43454c4c', 0, 0]));
  const obeliskData = '0x0101000000000000000000000000000000000000000000000000000000000000';
  await sendWithPriority((opts) => walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [cell00Key, obeliskData],
    ...opts
  }));
  console.log('✅ Обелиск создан');

  // 7. Звезда (1, 1)
  console.log('\n--- 7. Звезда (1, 1) ---');
  const starKey = keccak256(encodePacked(['bytes4', 'int32', 'int32'], ['0x43454c4c', 1, 1]));
  const starData = '0x0103020000000000000000000000000000000000000000000000000000000000';
  await sendWithPriority((opts) => walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'writeSector',
    args: [starKey, starData],
    ...opts
  }));
  console.log('✅ Звезда создана');

  // 8. Спавн SuperAdmin
  console.log('\n--- 8. Спавн SuperAdmin ---');
  await sendWithPriority((opts) => walletClient.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'spawnDirect',
    args: [],
    ...opts
  }));
  console.log('✅ SuperAdmin заспавнен');

  // 9. Портал на (3, 3)
  console.log('\n--- 9. Создание Портала Мультивселенной на (3, 3) ---');
  const founderNameBytes = '0x64696b616e65766e000000000000000000000000000000000000000000000000';
  const worldNameBytes = '0x4f726967696e2047656e65736973000000000000000000000000000000000000';
  const prevGa1 = '0xf32bd8705ee1c7682d9a5f2d00b18815929d4482';
  await sendWithPriority((opts) => walletClient.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'createPortalDirect',
    args: [prevGa1, founderNameBytes, worldNameBytes, 3, 3],
    ...opts
  }));
  console.log('🌀 Первый Портал Мультивселенной успешно материализован на (3, 3)!');

  console.log('\n========================================');
  console.log('=== ДЕПЛОЙ ЭПОХИ GB УСПЕШНО ЗАВЕРШЕН ===');
  console.log('MAIN_GB_1: ', mainAddress);
  console.log('GB_AAA_1:  ', aaaAddress);
  console.log('INFER_TTT: ', tttAddress);
  console.log('========================================\n');

  // Обновляем файлы
  let wrangler = fs.readFileSync(path.resolve(__dirname, '..', 'relayer', 'wrangler.toml'), 'utf8');
  wrangler = wrangler.replace(/MAIN_CONTRACT_ADDRESS = "[^"]+"/, `MAIN_CONTRACT_ADDRESS = "${mainAddress}"`);
  wrangler = wrangler.replace(/AAA_CONTRACT_ADDRESS = "[^"]+"/, `AAA_CONTRACT_ADDRESS = "${aaaAddress}"`);
  fs.writeFileSync(path.resolve(__dirname, '..', 'relayer', 'wrangler.toml'), wrangler, 'utf8');

  let contracts = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts'), 'utf8');
  contracts = contracts.replace(/export const MAIN_CONTRACT_ADDRESS = '[^']+';/, `export const MAIN_CONTRACT_ADDRESS = '${mainAddress}';`);
  contracts = contracts.replace(/export const AAA_CONTRACT_ADDRESS = '[^']+';/, `export const AAA_CONTRACT_ADDRESS = '${aaaAddress}';`);
  contracts = contracts.replace(/export const STAR_TOKEN_ADDRESS = '[^']+';/, `export const STAR_TOKEN_ADDRESS = '${tttAddress}';`);
  fs.writeFileSync(path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts'), contracts, 'utf8');

  const deploymentsFile = path.resolve(__dirname, '..', '.private', 'deployments.json');
  let history = {};
  if (fs.existsSync(deploymentsFile)) {
    try { history = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8')); } catch (e) {}
  }
  if (!history.monad_testnet) history.monad_testnet = {};
  if (!history.monad_testnet.contracts) history.monad_testnet.contracts = {};
  history.monad_testnet.contracts['InfinityVerse_Main_Gb_1'] = { address: mainAddress, deployedAt: new Date().toISOString() };
  history.monad_testnet.contracts['InfinityVerse_Gb_AAA_1'] = { address: aaaAddress, deployedAt: new Date().toISOString() };
  history.monad_testnet.contracts['InfinityVerse_Ga_TTT_Gb'] = { address: tttAddress, deployedAt: new Date().toISOString() };
  fs.writeFileSync(deploymentsFile, JSON.stringify(history, null, 2), 'utf8');

  console.log('✅ Все файлы конфигурации relayer и frontend обновлены!');
}

main().catch(console.error);
