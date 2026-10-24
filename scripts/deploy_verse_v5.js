// scripts/deploy_verse_v5.js
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallet.env'), 'utf8');
  const pkMatch = envFile.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
  if (!pkMatch) throw new Error('Private key not found in wallet.env');
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

  const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_V_0_0_0_0_5.json'), 'utf8'));

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

  console.log('\n--- DEPLOYING INFINITY-VERSE V_0_0_0_0_5 (-1..+1 9 CELLS) ---');
  const t0 = Date.now();
  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode
  });
  console.log('Deploy Tx Hash:', deployHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const deployTime = ((Date.now() - t0) / 1000).toFixed(2);
  const contractAddress = receipt.contractAddress;
  console.log('InfinityVerse_V_0_0_0_0_5 deployed at:', contractAddress);
  console.log(`Deploy completed in ${deployTime}s`);

  // Verify view functions: read cell (0, 0) and batch of 25 cells (5x5)
  const xs = [];
  const ys = [];
  for (let y = 2; y >= -2; y--) {
    for (let x = -2; x <= 2; x++) {
      xs.push(x);
      ys.push(y);
    }
  }

  const [version, centerCell, batchCells] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'VERSION'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'getCell',
      args: [0, 0]
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'getCellsBatch',
      args: [xs, ys]
    })
  ]);

  console.log('\nContract Version:', version);
  console.log('Center Cell (0,0):', centerCell);
  console.log(`Successfully read all ${batchCells.length} initial cells around (0,0)!`);

  // Update deployments.json in .private
  const depPath = path.resolve(__dirname, '..', '.private', 'deployments.json');
  if (fs.existsSync(depPath)) {
    const deps = JSON.parse(fs.readFileSync(depPath, 'utf8'));
    if (!deps.monad_testnet) deps.monad_testnet = {};
    if (!deps.monad_testnet.contracts) deps.monad_testnet.contracts = {};
    deps.monad_testnet.contracts.InfinityVerse_V_0_0_0_0_5 = {
      address: contractAddress,
      version: '0.0.0.0.5',
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
