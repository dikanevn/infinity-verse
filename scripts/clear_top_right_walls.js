const fs = require('fs');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { monadTestnet } = require('viem/chains');

const client = createPublicClient({ chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz') });

async function removeTopAndRightWalls() {
  const f = fs.readFileSync('.private/wallets.env', 'utf8');
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

  // РЎС‚РµРЅС‹ РЅР° СЂР°РґРёСѓСЃРµ 3:
  // РЎРІРµСЂС…Сѓ: y === 3 (РІСЃРµ x РѕС‚ -3 РґРѕ 3)
  // РЎРїСЂР°РІР°: x === 3 (РІСЃРµ y РѕС‚ -3 РґРѕ 3)
  const coordsToRemove = new Map();
  for (let x = -3; x <= 3; x++) {
    coordsToRemove.set(`${x},3`, { x, y: 3 }); // РІРµСЂС…
  }
  for (let y = -3; y <= 3; y++) {
    coordsToRemove.set(`3,${y}`, { x: 3, y }); // РїСЂР°РІРѕ
  }

  const list = Array.from(coordsToRemove.values());
  console.log(`Removing top and right walls on ${list.length} coordinates...`);

  const gp = await client.getGasPrice();
  const gasPrice = (gp * 110n) / 100n;

  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    console.log(`[${i+1}/${list.length}] Clearing wall at (${c.x}, ${c.y})...`);
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

  console.log('SUCCESS: Top and right walls cleared onchain!');
}

removeTopAndRightWalls().catch(console.error);
