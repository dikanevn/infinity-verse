// scripts/check_rpc.js
const { createPublicClient, http, defineChain } = require('viem');

async function check() {
  const rpcs = [
    'https://testnet-rpc.monad.xyz',
    'https://monad-testnet.g.alchemy.com/v2/demo',
    'https://rpc.testnet.monad.xyz'
  ];

  for (const url of rpcs) {
    console.log('\nTesting RPC:', url);
    try {
      const client = createPublicClient({
        transport: http(url, { timeout: 5000 })
      });
      const start = Date.now();
      const block = await client.getBlockNumber();
      console.log(`✅ OK: block #${block} in ${Date.now() - start}ms`);
    } catch (e) {
      console.log(`❌ Failed:`, e.message);
    }
  }
}

check();
