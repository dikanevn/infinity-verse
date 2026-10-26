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
        // Абсолютный максимум оптимизации рантайма (uint32 max):
        // runs: 4294967295 обеспечивает предельно дешевый газ для вызовов функций.
        // Если при дальнейшем расширении контракта размер превысит лимит EVM (24 576 байт),
        // значение runs следует уменьшать (например, до 100000, 10000 или 200).
        runs: 4294967295
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
        }
      }
    }
  };

  function findImports(importPath) {
    const cleanPath = importPath.replace(/^\.\//, '');
    const fullPath = path.resolve(__dirname, '..', 'contracts-evm', cleanPath);
    if (fs.existsSync(fullPath)) {
      return { contents: fs.readFileSync(fullPath, 'utf8') };
    }
    return { error: 'File not found' };
  }

  console.log(`Compiling ${contractFileName}...`);
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

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
    bytecode: '0x' + contract.evm.bytecode.object,
    deployedBytecode: '0x' + (contract.evm.deployedBytecode ? contract.evm.deployedBytecode.object : '')
  };

  const artifactDir = path.resolve(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

  const artifactPath = path.resolve(artifactDir, `${contractName}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`Artifact saved to artifacts/${contractName}.json`);
  const deployedBytes = (artifact.deployedBytecode.length - 2) / 2;
  console.log(`Deployed Bytecode Size: ${deployedBytes} bytes (limit: 24576 bytes)`);
}

const targetFile = process.argv[2] || 'InfinityVerse_main';
const targetName = process.argv[3] || (targetFile === 'InfinityVerse_main' ? 'InfinityVerse_Main' : targetFile);
compile(`${targetFile}.sol`, targetName);
