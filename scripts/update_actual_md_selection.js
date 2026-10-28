// scripts/update_actual_md_selection.js
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', '.private', 'актуальное.md');
let text = fs.readFileSync(filePath, 'utf8');

text = text.replace(
  /Актуальная версия клиента:\*\* `[^`]+`/,
  "Актуальная версия клиента:** `2810260605`"
);

text = text.replace(
  /- Персонаж игрока: детализированный Робот-Исследователь/,
  `- Интерактивная плашка над выбранной клеткой: при выделении клетки мышью прямо над ней появляется парящий неоновый бейдж с названием объекта («Квантовая субстанция», «Обелиск», «Стена», «Портал» или «Пусто») со стрелочкой к клетке.\n- Персонаж игрока: детализированный Робот-Исследователь`
);

fs.writeFileSync(filePath, text, 'utf8');
console.log('Updated актуальное.md');
