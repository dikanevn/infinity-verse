// scripts/update_actual_md.js
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '.private', 'актуальное.md');
let text = fs.readFileSync(filePath, 'utf8');

text = text.replace(
  /## 1\. Актуальное ончейн-состояние \(Monad Testnet 10143\)[\s\S]*?- \*\*Токен Звёзд \(InfinityVerse_Ga_TTT\):\*\*/,
  `## 1. Актуальное ончейн-состояние (Monad Testnet 10143)
- **Хранилище эпохи Gb (Main_Gb_1):** \`0xa524a7e5ddba429c227fd095bb9f5131526136f1\`
  - Универсальный низкоуровневый Raw Disk 32B (Eternal Storage) поколения Gb.
  - Реестр жителей: сквозной счетчик \`totalPlayers\`, прямой доступ \`PLAYER_LIST_PREFIX = 4\`, \`PLAYER_ID_PREFIX = 5\`.
  - Бесконечные Вложенные Порталы Мультивселенной (PurplePaper): префиксы \`6 .. 13 << 160\`, метод \`createPortal(targetContract, founder, founderName, worldName)\`.
  - Передача владения порталом: \`transferPortalOwnership(portalId, newOwner)\`.
  - Уничтожение портала: \`destroyPortal(portalId)\`.
  - Исключение \`superAdmin\` из авторизации действий над чужими порталами (только владелец портала или модуль с правами).
  - Dead Man's Switch: \`lastSuperAdminActiveAt\`, метод \`iAmHere()\`.
  - Резервный SuperAdmin: \`0xF9e702302360A8828F68a62A3066e55CC34D8b43\` (PLAYER3) с задержкой 7 дней (\`BACKUP_CLAIM_DELAY\`).
  - Археологический ревайв: 365 дней (\`ARCHAEOLOGICAL_CLAIM_DELAY\`).
  - **Универсальная системная переменная \`LAST_MINED_AT\`:** хранится в ячейке \`keccak256("INFINITY_VERSE.LAST_MINED_AT")\` в сырой памяти \`Main_Gb_1\` без изменения контракта Main.
- **Активный игровой модуль логики (Gb_AAA_2):** \`0x6b7fa42017eee9a2fe1d8ac3c51d71312d463316\`
  - Версия: \`GB-AAA-2\`.
  - Авторизован в \`Main_Gb_1\` с \`CLEARANCE_1 | CLEARANCE_2\` (perms = 3).
  - Байткод скомпилирован с максимальной оптимизацией: \`optimizer.runs: 4294967295\`.
  - **Ончейн-майнинг INFER по модели Биткоина (Канон Сатоши 2009 года):**
    - Базовая эмиссия: 50 токенов INFER за 10 минут (600 секунд) = ~0.0833 токена в секунду.
    - В момент сбора квантовой субстанции считывается \`deltaT = block.timestamp - lastMinedAt\`.
    - Награда рассчитывается динамически: \`reward = (deltaT * 50 ether) / 600\`.
    - \`lastMinedAt\` обновляется в памяти \`Main_Gb_1\` на текущий \`block.timestamp\`.
    - Убраны градации веса субстанций (единый вес 1, справедливое непрерывное распределение).
  - Запрет спавна квантовой субстанции на клетку пользователя (dx=0, dy=0) и на клетки с ЛЮБЫМИ объектами (обелиски, порталы, другие звезды).
  - Автоматическая регистрация при спавне в реестр жителей \`Main_Gb_1.registerPlayer(player)\`.
  - Поддержка Gasless сессий: \`authorizeSessionGasless\`, \`revokeSessionGasless\` и валидация подписи активного \`sessionKey\` в \`spawnGasless\`.
  - Интерактивный игровой объект Врат (\`OBJECT_PORTAL = 4\`): событие \`PortalEntered\`, создание через \`createPortalDirect\`.
  - **Правило установки портала:** установка разрешена СТРОГО на клетку справа от игрока (\`portalX == currentX + 1\` и \`portalY == currentY\`), иначе ревертится с ошибкой \`PortalMustBeOnRight()\`.
  - Защита священной зоны 5х5 вокруг Обелиска (0, 0): создание портала в диапазоне \`x in [-2, 2]\` и \`y in [-2, 2]\` отклоняется с ошибкой \`SacredZoneProtected\`.
  - Передача владения порталом на карте: \`transferPortalDirect(portalId, newOwner)\`.
  - Уничтожение портала и снос тайла на карте: \`destroyPortalDirect(portalId, portalX, portalY)\`.
  - Генерация 5х5 вокруг игрока, падение субстанции (50% шанс) и ончейн-майнинг токенов $INFER.
- **Токен Звёзд (InfinityVerse_Ga_TTT):**`
);

text = text.replace(
  /Роль `superAdmin` передана активному модулю `Gb_AAA_[0-9]` \(`0x[a-fA-F0-9\.]+`\)/,
  "Роль `superAdmin` передана активному модулю `Gb_AAA_2` (`0x6b7fa42017eee9a2fe1d8ac3c51d71312d463316`)"
);

text = text.replace(
  /Обновлен на адреса Gb: Main `0xa524a7e5\.\.\.`, AAA `0x[a-fA-F0-9\.]+`\./,
  "Обновлен на адреса Gb: Main `0xa524a7e5...`, AAA `0x6b7fa420...`."
);

text = text.replace(
  /## 2\. Клиентский интерфейс \(Frontend\)[\s\S]*?- \*\*Адреса контрактов в клиентском конфиге:\*\*/,
  `## 2. Клиентский интерфейс (Frontend)
- **Актуальная версия клиента:** \`2810260555\` (МСК формат в \`client/package.json\` и \`client/src/config/contracts.ts\`).
- **Стек:** React 19, Vite, TypeScript, Viem 2.x, Tailwind CSS.
- **Адреса контрактов в клиентском конфиге:**`
);

text = text.replace(
  /`AAA_CONTRACT_ADDRESS`: `0x[a-fA-F0-9]{40}`/,
  "`AAA_CONTRACT_ADDRESS`: `0x6b7fa42017eee9a2fe1d8ac3c51d71312d463316`"
);

fs.writeFileSync(filePath, text, 'utf8');
console.log('Updated .private/актуальное.md successfully');
