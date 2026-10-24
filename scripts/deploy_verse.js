// scripts/deploy_verse.js
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

  const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_V_0_0_0_0_2.json'), 'utf8'));

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

  console.log('\n--- 1. DEPLOYING INFINITY-VERSE V0_0_0_0_2 ---');
  const t0 = Date.now();
  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode
  });
  console.log('Deploy Tx Hash:', deployHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const deployTime = ((Date.now() - t0) / 1000).toFixed(2);
  const contractAddress = receipt.contractAddress;
  console.log('InfinityVerseV0_0_0_0_2 deployed at:', contractAddress);
  console.log(`Speed: ${deployTime}s (block #${receipt.blockNumber})`);

  // Spawning player in cell 4 (center)
  console.log('\n--- 2. INITIAL SPAWN IN CENTER (CELL 4) ---');
  const spawnTx = await walletClient.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'spawn',
    args: [4]
  });
  console.log('Spawn Tx Hash:', spawnTx);
  await publicClient.waitForTransactionReceipt({ hash: spawnTx });
  console.log('Spawned player address in cell 4!');

  const [grid, starCell] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'getGrid'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'starCell'
    })
  ]);

  console.log('Initial Grid State:');
  console.log(grid);
  console.log('Initial Star Cell:', starCell);

  // Update deployments.json in .private
  const depPath = path.resolve(__dirname, '..', '.private', 'deployments.json');
  if (fs.existsSync(depPath)) {
    const deps = JSON.parse(fs.readFileSync(depPath, 'utf8'));
    if (!deps.monad_testnet) deps.monad_testnet = {};
    if (!deps.monad_testnet.contracts) deps.monad_testnet.contracts = {};
    deps.monad_testnet.contracts.InfinityVerseV0_0_0_0_2 = {
      address: contractAddress,
      version: "0.0.0.0.2",
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
