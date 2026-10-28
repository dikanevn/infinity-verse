import fs from 'fs';

const filePath = 'src/hooks/usePlayerState.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Добавляем циклический опрос состояния игрока каждые 5 сек
code = code.replace(
`  useEffect(() => {
    if (connectedAddress) {
      fetchPlayer();
    } else {
      setPlayer(null);
    }
  }, [connectedAddress]);`,
`  useEffect(() => {
    if (connectedAddress) {
      fetchPlayer();
      const interval = setInterval(fetchPlayer, 5000);
      return () => clearInterval(interval);
    } else {
      setPlayer(null);
    }
  }, [connectedAddress]);`
);

// 2. Убираем локальный оптимистичный сдвиг игрока: ждем строго ончейн данных
code = code.replace(
`      setStatusText(\`✅ Успешный шаг на (\${targetX}, \${targetY})\`);
      // Мгновенное обновление стейта игрока на клиенте, чтобы не ждать RPC-задержки Monad
      setPlayer((prev) => prev ? { ...prev, x: targetX, y: targetY } : null);`,
`      setStatusText(\`✅ Успешный шаг на (\${targetX}, \${targetY})\`);`
);

// 3. Строгая проверка режима private_key: не проваливаться в релеер moveGasless!
code = code.replace(
`      // РЕЖИМ 1: ПРИВАТНЫЙ КЛЮЧ (Direct за собственный газ)
      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {`,
`      // РЕЖИМ 1: ПРИВАТНЫЙ КЛЮЧ (Direct за собственный газ)
      if (authMode === 'private_key') {
        if (!EncryptedRamSigner.isLocked()) {
          // Если страница перезагрузилась в dev-режиме, пробуем восстановить из devKey
          const devKey = (window as any).__DEV_LOCAL_PK__ || (typeof __DEV_LOCAL_PK__ !== 'undefined' ? __DEV_LOCAL_PK__ : '');
          if (devKey) {
            await EncryptedRamSigner.lockPrivateKey(devKey, 'xor');
          } else {
            throw new Error('Ключ в оперативной памяти сброшен после перезагрузки. Введите ключ заново.');
          }
        }`
);

fs.writeFileSync(filePath, code, 'utf8');

// 4. Бампаем версию
const ver = '2810260705';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = ver;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');

let contracts = fs.readFileSync('src/config/contracts.ts', 'utf8');
contracts = contracts.replace(/CLIENT_VERSION = '.*?';/, "CLIENT_VERSION = '" + ver + "';");
fs.writeFileSync('src/config/contracts.ts', contracts, 'utf8');

console.log('SUCCESSFULLY APPLIED STRICT CHECKS');
