const fs = require('fs');
let s = fs.readFileSync('client/src/App.tsx', 'utf8');

// 1. Импорт PortalModal
s = s.replace(
  "import { NetworkModal } from './components/Modals/NetworkModal';",
  "import { NetworkModal } from './components/Modals/NetworkModal';\nimport { PortalModal } from './components/Modals/PortalModal';"
);

// 2. Деструктуризация методов из usePlayerState
s = s.replace(
  "    handleSpawn,\n    handleMove,\n    handleDiscoverBatch,\n    handleExitRam\n  } = usePlayerState",
  "    handleSpawn,\n    handleMove,\n    handleDiscoverBatch,\n    handleCreatePortal,\n    handleTransferPortal,\n    handleDestroyPortal,\n    handleExitRam\n  } = usePlayerState"
);

// 3. Состояние модального окна портала
const statePortalModal = `  // Модальное окно управления / создания Портала
  const [isPortalModalOpen, setIsPortalModalOpen] = useState<boolean>(false);
`;
s = s.replace("  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState<boolean>(false);", "  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState<boolean>(false);\n" + statePortalModal);

// 4. Добавляем кнопку вызова Врат в CellInspector или под ним
const inspectorBlock = `<CellInspector curCell={curCell} />`;
const portalButtonBlock = `<CellInspector curCell={curCell} />
        {/* Кнопка Врат Мультивселенной */}
        {connectedAddress && curCell && (
          <div style={{ margin: '4px auto 8px auto', display: 'flex', gap: '8px' }}>
            {curCell.object === 4 ? (
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
                <span>ИНСПЕКТОР ВРАТ (ID #{curCell.state})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPortalModalOpen(true)}
                style={{
                  backgroundColor: '#1e1b4b',
                  color: '#c084fc',
                  border: '1px solid #6366f1',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🌀</span>
                <span>Открыть Врата на ({curCell.x}, {curCell.y})</span>
              </button>
            )}
          </div>
        )}`;

s = s.replace(inspectorBlock, portalButtonBlock);

// 5. Рендер PortalModal в конце
const portalModalRender = `      {/* Модальное окно Врат Мультивселенной */}
      <PortalModal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
        portalId={curCell && curCell.object === 4 ? curCell.state : 0}
        portalX={curCell ? curCell.x : 0}
        portalY={curCell ? curCell.y : 0}
        connectedAddress={connectedAddress}
        isDirectSigner={isDirectSignerMode}
        onRefresh={fetchState}
        onCreatePortal={handleCreatePortal}
        onTransferPortal={handleTransferPortal}
        onDestroyPortal={handleDestroyPortal}
      />
    </div>
  );
}

export default App;`;

s = s.replace(`    </div>
  );
}

export default App;`, portalModalRender);

fs.writeFileSync('client/src/App.tsx', s, 'utf8');
console.log('App.tsx updated with PortalModal integration.');
