const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });
async function check() {
  const mainAbi = parseAbi(['function readSector(bytes32) view returns (bytes32)']);
  const aaaAbi = parseAbi([
    'function getCellKey(int32, int32) pure returns (bytes32)',
    'function getCell(int32, int32) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight, uint32 crowdCount, uint32 lastOccupantId))'
  ]);
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const aaa = '0x5405e99be2461d2f2ce051b0ae13c224b08ea9cf';
  const key = await client.readContract({ address: aaa, abi: aaaAbi, functionName: 'getCellKey', args: [1, 0] });
  const raw = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSector', args: [key] });
  console.log('Raw sector (1, 0):', raw);
  const cell = await client.readContract({ address: aaa, abi: aaaAbi, functionName: 'getCell', args: [1, 0] });
  console.log('Decoded cell (1, 0):', cell);
}
check().catch(console.error);
