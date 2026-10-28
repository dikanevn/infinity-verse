const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function check() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const mainAbi = parseAbi([
    'function readSlot(bytes32) view returns (bytes32)',
    'function getPortal(uint256) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt))'
  ]);

  const PORTAL_LIST_PREFIX = 6n << 160n;
  const PORTAL_OWNER_PREFIX = 10n << 160n;

  for (const id of [2n, 6n]) {
    const listSlot = '0x' + (PORTAL_LIST_PREFIX + id).toString(16).padStart(64, '0');
    const ownerSlot = '0x' + (PORTAL_OWNER_PREFIX + id).toString(16).padStart(64, '0');
    const valList = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSlot', args: [listSlot] });
    const valOwner = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSlot', args: [ownerSlot] });
    console.log(`Portal ${id}:`);
    console.log(`  readSlot LIST (${listSlot}) = ${valList}`);
    console.log(`  readSlot OWNER (${ownerSlot}) = ${valOwner}`);
  }
}
check();
