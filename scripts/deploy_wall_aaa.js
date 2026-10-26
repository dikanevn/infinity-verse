const fs = require('fs');
const solc = require('solc');
const { createWalletClient, createPublicClient, http, encodeDeployData } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { monadTestnet } = require('viem/chains');

const client = createPublicClient({ chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz') });

async function deployNewAaa() {
  const f = fs.readFileSync('.private/wallets.env', 'utf8');
  let deployerPk;
  for (const l of f.split('\n')) {
    const m = l.match(/DEPLOYER_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
    if (m) deployerPk = m[1];
  }
  const acc = privateKeyToAccount(deployerPk);
  const wallet = createWalletClient({ account: acc, chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz') });
  const g2 = '0x022d01b6e057e62e6B7Be9a2bE2b76e0Af26109B';
  const sponsor = '0x0c384BdE553645688EE3031ed607628bC554B44c';

  console.log('1. Compiling AAA with wall obstacle check...');
  const source = fs.readFileSync('contracts-evm/InfinityVerse_AAA.sol', 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'InfinityVerse_AAA.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 4294967295 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = out.contracts['InfinityVerse_AAA.sol']['InfinityVerse_AAA'];

  fs.writeFileSync('artifacts/InfinityVerse_AAA.json', JSON.stringify({ abi: contract.abi, bytecode: '0x' + contract.evm.bytecode.object }, null, 2));

  console.log('2. Deploying AAA...');
  const deployData = encodeDeployData({
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
    args: [g2, sponsor]
  });

  const gp = await client.getGasPrice();
  const txHash = await wallet.sendTransaction({
    data: deployData,
    gas: 2000000n,
    gasPrice: (gp * 110n) / 100n
  });
  console.log('Deploy Tx:', txHash);
  const rc = await client.waitForTransactionReceipt({ hash: txHash });
  const newAaa = rc.contractAddress;
  console.log('New AAA:', newAaa);

  console.log('3. Updating Main_G_2 setContractAAA...');
  const syncHash = await wallet.writeContract({
    address: g2,
    abi: [{ name: 'setContractAAA', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_newContractAAA', type: 'address' }], outputs: [] }],
    functionName: 'setContractAAA',
    args: [newAaa],
    gasPrice: (gp * 110n) / 100n,
    gas: 150000n
  });
  await client.waitForTransactionReceipt({ hash: syncHash });
  console.log('Sync status: SUCCESS');

  // Update client contracts.ts
  let contractsTs = fs.readFileSync('client/src/config/contracts.ts', 'utf8');
  contractsTs = contractsTs.replace(/export const AAA_CONTRACT_ADDRESS = '[^']+';/, `export const AAA_CONTRACT_ADDRESS = '${newAaa}';`);
  fs.writeFileSync('client/src/config/contracts.ts', contractsTs);

  // Update relayer wrangler.toml
  let wrangler = fs.readFileSync('relayer/wrangler.toml', 'utf8');
  wrangler = wrangler.replace(/AAA_CONTRACT_ADDRESS = "[^"]+"/, `AAA_CONTRACT_ADDRESS = "${newAaa}"`);
  fs.writeFileSync('relayer/wrangler.toml', wrangler);

  // Update relayer index.js
  let relayerJs = fs.readFileSync('relayer/src/index.js', 'utf8');
  relayerJs = relayerJs.replace(/const AAA_ADDRESS = '[^']+';/, `const AAA_ADDRESS = '${newAaa}';`);
  fs.writeFileSync('relayer/src/index.js', relayerJs);

  console.log('All configs updated to new AAA:', newAaa);
}
deployNewAaa().catch(console.error);
