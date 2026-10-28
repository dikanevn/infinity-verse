// scripts/update_actual_md_seconds.js
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '.private', 'актуальное.md');
let text = fs.readFileSync(filePath, 'utf8');

text = text.replace(
  /Активный игровой модуль логики \(Gb_AAA_[0-9]\):\*\* `0x[a-fA-F0-9]+`/,
  "Активный игровой модуль логики (Gb_AAA_2):** `0x59b85a9ce34be3d22281726f943306ddddb31c2a`"
);

text = text.replace(
  /Роль `superAdmin` передана активному модулю `Gb_AAA_2` \(`0x[a-fA-F0-9\.]+`\)/,
  "Роль `superAdmin` передана активному модулю `Gb_AAA_2` (`0x59b85a9ce34be3d22281726f943306ddddb31c2a`)"
);

text = text.replace(
  /Обновлен на адреса Gb: Main `0xa524a7e5\.\.\.`, AAA `0x[a-fA-F0-9\.]+`\./,
  "Обновлен на адреса Gb: Main `0xa524a7e5...`, AAA `0x59b85a9c...`."
);

text = text.replace(
  /`AAA_CONTRACT_ADDRESS`: `0x[a-fA-F0-9]{40}`/,
  "`AAA_CONTRACT_ADDRESS`: `0x59b85a9ce34be3d22281726f943306ddddb31c2a`"
);

text = text.replace(
  /Актуальная версия клиента:\*\* `[^`]+`/,
  "Актуальная версия клиента:** `2810260630`"
);

text = text.replace(
  /- \*\*Ончейн-майнинг INFER в момент материализации субстанции[\s\S]*?- Запрет спавна квантовой субстанции/,
  `- **Ончейн-майнинг INFER в секундах времени Биткоина (Канон Сатоши):**
    - Базовая скорость эмиссии: 50 токенов INFER за 10 минут (600 секунд) = ~0.0833 токена в секунду.
    - В момент падения квантовой субстанции замеряется \`deltaT = block.timestamp - lastMinedAt\`.
    - Минимальный квант времени: 1 секунда (\`secondsWeight = 1\` = ~0.0833 токена INFER). Если прошло 60 секунд — субстанция рождается с весом 60 секунд (5.0 INFER).
    - \`secondsWeight\` (uint32) впечатывается в байты 2..5 клетки, а \`lastMinedAt\` обновляется в \`Main_Gb_1\`.
    - В момент сбора минтится честный объем токенов в wei: \`(secondsWeight * 50 ether) / 600\`.
  - Запрет спавна квантовой субстанции`
);

fs.writeFileSync(filePath, text, 'utf8');
console.log('Updated актуальное.md');
