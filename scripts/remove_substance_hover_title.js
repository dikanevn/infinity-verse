// scripts/remove_substance_hover_title.js
const fs = require('fs');
const path = require('path');

const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let code = fs.readFileSync(cellViewPath, 'utf8');

// Убираем title="Квантовая субстанция" при наведении на клетку
code = code.replace(
  `      title={
        isChaos
          ? 'Квантовый хаос. Для декогеренции необходим наблюдатель поблизости.'
          : isQuantumSubstance
          ? 'Квантовая субстанция'
          : isPortal
          ? \`Врата #\${portalId}: \${portalMeta?.worldName || 'Загрузка...'} (Основатель: \${portalMeta?.founderName || '...'})\`
          : undefined
      }`,
  `      title={
        isChaos
          ? 'Квантовый хаос. Для декогеренции необходим наблюдатель поблизости.'
          : isPortal
          ? \`Врата #\${portalId}: \${portalMeta?.worldName || 'Загрузка...'} (Основатель: \${portalMeta?.founderName || '...'})\`
          : undefined
      }`
);

// Убираем alt="Квантовая субстанция" чтобы браузеры не показывали нативную плашку
code = code.replace(
  `            src={STAR_PIXEL_SPRITE_URI}
            alt="Квантовая субстанция"`,
  `            src={STAR_PIXEL_SPRITE_URI}
            alt=""`
);

fs.writeFileSync(cellViewPath, code, 'utf8');
console.log('Removed substance hover title!');
