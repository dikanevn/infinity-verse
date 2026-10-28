const { createPublicClient, http, parseAbi } = require('viem');
const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });

async function check() {
  const main = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const mainAbi = parseAbi([
    'function getPortalByFounder(address) view returns (uint256)',
    'function getPortalId(address) view returns (uint256)'
  ]);

  const pAdmin = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'getPortalByFounder',
    args: ['0x8F9f2837CA5B7df0edd544F6d429B1Ffc0B5C5C0']
  });
  console.log('Portal by founder SuperAdmin (0x8F9f...):', pAdmin.toString());

  const pNick = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'getPortalByFounder',
    args: ['0xF9e702302360A8828F68a62A3066e55CC34D8b43']
  });
  console.log('Portal by founder Nick/P3 (0xF9e7...):', pNick.toString());

  const id1001 = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'getPortalId',
    args: ['0x0000000000000000000000000000000000001001']
  });
  console.log('Portal ID for target 0x1001:', id1001.toString());

  const idNick = await client.readContract({
    address: main,
    abi: mainAbi,
    functionName: 'getPortalId',
    args: ['0xF9e702302360A8828F68a62A3066e55CC34D8b43']
  });
  console.log('Portal ID for target Nick:', idNick.toString());
}
check();
