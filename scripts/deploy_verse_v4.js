// scripts/deploy_verse_v4.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const pkMatch = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
  if (!pkMatch) throw new Error('Private key not found in wallets.env');
  const privateKey = pkMatch[1];

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

  const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_V_0_0_0_0_4.json'), 'utf8'));

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
  const bal = await publicClient.getBalance({ address: account.address });
  console.log('Balance:', Number(bal) / 1e18, netConfig.currencySymbol);

  console.log('\n--- DEPLOYING INFINITY-VERSE V_0_0_0_0_4 ---');
  const t0 = Date.now();
  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode
  });
  console.log('Deploy Tx Hash:', deployHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const deployTime = ((Date.now() - t0) / 1000).toFixed(2);
  const contractAddress = receipt.contractAddress;
  console.log('InfinityVerse_V_0_0_0_0_4 deployed at:', contractAddress);
  console.log('Deploy completed');

  // Verify view functions
  const [version, allCells] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'VERSION'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'getAllCells'
    })
  ]);

  console.log('Contract Version:', version);
  console.log('Total Cells read:', allCells.length);

  // Update deployments.json in .private
  const depPath = path.resolve(__dirname, '..', '.private', 'deployments.json');
  if (fs.existsSync(depPath)) {
    const deps = JSON.parse(fs.readFileSync(depPath, 'utf8'));
    if (!deps.monad_testnet) deps.monad_testnet = {};
    if (!deps.monad_testnet.contracts) deps.monad_testnet.contracts = {};
    deps.monad_testnet.contracts.InfinityVerse_V_0_0_0_0_4 = {
      address: contractAddress,
      version: '0.0.0.0.4',
      deployTx: deployHash,
      deployedAtBlock: Number(receipt.blockNumber),
      deployedAtTimestamp: new Date().toISOString()
    };
    fs.writeFileSync(depPath, JSON.stringify(deps, null, 2));
    console.log('Updated deployments.json in .private');
  }

  return contractAddress;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
