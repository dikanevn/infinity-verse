const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function simClearTile() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const superAdmin = '0x8F9f2837CA5B7df0edd544F6d429B1Ffc0B5C5C0';
  const mainAbi = parseAbi([
    'function writeSector(bytes32 sector, bytes32 data) external'
  ]);

  const cellKey = '0x4f8b18905751aac3f59ab22ff491e7b5dd0e9cf3f697e9fed6051424e720c762';
  // cell with terrain=1, object=0:
  const clearedCell = '0x0100000000000000000000000000000000000000000000000000000000000000';

  console.log('Simulating writeSector for (4, 4) from SuperAdmin...');
  try {
    await client.simulateContract({
      address: main,
      abi: mainAbi,
      functionName: 'writeSector',
      args: [cellKey, clearedCell],
      account: superAdmin
    });
    console.log('Simulation writeSector SUCCESS!');
  } catch (e) {
    console.error('Simulation writeSector FAILED:', e.message);
  }
}
simClearTile();
