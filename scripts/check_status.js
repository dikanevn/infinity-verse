const { createPublicClient, http, defineChain } = require('viem');
const chain = defineChain({ id: 10143, name: 'monad', nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' }, rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } } });
const client = createPublicClient({ chain, transport: http('https://testnet-rpc.monad.xyz') });
async function check() {
  const codeMain = await client.getBytecode({ address: '0xa524a7e5ddba429c227fd095bb9f5131526136f1' });
  console.log('Main 0xa524 length:', codeMain ? codeMain.length : 0);
  const bal = await client.getBalance({ address: '0x8F9f2837CA5B7df0edd544F6d429B1Ffc0B5C5C0' });
  console.log('Superadmin bal:', bal.toString());
}
check();
