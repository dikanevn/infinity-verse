const fs = require('fs');
const { createWalletClient, createPublicClient, http, defineChain, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function fundSuperAdmin() {
  const env = fs.readFileSync('.private/wallets.env', 'utf8');
  const chain = defineChain({
    id: 10143,
    name: 'Monad',
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } }
  });
  const client = createPublicClient({ chain, transport: http('https://testnet-rpc.monad.xyz') });

  const p3Pk = env.match(/PLAYER3_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const p3Acc = privateKeyToAccount(p3Pk);
  const p3Wallet = createWalletClient({ account: p3Acc, chain, transport: http('https://testnet-rpc.monad.xyz') });

  const spPk = env.match(/SPONSOR_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const spAcc = privateKeyToAccount(spPk);
  const spWallet = createWalletClient({ account: spAcc, chain, transport: http('https://testnet-rpc.monad.xyz') });

  const saAddr = env.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1];

  console.log('Sending 0.5 MON from PLAYER3 to SUPERADMIN...');
  const hash1 = await p3Wallet.sendTransaction({
    to: saAddr,
    value: parseEther('0.5')
  });
  await client.waitForTransactionReceipt({ hash: hash1 });
  console.log('✅ 0.5 MON transferred from Player 3. Hash:', hash1);

  console.log('Sending 0.08 MON from SPONSOR to SUPERADMIN...');
  const hash2 = await spWallet.sendTransaction({
    to: saAddr,
    value: parseEther('0.08')
  });
  await client.waitForTransactionReceipt({ hash: hash2 });
  console.log('✅ 0.08 MON transferred from Sponsor. Hash:', hash2);

  const finalBal = await client.getBalance({ address: saAddr });
  console.log('🎉 Final SUPERADMIN Balance:', Number(finalBal) / 1e18, 'MON');
}

fundSuperAdmin().catch(console.error);
