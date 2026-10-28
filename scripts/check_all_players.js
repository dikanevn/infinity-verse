const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function run() {
  const mainAbi = parseAbi([
    'function totalPlayers() view returns (uint256)',
    'function getPlayerAddress(uint256 id) view returns (address)',
    'function getPlayerId(address) view returns (uint256)'
  ]);
  const aaaAbi = parseAbi([
    'function getPlayer(address) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry, uint64 registeredAtBlock, uint64 registeredAtTimestamp)',
    'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight, uint32 crowdCount, uint32 lastOccupantId))'
  ]);
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const aaa = '0x5405e99be2461d2f2ce051b0ae13c224b08ea9cf';
  const total = await client.readContract({ address: main, abi: mainAbi, functionName: 'totalPlayers' });
  console.log('Total players:', total.toString());
  for (let i = 1; i <= Number(total); i++) {
    const addr = await client.readContract({ address: main, abi: mainAbi, functionName: 'getPlayerAddress', args: [BigInt(i)] });
    const p = await client.readContract({ address: aaa, abi: aaaAbi, functionName: 'getPlayer', args: [addr] });
    console.log(`Player ${i} (${addr}): exists=${p[2]}, x=${p[0]}, y=${p[1]}`);
    const cell = await client.readContract({ address: aaa, abi: aaaAbi, functionName: 'getCell', args: [p[0], p[1]] });
    console.log(`  Cell at (${p[0]}, ${p[1]}): terrain=${cell.terrain}, crowd=${cell.crowdCount}, lastOccupant=${cell.lastOccupantId}`);
  }
}
run().catch(console.error);
