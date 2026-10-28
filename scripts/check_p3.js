const fs = require('fs');
const path = require('path');
const { createPublicClient, http } = require('viem');

async function main() {
  const client = createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') });
  const abi = [{
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getPlayer',
    outputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
      { name: 'exists', type: 'bool' },
      { name: 'sessionKey', type: 'address' },
      { name: 'sessionExpiry', type: 'uint256' },
      { name: 'registeredAtBlock', type: 'uint256' },
      { name: 'registeredAtTimestamp', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }];

  const contractsCfg = fs.readFileSync(path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts'), 'utf8');
  const aaaAddress = contractsCfg.match(/AAA_CONTRACT_ADDRESS = '(0x[a-fA-F0-9]{40})'/)[1];

  const p3 = '0xF9e702302360A8828F68a62A3066e55CC34D8b43';
  const res = await client.readContract({
    address: aaaAddress,
    abi,
    functionName: 'getPlayer',
    args: [p3]
  });

  console.log('AAA Address:', aaaAddress);
  console.log('Player 3 on-chain:', {
    x: res[0],
    y: res[1],
    exists: res[2],
    sessionKey: res[3],
    sessionExpiry: res[4].toString()
  });
}

main().catch(console.error);
