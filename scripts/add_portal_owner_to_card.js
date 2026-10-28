// scripts/add_portal_owner_to_card.js
const fs = require('fs');
const path = require('path');

const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let code = fs.readFileSync(cellViewPath, 'utf8');

// 1. Добавляем founder (адрес владельца) в тип portalMeta
code = code.replace(
  `const [portalMeta, setPortalMeta] = React.useState<{ targetContract: string; founderName: string; worldName: string } | null>(null);`,
  `const [portalMeta, setPortalMeta] = React.useState<{ targetContract: string; founder: string; founderName: string; worldName: string } | null>(null);`
);

// 2. Сохраняем data.founder в portalMeta
code = code.replace(
  `          setPortalMeta({\n            targetContract: data.targetContract,\n            founderName: cleanHex(data.founderName) || 'Bob',\n            worldName: cleanHex(data.worldName) || "Bob's World"\n          });`,
  `          setPortalMeta({\n            targetContract: data.targetContract,\n            founder: data.founder,\n            founderName: cleanHex(data.founderName) || 'Bob',\n            worldName: cleanHex(data.worldName) || "Bob's World"\n          });`
);

// 3. Добавляем блок отображения адреса владельца в карточку
const founderBlock = `            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.58rem' }}>Основатель:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.62rem' }}>
                {portalMeta ? portalMeta.founderName : '...'}
              </span>
            </div>`;

const newFounderAndOwnerBlock = `            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.58rem' }}>Основатель:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.62rem' }}>
                {portalMeta ? portalMeta.founderName : '...'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.55rem' }}>Адрес владельца:</span>
              <span style={{
                color: '#facc15',
                fontFamily: 'monospace',
                fontSize: '0.54rem',
                wordBreak: 'break-all',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: '2px 4px',
                borderRadius: '3px',
                marginTop: '1px'
              }}>
                {portalMeta ? portalMeta.founder : 'Определяется...'}
              </span>
            </div>`;

code = code.replace(founderBlock, newFounderAndOwnerBlock);

// Увеличиваем ширину всплывающей карточки с 210px до 230px для комфортного размещения адреса
code = code.replace("width: '210px',", "width: '235px',");

fs.writeFileSync(cellViewPath, code, 'utf8');
console.log('Added portal owner address to portal card!');
