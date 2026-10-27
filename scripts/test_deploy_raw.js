const fs = require('fs');
const { createWalletClient, createPublicClient, http, defineChain, getAddress, encodeDeployData } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function testDeployRaw() {
  const envFile = fs.readFileSync('.private/wallets.env', 'utf8');
  const privateKey = envFile.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const superAdminAddress = getAddress(envFile.match(/SUPERADMIN_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const sponsorAddress = getAddress(envFile.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/)[1]);
  const netConfig = JSON.parse(fs.readFileSync('network.config.json', 'utf8'));

  const chain = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: { default: { http: [netConfig.rpcUrl] } },
    testnet: true
  });

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport: http(netConfig.rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(netConfig.rpcUrl) });

  const aaaArtifact = JSON.parse(fs.readFileSync('artifacts/InfinityVerse_Gb_AAA_1.json', 'utf8'));
  const mainAddress = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';

  const data = encodeDeployData({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress]
  });

  const gasEst = await publicClient.estimateGas({
    account,
    data
  });
  console.log('Estimated gas for AAA:', gasEst.toString());

  const fee = await publicClient.estimateFeesPerGas();
  console.log('Fee:', fee);

  const totalCost = gasEst * fee.maxFeePerGas;
  console.log('Estimated total cost (wei):', totalCost.toString(), '(', Number(totalCost)/1e18, 'MON )');
  const bal = await publicClient.getBalance({ address: account.address });
  console.log('Account balance:', bal.toString(), '(', Number(bal)/1e18, 'MON )');
}

testDeployRaw().catch(console.error);
