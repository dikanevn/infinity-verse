// scripts/remove_inspector_vrat_button.js
const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '..', 'client', 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Удаляем кнопку "ИНСПЕКТОР ВРАТ"
const oldBlock = `            {curCell && curCell.object === 4 && (() => {
              const portalId = ((curCell.state || 0) << 8) | (curCell.reserved || 0);
              return (
                <button
                  type="button"
                  onClick={() => setIsPortalModalOpen(true)}
                  style={{
                    backgroundColor: '#8b5cf6',
                    color: '#fff',
                    border: '1px solid #c084fc',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🌀</span>
                  <span>ИНСПЕКТОР ВРАТ (ID #{portalId})</span>
                </button>
              );
            })()}`;

if (appCode.includes(oldBlock)) {
  appCode = appCode.replace(oldBlock, '');
} else {
  // Ищем регуляркой
  appCode = appCode.replace(
    /\{curCell && curCell\.object === 4 && \(\(\) => \{[\s\S]*?ИНСПЕКТОР ВРАТ[\s\S]*?\}\)\(\)\}/,
    ''
  );
}

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('Removed INSPEKTOR VRAT button from App.tsx!');
