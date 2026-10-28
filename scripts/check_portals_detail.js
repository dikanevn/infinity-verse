const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function check() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const mainAbi = parseAbi([
    'function totalPortals() view returns (uint256)',
    'function readSector(bytes32) view returns (bytes32)'
  ]);

  const PORTAL_LIST_PREFIX = 6n << 160n;
  const PORTAL_OWNER_PREFIX = 10n << 160n;
  const PORTAL_FOUNDER_PREFIX = 8n << 160n;
  const PORTAL_WORLD_PREFIX = 9n << 160n;

  const total = await client.readContract({ address: main, abi: mainAbi, functionName: 'totalPortals' });
  console.log('Total portals count:', total.toString());

  for (let i = 1; i <= Number(total); i++) {
    await new Promise(r => setTimeout(r, 100)); // avoid rate limit
    const id = BigInt(i);
    const targetSlot = '0x' + (PORTAL_LIST_PREFIX + id).toString(16).padStart(64, '0');
    const ownerSlot = '0x' + (PORTAL_OWNER_PREFIX + id).toString(16).padStart(64, '0');
    const founderNameSlot = '0x' + (PORTAL_FOUNDER_PREFIX + id).toString(16).padStart(64, '0');
    const worldNameSlot = '0x' + (PORTAL_WORLD_PREFIX + id).toString(16).padStart(64, '0');

    const rawTarget = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSector', args: [targetSlot] });
    const rawOwner = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSector', args: [ownerSlot] });
    const rawFounderName = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSector', args: [founderNameSlot] });
    const rawWorldName = await client.readContract({ address: main, abi: mainAbi, functionName: 'readSector', args: [worldNameSlot] });

    const targetAddr = '0x' + rawTarget.slice(26);
    const ownerAddr = '0x' + rawOwner.slice(26);

    const fName = Buffer.from(rawFounderName.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
    const wName = Buffer.from(rawWorldName.slice(2), 'hex').toString('utf8').replace(/\0/g, '');

    console.log(`Portal ${i}: active=${targetAddr !== '0x0000000000000000000000000000000000000000'}, target=${targetAddr}, owner=${ownerAddr}, founderName="${fName}", worldName="${wName}"`);
  }
}

check().catch(console.error);
