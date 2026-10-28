const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, defineChain, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main() {
  console.log('=== УДАЛЕНИЕ ПОРТАЛОВ #2 И #6 И ОЧИСТКА КЛЕТКИ (4, 4) ===\n');

  const envPath = path.resolve(__dirname, '..', '.private', 'wallets.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const superAdminKeyMatch = envContent.match(/SUPERADMIN_PRIVATE_KEY=(0x[a-fA-F0-9]{64})/);
  if (!superAdminKeyMatch) throw new Error('SUPERADMIN_PRIVATE_KEY не найден в wallets.env');
  const superAdminKey = superAdminKeyMatch[1];

  const netConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'network.config.json'), 'utf8'));
  const chain = defineChain({
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
    rpcUrls: {
      default: { http: [netConfig.rpcUrl || 'https://testnet-rpc.monad.xyz'] },
      public: { http: [netConfig.rpcUrl || 'https://testnet-rpc.monad.xyz'] }
    }
  });

  const account = privateKeyToAccount(superAdminKey);
  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ account, chain, transport: http() });

  console.log('Суперадмин:', account.address);
  const mainAddress = '0xa524a7e5ddba429c227fd095bb9f5131526136f1';
  const aaaAddress = '0x5405e99be2461d2f2ce051b0ae13c224b08ea9cf';

  const mainAbi = parseAbi([
    'function destroyPortal(uint256 portalId) external',
    'function writeSector(bytes32 sector, bytes32 data) external',
    'function getPortal(uint256 id) view returns ((uint256 id, address parentContract, address targetContract, address founder, bytes32 founderName, bytes32 worldName, uint256 createdAt))'
  ]);
  const aaaAbi = parseAbi([
    'function getCellKey(int32 x, int32 y) pure returns (bytes32)',
    'function getCell(int32 x, int32 y) view returns ((uint8 terrain, uint8 object, uint8 state, uint8 reserved, uint32 secondsWeight, uint32 crowdCount, uint32 lastOccupantId))'
  ]);

  let currentNonce = await publicClient.getTransactionCount({ address: account.address });
  console.log('Текущий nonce:', currentNonce);

  // 1. Уничтожение Портала #2 (владелец: SuperAdmin)
  console.log('\n[1/3] Отправка destroyPortal(2)...');
  const tx2 = await walletClient.writeContract({
    address: mainAddress,
    abi: mainAbi,
    functionName: 'destroyPortal',
    args: [2n],
    nonce: currentNonce++
  });
  console.log('Tx destroyPortal(2) отправлена:', tx2);
  const receipt2 = await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log('✅ Tx destroyPortal(2) подтверждена! Блок:', receipt2.blockNumber);

  // 2. Уничтожение Портала #6 (владелец: Ник / PLAYER3, удаляется через SuperAdmin/Admin)
  console.log('\n[2/3] Отправка destroyPortal(6)...');
  const tx6 = await walletClient.writeContract({
    address: mainAddress,
    abi: mainAbi,
    functionName: 'destroyPortal',
    args: [6n],
    nonce: currentNonce++
  });
  console.log('Tx destroyPortal(6) отправлена:', tx6);
  const receipt6 = await publicClient.waitForTransactionReceipt({ hash: tx6 });
  console.log('✅ Tx destroyPortal(6) подтверждена! Блок:', receipt6.blockNumber);

  // 3. Очистка тайла (4, 4) на карте мира в Main_Gb_1
  console.log('\n[3/3] Очистка объекта тайла (4, 4) на карте...');
  const cellKey = await clientCellKey(publicClient, aaaAddress, aaaAbi, 4, 4);
  // Сохраняем terrain = 1 (песок), сбрасываем object = 0, state = 0, reserved = 0
  const clearedCell = '0x0100000000000000000000000000000000000000000000000000000000000000';
  const txClear = await walletClient.writeContract({
    address: mainAddress,
    abi: mainAbi,
    functionName: 'writeSector',
    args: [cellKey, clearedCell],
    nonce: currentNonce++
  });
  console.log('Tx writeSector отправлена:', txClear);
  const receiptClear = await publicClient.waitForTransactionReceipt({ hash: txClear });
  console.log('✅ Tx writeSector подтверждена! Блок:', receiptClear.blockNumber);

  // 4. Финальная проверка клетки (4, 4) и статусов порталов
  console.log('\n=== ПРОВЕРКА ПОСЛЕ УДАЛЕНИЯ ===');
  const cellAfter = await publicClient.readContract({
    address: aaaAddress,
    abi: aaaAbi,
    functionName: 'getCell',
    args: [4, 4]
  });
  console.log('Клетка (4, 4) после очистки:', cellAfter);

  const p2After = await publicClient.readContract({
    address: mainAddress,
    abi: mainAbi,
    functionName: 'getPortal',
    args: [2n]
  });
  console.log('Портал #2 target после destroy:', p2After.targetContract);

  const p6After = await publicClient.readContract({
    address: mainAddress,
    abi: mainAbi,
    functionName: 'getPortal',
    args: [6n]
  });
  console.log('Портал #6 target после destroy:', p6After.targetContract);

  if (cellAfter.object === 0 && p2After.targetContract === '0x0000000000000000000000000000000000000000' && p6After.targetContract === '0x0000000000000000000000000000000000000000') {
    console.log('\n🎉 ВСЕ ПОРТАЛЫ УСПЕШНО УДАЛЕНЫ, ТАЙЛ (4, 4) ПОЛНОСТЬЮ ОЧИЩЕН!');
  }
}

async function clientCellKey(client, aaaAddress, aaaAbi, x, y) {
  return await client.readContract({
    address: aaaAddress,
    abi: aaaAbi,
    functionName: 'getCellKey',
    args: [x, y]
  });
}

main().catch(console.error);
