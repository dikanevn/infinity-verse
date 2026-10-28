// scripts/portal_only_on_click.js
const fs = require('fs');
const path = require('path');

const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let code = fs.readFileSync(cellViewPath, 'utf8');

// 1. Убираем наведение мыши для портала (isPortalHovered) и title браузера
code = code.replace("if (isPortal) setIsPortalHovered(true);", "");
code = code.replace("if (isPortal) setIsPortalHovered(false);", "");

// 2. Убираем нативный браузерный title у портала
code = code.replace(
  `: isPortal\n          ? \`Врата #\${portalId}: \${portalMeta?.worldName || 'Загрузка...'} (Основатель: \${portalMeta?.founderName || '...'})\`\n          : undefined`,
  `: undefined`
);

// 3. Открываем карточку портала ТОЛЬКО при нажатии левой кнопкой мыши (когда выбран и открыт тултип по клику)
code = code.replace(
  "{isPortal && (isPortalHovered || showTooltip || isSelected) && (",
  "{isPortal && isSelected && showTooltip && ("
);

// При клике: если это портал и клетка ещё не была выбрана, сразу открываем тултип
code = code.replace(
  `  const handleClick = () => {\n    onSelect(coord);\n    if (isChaos || isPortal) {\n      setShowTooltip(prev => !prev);\n    }\n  };`,
  `  const handleClick = () => {\n    onSelect(coord);\n    if (isChaos) {\n      setShowTooltip(prev => !prev);\n    } else if (isPortal) {\n      setShowTooltip(prev => isSelected ? !prev : true);\n    }\n  };`
);

fs.writeFileSync(cellViewPath, code, 'utf8');
console.log('Portal modal/card now shows ONLY on left click!');
