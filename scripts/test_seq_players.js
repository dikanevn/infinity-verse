const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });
async function check() {
  const mainAbi = parseAbi([
    'function getPlayersSequential(uint256, uint256) view returns (address[])',
    'function totalPlayers() view returns (uint256)'
  ]);
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const total = await client.readContract({ address: main, abi: mainAbi, functionName: 'totalPlayers' });
  console.log('Total:', total);
  const list = await client.readContract({ address: main, abi: mainAbi, functionName: 'getPlayersSequential', args: [0n, total] });
  console.log('List:', list);
}
check().catch(console.error);
