// scripts/test_player4_move_sim.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== ЭМУЛЯЦИЯ ХОДА РЕЖИМА ПРИВАТНОГО КЛЮЧА (ИГРОК 4) ===\n');

  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const player4Key = envFile.match(/PLAYER4_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const player4Account = privateKeyToAccount(player4Key);

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));
  const chain = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: { default: { http: [netConfig.rpcUrl] } },
    testnet: true
  });

  const publicClient = createPublicClient({ chain, transport: http(netConfig.rpcUrl) });
  const walletClient = createWalletClient({ account: player4Account, chain, transport: http(netConfig.rpcUrl) });

  const contractsCfg = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts'), 'utf8');
  const aaaAddress = contractsCfg.match(/AAA_CONTRACT_ADDRESS = '(0x[a-fA-F0-9]{40})'/)[1];
  const aaaArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_1.json'), 'utf8'));

  console.log('Player 4 Address:', player4Account.address);
  console.log('AAA Address:     ', aaaAddress);

  // 1. Читаем текущее положение
  const pData = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getPlayer',
    args: [player4Account.address]
  });

  const curX = pData[0];
  const curY = pData[1];
  const exists = pData[2];
  console.log(`Текущая позиция: (${curX}, ${curY}), exists: ${exists}`);

  // Если игрок еще не заспавнен в этом модуле, делаем spawnDirect
  if (!exists) {
    console.log('Игрок не заспавнен в новом модуле. Вызываем spawnDirect()...');
    const spawnHash = await walletClient.writeContract({
      address: aaaAddress,
      abi: aaaArtifact.abi,
      functionName: 'spawnDirect'
    });
    console.log('Spawn Tx:', spawnHash);
    await publicClient.waitForTransactionReceipt({ hash: spawnHash });
    console.log('✅ Игрок 4 успешно заспавнен в новом модуле!');
  }

  // Снова читаем позицию
  const pDataAfter = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getPlayer',
    args: [player4Account.address]
  });
  const currentX = pDataAfter[0];
  const currentY = pDataAfter[1];

  // 2. Делаем шаг на соседнюю клетку: если Y == 0, идем на (X, 1), иначе на (X, 0)
  const targetX = currentX;
  const targetY = currentY === 0 ? 1 : 0;
  console.log(`\nОтправляем moveDirect на соседнюю клетку (${targetX}, ${targetY})...`);

  const moveHash = await walletClient.writeContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'moveDirect',
    args: [targetX, targetY]
  });
  console.log('Move Tx:', moveHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: moveHash });
  console.log('✅ Шаг успешно зафиксирован в блоке:', receipt.blockNumber.toString());

  // Проверяем новую позицию
  const pFinal = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaArtifact.abi,
    functionName: 'getPlayer',
    args: [player4Account.address]
  });
  console.log(`🎉 Новая позиция Игрока 4: (${pFinal[0]}, ${pFinal[1]})`);
}

main().catch(console.error);
