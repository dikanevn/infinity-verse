// scripts/redeploy_aaa_2.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== РЕДЕПЛОЙ ИСПРАВЛЕННОГО GA_AAA_2 (ПАДЕНИЕ ЗВЕЗДЫ 5x5, В Т.Ч. НА ГОЛОВУ ЧЕРВЯ) ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const superAdminAddress = getAddress(envFile.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const sponsorAddress = getAddress(envFile.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);

  const mainAddress = '0xf32bd8705ee1c7682d9a5f2d00b18815929d4482';
  const existingTttAddress = '0xe4bc53bb392f6c96a4a6d6b7a72263731f599686';

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

  console.log('SuperAdmin Address:', account.address);
  console.log('SuperAdmin Balance:', Number(await publicClient.getBalance({ address: account.address })) / 1e18, 'MON');

  const mainArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Main_Ga_1.json'), 'utf8'));
  const aaa2Artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_AAA_2.json'), 'utf8'));
  const tttArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Ga_TTT.json'), 'utf8'));

  // 1. Деплой Ga_AAA_2
  console.log('\n--- 1. Деплой нового InfinityVerse_Ga_AAA_2 ---');
  const aaa2DeployHash = await walletClient.deployContract({
    abi: aaa2Artifact.abi,
    bytecode: aaa2Artifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress]
  });
  console.log('Ga_AAA_2 Deploy Tx Hash:', aaa2DeployHash);
  const aaa2Receipt = await publicClient.waitForTransactionReceipt({ hash: aaa2DeployHash, timeout: 120_000, retryCount: 60 });
  const aaa2Address = aaa2Receipt.contractAddress;
  console.log('✅ Новый InfinityVerse_Ga_AAA_2 развернут:', aaa2Address);

  // 2. Привязка $INFER токена к новому Ga_AAA_2 (setStarToken)
  console.log('\n--- 2. Привязка $INFER токена к новому модулю ---');
  const setTokenHash = await walletClient.writeContract({
    address: aaa2Address,
    abi: aaa2Artifact.abi,
    functionName: 'setStarToken',
    args: [existingTttAddress]
  });
  console.log('setStarToken Tx Hash:', setTokenHash);
  await publicClient.waitForTransactionReceipt({ hash: setTokenHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ $INFER успешно привязан!');

  // 3. Передача роли SuperAdmin в Ga_TTT токена новому модулю
  // (Вызываем transferSuperAdminDirect со старого Ga_AAA_2 или с текущего админа)
  console.log('\n--- 3. Передача управления Ga_TTT токеном новому Ga_AAA_2 ---');
  const currentTokenAdmin = await publicClient.readContract({
    address: existingTttAddress,
    abi: tttArtifact.abi,
    functionName: 'superAdmin'
  });
  console.log('Текущий superAdmin токена:', currentTokenAdmin);

  const prevAaa2Address = '0x794455898e8f8304224fb503da518a29735775b3';

  if (currentTokenAdmin.toLowerCase() === prevAaa2Address.toLowerCase()) {
    console.log('Передаем superAdmin через предыдущий Ga_AAA_2...');
    const transferHash = await walletClient.writeContract({
      address: prevAaa2Address,
      abi: aaa2Artifact.abi,
      functionName: 'transferStarTokenSuperAdmin',
      args: [aaa2Address]
    });
    console.log('transferStarTokenSuperAdmin Tx Hash:', transferHash);
    await publicClient.waitForTransactionReceipt({ hash: transferHash, timeout: 120_000, retryCount: 60 });
  } else if (currentTokenAdmin.toLowerCase() === superAdminAddress.toLowerCase()) {
    console.log('Передаем superAdmin напрямую от superAdmin кошелька...');
    const transferHash = await walletClient.writeContract({
      address: existingTttAddress,
      abi: tttArtifact.abi,
      functionName: 'transferSuperAdminDirect',
      args: [aaa2Address]
    });
    console.log('transferSuperAdminDirect Tx Hash:', transferHash);
    await publicClient.waitForTransactionReceipt({ hash: transferHash, timeout: 120_000, retryCount: 60 });
  } else {
    console.log('Попытка вызова transferStarTokenSuperAdmin через предыдущий модуль...');
    try {
      const transferHash = await walletClient.writeContract({
        address: prevAaa2Address,
        abi: aaa2Artifact.abi,
        functionName: 'transferStarTokenSuperAdmin',
        args: [aaa2Address]
      });
      console.log('transferStarTokenSuperAdmin Tx Hash:', transferHash);
      await publicClient.waitForTransactionReceipt({ hash: transferHash, timeout: 120_000, retryCount: 60 });
    } catch (e) {
      console.log('Не удалось передать через prev модуль, проверяем напрямую:', e.message);
    }
  }

  const newTokenAdmin = await publicClient.readContract({
    address: existingTttAddress,
    abi: tttArtifact.abi,
    functionName: 'superAdmin'
  });
  console.log('✅ Новый superAdmin токена $INFER:', newTokenAdmin);

  // 4. Авторизация Ga_AAA_2 в Main_Ga_1 (allowAdmin с правами CLEARANCE_1 | CLEARANCE_2 = 3)
  console.log('\n--- 4. Авторизация нового Ga_AAA_2 в Main_Ga_1 (CLEARANCE_1 | CLEARANCE_2) ---');
  const allowHash = await walletClient.writeContract({
    address: mainAddress,
    abi: mainArtifact.abi,
    functionName: 'allowAdmin',
    args: [aaa2Address, 3, 1, 0, 0n, 0, 0, 0, 0]
  });
  console.log('allowAdmin Tx Hash:', allowHash);
  await publicClient.waitForTransactionReceipt({ hash: allowHash, timeout: 120_000, retryCount: 60 });
  console.log('✅ Новый Ga_AAA_2 получил clearance = 3 в Main_Ga_1!');

  console.log('\n🎉 РЕДЕПЛОЙ ЗАВЕРШЕН!');
  console.log('Новый адрес AAA_CONTRACT_ADDRESS:', aaa2Address);
}

main().catch(console.error);
