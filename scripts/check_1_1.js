const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });
async function check() {
  const aaaAbi = parseAbi([
    'function getCell(int32, int32) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight, uint32 crowdCount, uint32 lastOccupantId))'
  ]);
  const aaa = '0x5405e99be2461d2f2ce051b0ae13c224b08ea9cf';
  const c = await client.readContract({ address: aaa, abi: aaaAbi, functionName: 'getCell', args: [1, 1] });
  console.log('Cell (1, 1):', c);
}
check().catch(console.error);
