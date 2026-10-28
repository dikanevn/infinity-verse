// scripts/fix_cell_view.js
const fs = require('fs');
const path = require('path');

const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let code = fs.readFileSync(cellViewPath, 'utf8');

// Удаляем ошибочно вставленный кусок внутри isAdjacent
code = code.replace(
  `  const isAdjacent = !!player?.exists && (() => {
    const dx = Math.abs(coord.x - player.x);
    const dy = Math.abs(coord.y - player.y);
  
  // Название объекта для всплывающей плашки над выбранной клеткой
  const selectedObjectName = React.useMemo(() => {
    if (isFog) return 'Туман войны';
    if (isChaos) return 'Квантовый хаос';
    if (!hasObject) return 'Пусто';
    if (cell?.object === 3) return 'Квантовая субстанция';
    if (cell?.object === 1 || cell?.object === 9) return 'Обелиск';
    if (cell?.object === 2) return 'Стена';
    if (cell?.object === 4) return portalMeta ? \`Портал: \${portalMeta.worldName}\` : 'Портал';
    return oInfo.name || 'Объект';
  }, [isFog, isChaos, hasObject, cell?.object, portalMeta, oInfo.name]);

  return (dx <= 1 && dy <= 1) && (dx + dy > 0);
  })();`,
  `  const isAdjacent = !!player?.exists && (() => {
    const dx = Math.abs(coord.x - player.x);
    const dy = Math.abs(coord.y - player.y);
    return (dx <= 1 && dy <= 1) && (dx + dy > 0);
  })();

  // Название объекта для всплывающей плашки над выбранной клеткой
  const selectedObjectName = React.useMemo(() => {
    if (isFog) return 'Туман войны';
    if (isChaos) return 'Квантовый хаос';
    if (!hasObject) return 'Пусто';
    if (cell?.object === 3) return 'Квантовая субстанция';
    if (cell?.object === 1 || cell?.object === 9) return 'Обелиск';
    if (cell?.object === 2) return 'Стена';
    if (cell?.object === 4) return portalMeta ? \`Портал: \${portalMeta.worldName}\` : 'Портал';
    return oInfo.name || 'Объект';
  }, [isFog, isChaos, hasObject, cell?.object, portalMeta, oInfo.name]);`
);

fs.writeFileSync(cellViewPath, code, 'utf8');
console.log('Fixed CellView.tsx');
