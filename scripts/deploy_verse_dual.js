// scripts/deploy_verse_dual.js
// Скрипт деплоя и связывания двухуровневой архитектуры: InfinityVerse_Main + InfinityVerse_AAA
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ДЕПЛОЙ ДВУХУРОВНЕВОЙ АРХИТЕКТУРЫ (MAIN + AAA) ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallet.env'), 'utf8');
  const pkMatch = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
  if (!pkMatch) throw new Error('Deployer private key not found in wallet.env');
  const privateKey = pkMatch[1];

  const sponsorEnv = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'sponsor_wallet.env'), 'utf8');
  const sponsorMatch = sponsorEnv.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/);
  if (!sponsorMatch) throw new Error('Sponsor address not found in sponsor_wallet.env');
  const sponsorAddress = sponsorMatch[1];

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

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main.json'), 'utf8'));
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_AAA.json'), 'utf8'));

  // 1. Деплой InfinityVerse_Main (Хранилище)
  console.log('\n1. Отправка транзакции деплоя InfinityVerse_Main...');
  const mainDeployHash = await walletClient.deployContract({
    abi: mainArtifact.abi,
    bytecode: mainArtifact.bytecode,
    args: []
  });
  console.log('Main Tx Hash:', mainDeployHash);
  const mainReceipt = await publicClient.waitForTransactionReceipt({ hash: mainDeployHash });
  const mainAddress = mainReceipt.contractAddress;
  console.log('✅ InfinityVerse_Main развернут по адресу:', mainAddress);

  // 2. Деплой InfinityVerse_AAA (Логика)
  console.log('\n2. Отправка транзакции деплоя InfinityVerse_AAA...');
  const aaaDeployHash = await walletClient.deployContract({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress]
  });
  console.log('AAA Tx Hash:', aaaDeployHash);
  const aaaReceipt = await publicClient.waitForTransactionReceipt({ hash: aaaDeployHash });
  const aaaAddress = aaaReceipt.contractAddress;
  console.log('✅ InfinityVerse_AAA развернут по адресу:', aaaAddress);

  // 3. Связывание: регистрация AAA в Main
  console.log('\n3. Связывание: вызов main.setLogicContract(AAA)...');
  const linkHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'setLogicContract',
    args: [aaaAddress]
  });
  await publicClient.waitForTransactionReceipt({ hash: linkHash });
  console.log('✅ Контракт AAA успешно назначен активным исполнителем в Main!');

  console.log('\n=== ИТОГ ДЕПЛОЯ ===');
  console.log('MAIN_CONTRACT =', mainAddress);
  console.log('AAA_CONTRACT  =', aaaAddress);
  console.log('RELAYER       =', sponsorAddress);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Ошибка деплоя:', err);
    process.exit(1);
  });
}
