const fs = require('fs');
const env = fs.readFileSync('C:\\Users\\dikan\\projects\\windows-infinity-verse\\.private\\wallets.env', 'utf8');
env.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key.includes('ADDRESS') || key.includes('PUBLIC') || key.includes('ACCOUNT')) {
      console.log(key, '=', val);
    } else {
      console.log(key, '= [KEY PRESENT, len: ' + val.length + ']');
    }
  }
});
