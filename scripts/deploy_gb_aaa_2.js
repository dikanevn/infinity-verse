// scripts/deploy_gb_aaa_2.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ДЕПЛОЙ GB_AAA_2 (ОНЧЕЙН-МАЙНИНГ ПО МОДЕЛИ БИТКОИНА) ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const superAdminAddress = getAddress(envFile.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const sponsorAddress = getAddress(envFile.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);

  const mainAddress = getAddress('0xa524a7e5ddba429c227fd095bb9f5131526136f1');
  const starTokenAddress = getAddress('0x91d8e6749bf9018545fc7ef80c30306611c87033');

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));
  const chain = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: { default: { http: [netConfig.rpcUrl] } },
    testnet: true
  });

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport: http(netConfig.rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(netConfig.rpcUrl) });

  console.log('Deployer (SuperAdmin):', account.address);
  console.log('Deployer Balance:', Number(await publicClient.getBalance({ address: account.address })) / 1e18, 'MON');

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Gb_1.json'), 'utf8'));
  const aaa1Artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_1.json'), 'utf8'));
  const aaa2Artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_2.json'), 'utf8'));
  const tttArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_TTT.json'), 'utf8'));

  async function sendWithPriority(fn) {
    const fee = await publicClient.estimateFeesPerGas();
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
    const hash = await fn({
      nonce,
      maxFeePerGas: (fee.maxFeePerGas * 12n) / 10n,
      maxPriorityFeePerGas: (fee.maxPriorityFeePerGas * 12n) / 10n
    });
    console.log('Tx submitted:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000, retryCount: 60 });
    return receipt;
  }

  // 1. Деплой нового Gb_AAA_2
  console.log('\n--- 1. Деплой нового InfinityVerse_Gb_AAA_2 ---');
  const deployReceipt = await sendWithPriority((opts) => walletClient.deployContract({
    abi: aaa2Artifact.abi,
    bytecode: aaa2Artifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress],
    ...opts
  }));
  const newAaaAddress = deployReceipt.contractAddress;
  console.log('✅ Новый Gb_AAA_2 развернут по адресу:', newAaaAddress);

  // 2. Привязка StarToken
  console.log('\n--- 2. Привязка $INFER токена (setStarToken) ---');
  await sendWithPriority((opts) => walletClient.writeContract({
    address: newAaaAddress,
    abi: aaa2Artifact.abi,
    functionName: 'setStarToken',
    args: [starTokenAddress],
    ...opts
  }));
  console.log('✅ StarToken привязан к новому Gb_AAA_2');

  // 3. Передача SuperAdmin в StarToken новому Gb_AAA_2 (чтобы модуль мог минтить $INFER)
  console.log('\n--- 3. Передача управления токеном $INFER новому Gb_AAA_2 ---');
  const tokenSuperAdmin = await publicClient.readContract({
    address: starTokenAddress,
    abi: tttArtifact.abi,
    functionName: 'superAdmin'
  });
  console.log('Текущий superAdmin токена $INFER:', tokenSuperAdmin);

  if (tokenSuperAdmin.toLowerCase() === superAdminAddress.toLowerCase()) {
    await sendWithPriority((opts) => walletClient.writeContract({
      address: starTokenAddress,
      abi: tttArtifact.abi,
      functionName: 'transferSuperAdminDirect',
      args: [newAaaAddress],
      ...opts
    }));
    console.log('✅ Токен $INFER передан новому Gb_AAA_2 напрямую от superAdmin');
  } else {
    console.log('Вызываем transferStarTokenSuperAdmin через предыдущий модуль AAA:', tokenSuperAdmin);
    await sendWithPriority((opts) => walletClient.writeContract({
      address: tokenSuperAdmin,
      abi: aaa1Artifact.abi,
      functionName: 'transferStarTokenSuperAdmin',
      args: [newAaaAddress],
      ...opts
    }));
    console.log('✅ Токен $INFER передан новому Gb_AAA_2 через предыдущий модуль');
  }

  // 4. Авторизация модуля в Main_Gb_1 (allowAdmin с clearance 1 | 2 = 3)
  console.log('\n--- 4. Авторизация нового Gb_AAA_2 в Main_Gb_1 ---');
  await sendWithPriority((opts) => walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'allowAdmin',
    args: [newAaaAddress, 3, 1, 0, 0n, 0, 0, 0, 0],
    ...opts
  }));
  console.log('✅ Новый модуль Gb_AAA_2 получил права CLEARANCE_1 | CLEARANCE_2 в Main_Gb_1!');

  console.log('\n======================================================');
  console.log('🎉 НОВЫЙ АДРЕС GB_AAA_2:', newAaaAddress);
  console.log('======================================================');
}

main().catch(console.error);
