// scripts/deploy_verse_v6.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const pkMatch = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
  if (!pkMatch) throw new Error('Private key not found in wallets.env');
  const privateKey = pkMatch[1];

  const sponsorEnv = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const sponsorMatch = sponsorEnv.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/);
  if (!sponsorMatch) throw new Error('Sponsor address not found in wallets.env');
  const sponsorAddress = sponsorMatch[1];

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));

  const monadTestnet = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: {
      decimals: 18,
      name: netConfig.currencySymbol,
      symbol: netConfig.currencySymbol,
    },
    rpcUrls: {
      default: { http: [netConfig.rpcUrl] },
      public: { http: [netConfig.rpcUrl] },
    },
    blockExplorers: {
      default: { name: 'Explorer', url: netConfig.blockExplorerUrl },
    },
    testnet: true,
  });

  const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_V_0_0_0_0_6.json'), 'utf8'));

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(netConfig.rpcUrl)
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(netConfig.rpcUrl)
  });

  console.log('Deployer address:', account.address);
  console.log('Sponsor/Relayer address:', sponsorAddress);
  const bal = await publicClient.getBalance({ address: account.address });
  console.log('Deployer Balance:', Number(bal) / 1e18, netConfig.currencySymbol);

  console.log('\n--- DEPLOYING INFINITY-VERSE V_0_0_0_0_6 (PLAYERS + RELAYER SUPPORT) ---');
  const t0 = Date.now();
  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [sponsorAddress]
  });
  console.log('Deploy Tx Hash:', deployHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const deployTime = ((Date.now() - t0) / 1000).toFixed(2);
  const contractAddress = receipt.contractAddress;
  console.log('InfinityVerse_V_0_0_0_0_6 deployed at:', contractAddress);
  console.log(`Deploy completed in ${deployTime}s`);

  // Verify view functions
  const [version, activeRelayer] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'VERSION',
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'relayer',
    })
  ]);

  console.log('Contract Version:', version);
  console.log('Configured Relayer:', activeRelayer);

  // Log deployment
  const deployLog = {
    version: '0.0.0.0.6',
    address: contractAddress,
    deployer: account.address,
    relayer: sponsorAddress,
    txHash: deployHash,
    deployedAt: new Date().toISOString(),
    network: netConfig.networkName,
    chainId: netConfig.chainId
  };

  const deploymentsFile = path.resolve(__dirname, '..', '.private', 'deployments.json');
  let history = [];
  if (fs.existsSync(deploymentsFile)) {
    try { history = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8')); } catch (e) {}
  }
  history.push(deployLog);
  fs.writeFileSync(deploymentsFile, JSON.stringify(history, null, 2));
  console.log('Saved to .private/deployments.json');
}

main().catch(console.error);
