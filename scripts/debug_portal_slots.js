const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function check() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const mainAbi = parseAbi([
    'function readSector(bytes32) view returns (bytes32)'
  ]);

  const PORTAL_LIST_PREFIX = 6n << 160n;
  const PORTAL_OWNER_PREFIX = 10n << 160n;

  for (const id of [2n, 6n]) {
    const listSlot = '0x' + (PORTAL_LIST_PREFIX + id).toString(16).padStart(64, '0');
    const ownerSlot = '0x' + (PORTAL_OWNER_PREFIX + id).toString(16).padStart(64, '0');
    const valList = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSector', args: [listSlot] });
    const valOwner = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSector', args: [ownerSlot] });
    console.log(`Portal ${id}:`);
    console.log(`  slot LIST (${listSlot}) = ${valList}`);
    console.log(`  slot OWNER (${ownerSlot}) = ${valOwner}`);
  }
}
check();
