// scripts/compile.js
const fs = require('fs');
const path = require('path');
const solc = require('solc');

function compile(contractFileName, contractName) {
  const contractPath = path.resolve(__dirname, '..', 'contracts-evm', contractFileName);
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      [contractFileName]: {
        content: source
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  console.log(`Compiling ${contractFileName}...`);
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    output.errors.forEach(err => {
      console.log(err.formattedMessage);
      if (err.severity === 'error') hasError = true;
    });
    if (hasError) process.exit(1);
  }

  const contract = output.contracts[contractFileName][contractName];
  const artifact = {
    contractName,
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object
  };

  const artifactDir = path.resolve(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

  const artifactPath = path.resolve(artifactDir, `${contractName}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`Artifact saved to artifacts/${contractName}.json`);
}

compile('InfinityVerse.sol', 'InfinityVerse');
