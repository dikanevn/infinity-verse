// compile.js
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, '..', 'contracts', 'Counter.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'Counter.sol': { content: source }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === 'error') {
      console.error(err.formattedMessage);
      process.exit(1);
    }
  }
}

const contract = output.contracts['Counter.sol']['Counter'];
const artifact = {
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object
};

const outDir = path.resolve(__dirname, '..', 'artifacts');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'Counter.json'), JSON.stringify(artifact, null, 2));
console.log('COMPILE_SUCCESS');
