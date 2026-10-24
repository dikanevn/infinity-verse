// deploy_and_test.js
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

  const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'Counter.json'), 'utf8'));

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

  console.log('\n--- 1. DEPLOYING COUNTER ON MONAD TESTNET ---');
  const t0 = Date.now();
  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode
  });
  console.log('Deploy Tx Hash:', deployHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const deployTime = ((Date.now() - t0) / 1000).toFixed(2);
  console.log('Contract deployed at:', receipt.contractAddress);
  console.log(`Deploy speed: ${deployTime}s (block #${receipt.blockNumber})`);

  const contractAddress = receipt.contractAddress;

  console.log('\n--- 2. CALLING INCREMENT() ---');
  const t1 = Date.now();
  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'increment'
  });
  console.log('Increment Tx Hash:', txHash);
  const txReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const txTime = ((Date.now() - t1) / 1000).toFixed(2);
  console.log(`Increment confirmed in: ${txTime}s (block #${txReceipt.blockNumber})`);

  console.log('\n--- 3. READING COUNT STATE ---');
  const currentCount = await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'count'
  });
  console.log('Current Counter Value:', currentCount.toString());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
