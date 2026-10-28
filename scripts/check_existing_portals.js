const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function check() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const mainAbi = parseAbi([
    'function totalPortals() view returns (uint256)',
    'function getPortal(uint256 id) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt))'
  ]);
  const total = await client.readContract({ address: main, abi: mainAbi, functionName: 'totalPortals' });
  console.log('Total portals:', total.toString());
  for (let i = 1; i <= Number(total); i++) {
    const p = await client.readContract({ address: main, abi: mainAbi, functionName: 'getPortal', args: [BigInt(i)] });
    if (p.founder !== '0x0000000000000000000000000000000000000000') {
      console.log(`Portal ${i}:`, {
        id: p.id.toString(),
        founder: p.founder,
        targetContract: p.targetContract,
        founderName: Buffer.from(p.founderName.slice(2), 'hex').toString('utf8').replace(/\0/g, ''),
        worldName: Buffer.from(p.worldName.slice(2), 'hex').toString('utf8').replace(/\0/g, '')
      });
    }
  }
}
check();
