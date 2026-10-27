const fs = require('fs');
const { createPublicClient, http, defineChain } = require('viem');
const envFile = fs.readFileSync('.private/wallets.env', 'utf8');
const netConfig = JSON.parse(fs.readFileSync('network.config.json', 'utf8'));
const chain = defineChain({ id: 10143, name: 'monad', nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' }, rpcUrls: { default: { http: [netConfig.rpcUrl] } } });
const client = createPublicClient({ chain, transport: http(netConfig.rpcUrl) });
async function check() {
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+_ADDRESS)=(0x[a-fA-F0-9]{40})/);
    if (m) {
      const b = await client.getBalance({ address: m[2] });
      console.log(m[1], m[2], (Number(b) / 1e18).toFixed(4), 'MON');
    }
  }
}
check();
