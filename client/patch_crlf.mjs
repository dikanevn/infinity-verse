import fs from 'fs';

const filePath = 'src/hooks/usePlayerState.ts';
let code = fs.readFileSync(filePath, 'utf8');

// Нормализуем к LF для безопасной замены
const isCrlf = code.includes('\r\n');
code = code.replace(/\r\n/g, '\n');

// 1. Циклический опрос состояния игрока каждые 5 сек
const oldPlayerEffect = `  useEffect(() => {
    if (connectedAddress) {
      fetchPlayer();
    } else {
      setPlayer(null);
    }
  }, [connectedAddress]);`;

const newPlayerEffect = `  useEffect(() => {
    if (connectedAddress) {
      fetchPlayer();
      const interval = setInterval(fetchPlayer, 5000);
      return () => clearInterval(interval);
    } else {
      setPlayer(null);
    }
  }, [connectedAddress]);`;

if (code.includes(oldPlayerEffect)) {
  code = code.replace(oldPlayerEffect, newPlayerEffect);
  console.log('1. Player interval replaced');
} else {
  console.log('1. Player interval NOT found');
}

// 2. Убираем локальный оптимистичный сдвиг игрока
const oldOptimistic = `      setStatusText(\`✅ Успешный шаг на (\${targetX}, \${targetY})\`);
      // Мгновенное обновление стейта игрока на клиенте, чтобы не ждать RPC-задержки Monad
      setPlayer((prev) => prev ? { ...prev, x: targetX, y: targetY } : null);`;

const newOptimistic = `      setStatusText(\`✅ Успешный шаг на (\${targetX}, \${targetY})\`);`;

if (code.includes(oldOptimistic)) {
  code = code.replace(oldOptimistic, newOptimistic);
  console.log('2. Optimistic update removed');
} else {
  console.log('2. Optimistic update NOT found');
}

// 3. Строгая проверка режима private_key
const oldPkCheck = `      // РЕЖИМ 1: ПРИВАТНЫЙ КЛЮЧ (Direct за собственный газ)
      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {`;

const newPkCheck = `      // РЕЖИМ 1: ПРИВАТНЫЙ КЛЮЧ (Direct за собственный газ)
      if (authMode === 'private_key') {
        if (!EncryptedRamSigner.isLocked()) {
          const devKey = (window as any).__DEV_LOCAL_PK__ || (typeof __DEV_LOCAL_PK__ !== 'undefined' ? __DEV_LOCAL_PK__ : '');
          if (devKey) {
            await EncryptedRamSigner.lockPrivateKey(devKey, 'xor');
          } else {
            throw new Error('Приватный ключ в оперативной памяти сброшен. Введите ключ заново.');
          }
        }`;

if (code.includes(oldPkCheck)) {
  code = code.replace(oldPkCheck, newPkCheck);
  console.log('3. PkCheck replaced');
} else {
  console.log('3. PkCheck NOT found');
}

if (isCrlf) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, code, 'utf8');

// Бампаем версию
const ver = '2810260705';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = ver;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');

let contracts = fs.readFileSync('src/config/contracts.ts', 'utf8');
contracts = contracts.replace(/CLIENT_VERSION = '.*?';/, "CLIENT_VERSION = '" + ver + "';");
fs.writeFileSync('src/config/contracts.ts', contracts, 'utf8');

console.log('Done!');
