const fs = require('fs');
const { createWalletClient, createPublicClient, http, defineChain, getAddress, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function testDeploy() {
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

  console.log('Testing deploy AAA with estimateGas first...');
  const deployData = {
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress],
    account
  };

  try {
    const gasEst = await publicClient.estimateContractGas(deployData);
    console.log('Gas estimated:', gasEst.toString());
  } catch (err) {
    console.error('estimateContractGas failed:', err.message);
  }
}

testDeploy();
