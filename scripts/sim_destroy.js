const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function sim() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const superAdmin = '0x8F9f2837CA5B7df0edd544F6d429B1Ffc0B5C5C0';
  const mainAbi = parseAbi([
    'function destroyPortal(uint256 portalId)'
  ]);

  console.log('Simulating destroyPortal(2) from SuperAdmin...');
  try {
    await client.simulateContract({
      address: main,
      abi: mainAbi,
      functionName: 'destroyPortal',
      args: [2n],
      account: superAdmin
    });
    console.log('Simulation destroyPortal(2) SUCCESS!');
  } catch (e) {
    console.error('Simulation destroyPortal(2) FAILED:', e.message);
  }

  console.log('Simulating destroyPortal(6) from SuperAdmin...');
  try {
    await client.simulateContract({
      address: main,
      abi: mainAbi,
      functionName: 'destroyPortal',
      args: [6n],
      account: superAdmin
    });
    console.log('Simulation destroyPortal(6) SUCCESS!');
  } catch (e) {
    console.error('Simulation destroyPortal(6) FAILED:', e.message);
  }
}
sim();
