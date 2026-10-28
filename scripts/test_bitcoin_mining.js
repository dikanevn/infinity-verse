// scripts/test_bitcoin_mining.js
const fs = require('fs');
const path = require('path');
const { createPublicClient, http, defineChain, getAddress } = require('viem');

async function main() {
  console.log('=== ТЕСТИРОВАНИЕ ОНЧЕЙН-МАЙНИНГА GB_AAA_2 ===\n');

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));
  const chain = defineChain({
    id: netConfig.chainId,
    name: netConfig.networkName,
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: { default: { http: [netConfig.rpcUrl] } },
    testnet: true
  });

  const publicClient = createPublicClient({ chain, transport: http(netConfig.rpcUrl) });
  const aaa2Artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'artifacts', 'InfinityVerse_Gb_AAA_2.json'), 'utf8'));
  const aaaAddress = getAddress('0x6b7fa42017eee9a2fe1d8ac3c51d71312d463316');

  const [reward, deltaT, lastMined] = await publicClient.readContract({
    address: aaaAddress,
    abi: aaa2Artifact.abi,
    functionName: 'getCurrentMiningReward'
  });

  console.log('Last mined timestamp:', lastMined.toString());
  console.log('Delta T (seconds):', deltaT.toString());
  console.log('Current reward (wei):', reward.toString());
  console.log('Current reward (INFER):', Number(reward) / 1e18);
  console.log('✅ Проверка прошла успешно!');
}

main().catch(console.error);
