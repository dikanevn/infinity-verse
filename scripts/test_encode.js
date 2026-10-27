const fs = require('fs');
const { encodeDeployData } = require('viem');

const aaaArtifact = JSON.parse(fs.readFileSync('artifacts/InfinityVerse_Gb_AAA_1.json', 'utf8'));
const mainAddress = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
const sponsorAddress = '0x0c384BdE553645688EE3031ed607628bC554B44c';
const superAdminAddress = '0x8F9f2837CA5B7df0edd544F6d429B1Ffc0B5C5C0';

try {
  const data = encodeDeployData({
    abi: aaaArtifact.abi,
    bytecode: aaaArtifact.bytecode,
    args: [mainAddress, sponsorAddress, superAdminAddress]
  });
  console.log('Deploy data length:', data.length);
} catch (e) {
  console.error('encodeDeployData error:', e);
}
