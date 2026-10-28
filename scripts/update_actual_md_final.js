// scripts/update_actual_md_final.js
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '.private', 'актуальное.md');
let text = fs.readFileSync(filePath, 'utf8');

text = text.replace(
  /Активный игровой модуль логики \(Gb_AAA_[0-9]\):\*\* `0x[a-fA-F0-9]+`/,
  "Активный игровой модуль логики (Gb_AAA_2):** `0xcbb11633010b459310637aa65f3d0b3fba76561c`"
);

text = text.replace(
  /Роль `superAdmin` передана активному модулю `Gb_AAA_2` \(`0x[a-fA-F0-9\.]+`\)/,
  "Роль `superAdmin` передана активному модулю `Gb_AAA_2` (`0xcbb11633010b459310637aa65f3d0b3fba76561c`)"
);

text = text.replace(
  /Обновлен на адреса Gb: Main `0xa524a7e5\.\.\.`, AAA `0x[a-fA-F0-9\.]+`\./,
  "Обновлен на адреса Gb: Main `0xa524a7e5...`, AAA `0xcbb11633...`."
);

text = text.replace(
  /`AAA_CONTRACT_ADDRESS`: `0x[a-fA-F0-9]{40}`/,
  "`AAA_CONTRACT_ADDRESS`: `0xcbb11633010b459310637aa65f3d0b3fba76561c`"
);

text = text.replace(
  /Актуальная версия клиента:\*\* `[^`]+`/,
  "Актуальная версия клиента:** `2810260650`"
);

fs.writeFileSync(filePath, text, 'utf8');
console.log('Updated актуальное.md');
