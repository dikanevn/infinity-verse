const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('contracts-evm/InfinityVerse_Main_Gb_1.sol');
let code = fs.readFileSync(srcPath, 'utf8');

function stripComments(src) {
  let result = '';
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;
  
  for (let i = 0; i < src.length; i++) {
    if (inLineComment) {
      if (src[i] === '\n') {
        inLineComment = false;
        result += '\n';
      }
      continue;
    }
    if (inBlockComment) {
      if (src[i] === '*' && src[i + 1] === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (!inString) {
      if (src[i] === '/' && src[i + 1] === '/') {
        inLineComment = true;
        i++;
        continue;
      }
      if (src[i] === '/' && src[i + 1] === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (src[i] === '"' || src[i] === "'") {
        inString = true;
        stringChar = src[i];
        result += src[i];
        continue;
      }
      result += src[i];
    } else {
      if (src[i] === '\\') {
        result += src[i] + (src[i + 1] || '');
        i++;
      } else {
        if (src[i] === stringChar) {
          inString = false;
        }
        result += src[i];
      }
    }
  }
  return result;
}

let cleaned = stripComments(code);

// Remove REPOSITORY constant declaration
cleaned = cleaned.replace(/^\s*string\s+public\s+constant\s+REPOSITORY\s*=\s*[^;]+;\s*$/gm, '');

// Clean excess empty lines
cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
cleaned = cleaned.trim() + '\n';

const targetDir = path.resolve('contracts-evm/tmp');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetFile = path.join(targetDir, 'InfinityVerse_Main_Gb_1.sol');
fs.writeFileSync(targetFile, cleaned, 'utf8');

console.log('Saved clean contract to:', targetFile);
console.log('// count:', (cleaned.match(/\/\//g) || []).length);
console.log('/* count:', (cleaned.match(/\/\*/g) || []).length);
console.log('github count:', (cleaned.toLowerCase().match(/github/g) || []).length);
