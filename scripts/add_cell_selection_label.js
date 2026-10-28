// scripts/add_cell_selection_label.js
const fs = require('fs');
const path = require('path');

const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let code = fs.readFileSync(cellViewPath, 'utf8');

// Найдем место перед возвратом кнопки, чтобы вычислить имя объекта
// Для объекта 3: "Квантовая субстанция", для 1 и 9: "Обелиск", для 2: "Стена", для 4: "Портал", для 0: "Пусто"
const helperCode = `
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
`;

if (!code.includes('selectedObjectName')) {
  code = code.replace(
    '  return (',
    `${helperCode}
  return (`
  );
}

// Теперь добавим бейдж над клеткой при isSelected, если это не portal/chaos с уже открытыми тултипами
const badgeCode = `      {/* Название объекта прямо над клеткой при ее выделении */}
      {isSelected && !isChaos && !isPortal && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: hasObject ? '#f3e8ff' : '#94a3b8',
            border: hasObject ? '1px solid #a855f7' : '1px solid #38bdf8',
            boxShadow: hasObject
              ? '0 4px 14px rgba(0, 0, 0, 0.8), 0 0 10px rgba(168, 85, 247, 0.45)'
              : '0 4px 14px rgba(0, 0, 0, 0.8), 0 0 8px rgba(56, 189, 248, 0.4)',
            borderRadius: '4px',
            padding: '3px 7px',
            fontSize: '0.62rem',
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            zIndex: 90,
            pointerEvents: 'none',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {cell?.object === 3 && <span>🟣</span>}
          {(cell?.object === 1 || cell?.object === 9) && <span>🗿</span>}
          {cell?.object === 2 && <span>🧱</span>}
          <span>{selectedObjectName}</span>
          {/* Треугольная стрелочка вниз */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: hasObject ? '4px solid #a855f7' : '4px solid #38bdf8'
            }}
          />
        </div>
      )}
`;

if (!code.includes('Название объекта прямо над клеткой при ее выделении')) {
  code = code.replace(
    '{/* Всплывающая подсказка про наблюдателя для Квантового Хаоса */}',
    `${badgeCode}\n      {/* Всплывающая подсказка про наблюдателя для Квантового Хаоса */}`
  );
}

fs.writeFileSync(cellViewPath, code, 'utf8');
console.log('CellView.tsx updated with selection badge!');
