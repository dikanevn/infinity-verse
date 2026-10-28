// scripts/update_actual_md_weight.js
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '.private', 'актуальное.md');
let text = fs.readFileSync(filePath, 'utf8');

text = text.replace(
  /Активный игровой модуль логики \(Gb_AAA_[0-9]\):\*\* `0x[a-fA-F0-9]+`/,
  "Активный игровой модуль логики (Gb_AAA_2):** `0x28d37c320c6e58347d735fd89bb661f63c088fd1`"
);

text = text.replace(
  /Роль `superAdmin` передана активному модулю `Gb_AAA_2` \(`0x[a-fA-F0-9\.]+`\)/,
  "Роль `superAdmin` передана активному модулю `Gb_AAA_2` (`0x28d37c320c6e58347d735fd89bb661f63c088fd1`)"
);

text = text.replace(
  /Обновлен на адреса Gb: Main `0xa524a7e5\.\.\.`, AAA `0x[a-fA-F0-9\.]+`\./,
  "Обновлен на адреса Gb: Main `0xa524a7e5...`, AAA `0x28d37c32...`."
);

text = text.replace(
  /`AAA_CONTRACT_ADDRESS`: `0x[a-fA-F0-9]{40}`/,
  "`AAA_CONTRACT_ADDRESS`: `0x28d37c320c6e58347d735fd89bb661f63c088fd1`"
);

text = text.replace(
  /Актуальная версия клиента:\*\* `[^`]+`/,
  "Актуальная версия клиента:** `2810260620`"
);

text = text.replace(
  /- \*\*Ончейн-майнинг INFER по модели Биткоина \(Канон Сатоши 2009 года\):[\s\S]*?- Запрет спавна квантовой субстанции/,
  `- **Ончейн-майнинг INFER в момент материализации субстанции (Канон Сатоши 2009 года):**
    - Базовая эмиссия: 50 токенов INFER за 10 минут (600 секунд) = ~0.0833 токена в секунду.
    - В момент падения квантовой субстанции на карту замеряется \`deltaT = block.timestamp - lastMinedAt\`.
    - Рассчитывается добытый вес: \`weight = uint32((deltaT * 50) / 600)\` (запас uint32: до 4.29 млрд токенов в одной субстанции).
    - Вес впечатывается в байты 2..5 клетки, а \`lastMinedAt\` обновляется в \`Main_Gb_1\` на текущий таймстамп.
    - При наступлении игрока на клетку считывается её точный вес \`weight\` и минтится ровно \`weight * 1 ether\` токенов $INFER, после чего клетка очищается.
  - Запрет спавна квантовой субстанции`
);

fs.writeFileSync(filePath, text, 'utf8');
console.log('Updated актуальное.md');
