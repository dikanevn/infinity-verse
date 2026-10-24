// scripts/deploy_verse_main.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallet.env'), 'utf8');
  const pkMatch = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
  if (!pkMatch) throw new Error('Deployer private key not found in wallet.env');
  const privateKey = pkMatch[1];

  const sponsorEnv = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'sponsor_wallet.env'), 'utf8');
  const sponsorMatch = sponsorEnv.match(/SPONSOR_ADDRESS=(0x[a-fA-F0-9]{40})/);
  if (!sponsorMatch) throw new Error('Sponsor address not found in sponsor_wallet.env');
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

  const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_main.json'), 'utf8'));

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

  if (bal === 0n) {
    console.error('ERROR: Deployer has 0 balance! Please fund:', account.address);
    process.exit(1);
  }

  console.log('\n--- DEPLOYING INFINITY-VERSE MAIN ---');
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
  console.log('InfinityVerse_main deployed at:', contractAddress);
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
    contract: 'InfinityVerse_main',
    version: version,
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
