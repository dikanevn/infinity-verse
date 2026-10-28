// scripts/remove_unused_is_portal_hovered.js
const fs = require('fs');
const path = require('path');

const cellViewPath = path.resolve(__dirname, '..', 'client', 'src', 'components', 'Grid', 'CellView.tsx');
let code = fs.readFileSync(cellViewPath, 'utf8');

code = code.replace("  const [isPortalHovered, setIsPortalHovered] = React.useState<boolean>(false);\n", "");

fs.writeFileSync(cellViewPath, code, 'utf8');
console.log('Removed unused isPortalHovered state');
