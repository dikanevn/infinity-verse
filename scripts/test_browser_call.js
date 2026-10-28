// scripts/test_browser_call.js
const fs = require('fs');
const path = require('path');
const { createPublicClient, http, defineChain, getAddress, parseAbi } = require('viem');

async function testCall() {
  const contractsPath = path.resolve(__dirname, '..', 'client', 'src', 'config', 'contracts.ts');
  const code = fs.readFileSync(contractsPath, 'utf8');
  const aaaMatch = code.match(/AAA_CONTRACT_ADDRESS = '(0x[a-fA-F0-9]{40})'/);
  const aaaAddress = aaaMatch[1];
  console.log('Testing AAA_CONTRACT_ADDRESS:', aaaAddress);

  const client = createPublicClient({
    transport: http('https://testnet-rpc.monad.xyz')
  });

  const abi = parseAbi([
    'function getCellsBatch(int32[] xs, int32[] ys) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight)[])',
    'function VERSION() view returns (string)'
  ]);

  try {
    const ver = await client.readContract({
      address: aaaAddress,
      abi,
      functionName: 'VERSION'
    });
    console.log('VERSION:', ver);
  } catch (e) {
    console.error('VERSION error:', e);
  }

  try {
    const cells = await client.readContract({
      address: aaaAddress,
      abi,
      functionName: 'getCellsBatch',
      args: [[0, 1], [0, 0]]
    });
    console.log('getCellsBatch result length:', cells.length);
    console.log('Cell 0:', cells[0]);
  } catch (e) {
    console.error('getCellsBatch error:', e);
  }
}

testCall();
