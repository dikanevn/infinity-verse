const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, getAddress, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.private', 'wallets.env'), 'utf8');
  const privateKey = envFile.match(/PLAYER4_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/)[1];
  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));

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

  const aaaAbi = parseAbi([
    'function getPlayer(address) view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry, uint64 registeredAtBlock, uint64 registeredAtTimestamp)',
    'function moveDirect(int32 targetX, int32 targetY)'
  ]);
  const aaa = '0x5405e99be2461d2f2ce051b0ae13c224b08ea9cf';

  const p = await publicClient.readContract({ address: aaa, abi: aaaAbi, functionName: 'getPlayer', args: [account.address] });
  console.log(`Current Player 4 pos: (${p[0]}, ${p[1]})`);

  // Шагнем на клетку (1, 1)
  const targetX = 1;
  const targetY = 1;
  console.log(`Moving Player 4 to (${targetX}, ${targetY})...`);

  const fee = await publicClient.estimateFeesPerGas();
  const hash = await walletClient.writeContract({
    address: aaa,
    abi: aaaAbi,
    functionName: 'moveDirect',
    args: [targetX, targetY],
    maxFeePerGas: (fee.maxFeePerGas * 12n) / 10n,
    maxPriorityFeePerGas: (fee.maxPriorityFeePerGas * 12n) / 10n,
    gas: 300000n
  });
  console.log('Tx submitted:', hash);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('Move confirmed!');
}

main().catch(console.error);
