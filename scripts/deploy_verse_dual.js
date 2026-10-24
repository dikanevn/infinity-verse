// scripts/deploy_verse_dual.js
// Скрипт деплоя и связывания двухуровневой архитектуры: InfinityVerse_Main_G_1 + InfinityVerse_AAA
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ДЕПЛОЙ ДВУХУРОВНЕВОЙ АРХИТЕКТУРЫ (MAIN G_1 + AAA) ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallet.env'), 'utf8');
  const pkMatch = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const privateKey = pkMatch;

  const sponsorEnv = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'sponsor_wallet.env'), 'utf8');
  const sponsorAddress = sponsorEnv.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1];

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

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_G_1.json'), 'utf8'));
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_AAA.json'), 'utf8'));

  // 1. Деплой InfinityVerse_Main_G_1 (Хранилище - Поколение 1, без предка)
  console.log('\n1. Отправка транзакции деплоя InfinityVerse_Main_G_1 (Generation 1)...');
  const mainDeployHash = await walletClient.deployContract({
    abi: mainArtifact.abi,
    bytecode: mainArtifact.bytecode,
    args: [1n, '0x0000000000000000000000000000000000000000']
  });
  console.log('Main Tx Hash:', mainDeployHash);
  const mainReceipt = await publicClient.waitForTransactionReceipt({ hash: mainDeployHash, timeout: 120_000, retryCount: 60 });
  const mainAddress = mainReceipt.contractAddress;
  console.log('✅ InfinityVerse_Main_G_1 развернут по адресу:', mainAddress);

  // 2. Деплой InfinityVerse_AAA (Логика)
  console.log('\n2. Отправка транзакции деплоя InfinityVerse_AAA...');
  const aaaDeployHash = await walletClient.deployContract({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress]
  });
  console.log('AAA Tx Hash:', aaaDeployHash);
  const aaaReceipt = await publicClient.waitForTransactionReceipt({ hash: aaaDeployHash, timeout: 120_000, retryCount: 60 });
  const aaaAddress = aaaReceipt.contractAddress;
  console.log('✅ InfinityVerse_AAA развернут по адресу:', aaaAddress);

  // 3. Связывание: регистрация AAA в Main
  console.log('\n3. Связывание: вызов main.setContractAAA(AAA)...');
  const linkHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'setContractAAA',
    args: [aaaAddress]
  });
  console.log('Link Tx Hash:', linkHash);
  await publicClient.waitForTransactionReceipt({ hash: linkHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Контракт AAA успешно назначен активным исполнителем в Main!');

  console.log('\n=== ИТОГ ДЕПЛОЯ ===');
  console.log('MAIN_CONTRACT =', mainAddress);
  console.log('AAA_CONTRACT  =', aaaAddress);
  console.log('RELAYER       =', sponsorAddress);

  // Сохраняем в deployments.json
  const deploymentsFile = path.resolve(__dirname, '..', '.private', 'deployments.json');
  let history = {};
  if (fs.existsSync(deploymentsFile)) {
    try { history = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8')); } catch (e) {}
  }
  if (!history.monad_testnet) history.monad_testnet = {};
  if (!history.monad_testnet.contracts) history.monad_testnet.contracts = {};
  history.monad_testnet.contracts['InfinityVerse_Main_G_1'] = {
    address: mainAddress,
    generation: 1,
    deployTx: mainDeployHash,
    deployedAt: new Date().toISOString()
  };
  history.monad_testnet.contracts['InfinityVerse_AAA'] = {
    address: aaaAddress,
    mainContract: mainAddress,
    deployTx: aaaDeployHash,
    deployedAt: new Date().toISOString()
  };
  fs.writeFileSync(deploymentsFile, JSON.stringify(history, null, 2));
  console.log('✅ Обновлена информация в .private/deployments.json');

  return { mainAddress, aaaAddress };
}

if (require.main === module) {
  main().catch(err => {
    console.error('Ошибка деплоя:', err);
    process.exit(1);
  });
}

module.exports = { main };
