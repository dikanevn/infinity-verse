const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function check() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const aaa = '0x5405e99be2461d2f2ce051b0ae13c224b08ea9cf';

  const aaaAbi = parseAbi([
    'function getCellKey(int32 x, int32 y) pure returns (bytes32)',
    'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight, uint32 crowdCount, uint32 lastOccupantId))'
  ]);
  const mainAbi = parseAbi([
    'function readSector(bytes32 sector) view returns (bytes32)',
    'function totalPortals() view returns (uint256)',
    'function getPortal(uint256 id) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt))',
    'function getPortalByFounder(address founder) view returns (uint256)'
  ]);

  const cellKey = await client.readContract({
    address: aaa,
    abi: aaaAbi,
    functionName: 'getCellKey',
    args: [4, 4]
  });
  console.log('Cell key for (4, 4):', cellKey);

  const rawSector = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'readSector',
    args: [cellKey]
  });
  console.log('Raw sector (4, 4):', rawSector);

  const cell = await client.readContract({
    address: aaa,
    abi: aaaAbi,
    functionName: 'getCell',
    args: [4, 4]
  });
  console.log('Decoded cell (4, 4):', cell);

  const portalIdFromCell = (cell.state << 8) | cell.reserved;
  console.log('Portal ID encoded in cell (4, 4):', portalIdFromCell);

  const totalPortals = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'totalPortals'
  });
  console.log('Total portals in Main_Gb_1:', totalPortals.toString());

  const p6 = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'getPortal',
    args: [6n]
  });
  console.log('Portal 6 info:', p6);

  const p2 = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'getPortal',
    args: [2n]
  });
  console.log('Portal 2 info:', p2);
}

check().catch(console.error);
