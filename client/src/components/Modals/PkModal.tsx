import React from 'react';

interface PkModalProps {
  isOpen: boolean;
  pkInput: string;
  onChangePkInput: (val: string) => void;
  onClose: () => void;
  onConnect: (overridePk?: string, forceMode?: 'aes' | 'xor') => void;
}

export const PkModal: React.FC<PkModalProps> = ({
  isOpen,
  pkInput,
  onChangePkInput,
  onClose,
  onConnect
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#0d111a',
        border: '2px solid #6366f1',
        boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '18px',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '8px'
        }}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#a5b4fc', letterSpacing: '0.05em' }}>
            🔐 ПРИВАТНЫЙ КЛЮЧ (ШИФРОВАНИЕ В RAM)
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.4 }}>
          Ключ никогда не сохраняется на диске (localStorage выключен). При загрузке генерируется случайный 256-битный мастер-ключ, и приватник держится в памяти в виде зашифрованного шума AES-GCM или XOR-маски.
        </div>

        <input
          type="password"
          placeholder="0x... (приватный ключ EVM)"
          value={pkInput}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={(e) => onChangePkInput(e.target.value)}
          style={{
            backgroundColor: '#131826',
            border: '1px solid #334155',
            padding: '8px 10px',
            color: '#f8fafc',
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            outline: 'none'
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#9ca3af',
                padding: '6px 12px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              Отмена
            </button>
            <button
              onClick={() => onConnect(undefined, 'aes')}
              style={{
                backgroundColor: '#6366f1',
                border: 'none',
                color: '#ffffff',
                padding: '6px 16px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
              }}
            >
              ВОЙТИ ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
