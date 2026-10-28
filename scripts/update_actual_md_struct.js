// scripts/update_actual_md_struct.js
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '.private', 'актуальное.md');
let text = fs.readFileSync(filePath, 'utf8');

text = text.replace(
  /Активный игровой модуль логики \(Gb_AAA_[0-9]\):\*\* `0x[a-fA-F0-9]+`/,
  "Активный игровой модуль логики (Gb_AAA_2):** `0x1952c8260da039906b4e3129b701ae46de175b20`"
);

text = text.replace(
  /Роль `superAdmin` передана активному модулю `Gb_AAA_2` \(`0x[a-fA-F0-9\.]+`\)/,
  "Роль `superAdmin` передана активному модулю `Gb_AAA_2` (`0x1952c8260da039906b4e3129b701ae46de175b20`)"
);

text = text.replace(
  /Обновлен на адреса Gb: Main `0xa524a7e5\.\.\.`, AAA `0x[a-fA-F0-9\.]+`\./,
  "Обновлен на адреса Gb: Main `0xa524a7e5...`, AAA `0x1952c826...`."
);

text = text.replace(
  /`AAA_CONTRACT_ADDRESS`: `0x[a-fA-F0-9]{40}`/,
  "`AAA_CONTRACT_ADDRESS`: `0x1952c8260da039906b4e3129b701ae46de175b20`"
);

text = text.replace(
  /Актуальная версия клиента:\*\* `[^`]+`/,
  "Актуальная версия клиента:** `2610280658`"
);

fs.writeFileSync(filePath, text, 'utf8');
console.log('Updated актуальное.md');
