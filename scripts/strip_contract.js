const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Main_Ga_1.sol');
let code = fs.readFileSync(srcPath, 'utf8');

// 1. Remove multi-line comments /* ... */
code = code.replace(/\/\*[\s\S]*?\*\//g, '');

// 2. Remove REPOSITORY line (remove github link completely for anonymous AI audit)
code = code.replace(/string public constant REPOSITORY = "https:\/\/github\.com\/dikanevn\/infinity-verse";\r?\n?/g, '');

// 3. Remove single-line comments // ...
code = code.replace(/\/\/.*/g, '');

// 4. Replace all require error messages with "error"
code = code.replace(/require\s*\(([\s\S]*?),\s*"[^"]*"\s*\)/g, 'require($1, "error")');

// 6. Collapse empty lines and trailing spaces
const lines = code.split('\n')
  .map(l => l.trimEnd())
  .filter(l => l.trim().length > 0);
code = lines.join('\n');

const tmpDir = path.resolve(__dirname, '..', 'contracts-evm', 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const dstPath = path.resolve(tmpDir, 'InfinityVerse_Main_Ga_1.sol');
fs.writeFileSync(dstPath, code, 'utf8');
console.log('Stripped contract written to:', dstPath);
console.log('Total lines:', lines.length);
