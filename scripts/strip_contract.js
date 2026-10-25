const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Main_Ga_1.sol');
let code = fs.readFileSync(srcPath, 'utf8');

// 1. Remove multi-line comments /* ... */
code = code.replace(/\/\*[\s\S]*?\*\//g, '');

// 2. Protect strings containing "//" like URLs before stripping comments
code = code.replace(/"https:\/\/github\.com\/dikanevn\/infinity-verse"/g, '___REPO_URL___');

// 3. Remove single-line comments // ...
code = code.replace(/\/\/.*/g, '');

// 4. Restore protected strings
code = code.replace(/___REPO_URL___/g, '"https://github.com/dikanevn/infinity-verse"');

// 5. Replace all require error messages with "error"
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
