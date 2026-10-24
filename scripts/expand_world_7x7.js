const fs = require('fs');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { monadTestnet } = require('viem/chains');

const client = createPublicClient({ chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz') });

async function expandWorld() {
  const f = fs.readFileSync('.private/wallet.env', 'utf8');
  let deployerPk;
  for (const l of f.split('\n')) {
    const m = l.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
    if (m) deployerPk = m[1];
  }
  const acc = privateKeyToAccount(deployerPk);
  const wallet = createWalletClient({ account: acc, chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz') });
  const g2 = '0x022d01b6e057e62e6B7Be9a2bE2b76e0Af26109B';

  const setCellAbi = [{
    name: 'setCell',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
      {
        name: 'cellData',
        type: 'tuple',
        components: [
          { name: 'terrain', type: 'uint8' },
          { name: 'object', type: 'uint8' },
          { name: 'state', type: 'uint8' },
          { name: 'reserved', type: 'uint8' }
        ]
      }
    ],
    outputs: []
  }];

  // 1. Очищаем старые стены на радиусе 2 (превращаем в чистый песок)
  const oldWalls = [];
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      if (Math.abs(x) === 2 || Math.abs(y) === 2) {
        oldWalls.push({ x, y });
      }
    }
  }

  // 2. Строим новые стены на радиусе 3 (квадрат 7x7)
  const newWalls = [];
  for (let x = -3; x <= 3; x++) {
    for (let y = -3; y <= 3; y++) {
      if (Math.abs(x) === 3 || Math.abs(y) === 3) {
        newWalls.push({ x, y });
      }
    }
  }

  const gp = await client.getGasPrice();
  const gasPrice = (gp * 110n) / 100n;

  console.log(`1. Clearing ${oldWalls.length} old walls on radius 2...`);
  for (let i = 0; i < oldWalls.length; i++) {
    const c = oldWalls[i];
    const hash = await wallet.writeContract({
      address: g2,
      abi: setCellAbi,
      functionName: 'setCell',
      args: [c.x, c.y, { terrain: 1, object: 0, state: 0, reserved: 0 }],
      gasPrice,
      gas: 100000n
    });
    await client.waitForTransactionReceipt({ hash });
  }

  console.log(`2. Building ${newWalls.length} new walls on radius 3 (7x7 perimeter)...`);
  for (let i = 0; i < newWalls.length; i++) {
    const c = newWalls[i];
    const hash = await wallet.writeContract({
      address: g2,
      abi: setCellAbi,
      functionName: 'setCell',
      args: [c.x, c.y, { terrain: 1, object: 2, state: 0, reserved: 0 }],
      gasPrice,
      gas: 100000n
    });
    await client.waitForTransactionReceipt({ hash });
  }

  console.log('SUCCESS: World expanded to 7x7 onchain!');
}

expandWorld().catch(console.error);
