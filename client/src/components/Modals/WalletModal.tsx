import React from 'react';
import type { EIP6963ProviderDetail } from '../../types';

interface WalletModalProps {
  isOpen: boolean;
  walletProviders: EIP6963ProviderDetail[];
  onClose: () => void;
  onConnectProvider: (provider?: EIP6963ProviderDetail) => void;
  onOpenPkModal: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  walletProviders,
  onClose,
  onConnectProvider,
  onOpenPkModal
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#0d111a',
        border: '2px solid #8b5cf6',
        boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
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
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#c084fc', letterSpacing: '0.05em' }}>
            ⚡ ВЫБЕРИТЕ КОШЕЛЕК
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {walletProviders.length > 0 ? (
            walletProviders.map((w) => (
              <button
                key={w.info.uuid}
                onClick={() => onConnectProvider(w)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#161b26',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                {w.info.icon ? (
                  <img src={w.info.icon} alt={w.info.name} style={{ width: '24px', height: '24px' }} />
                ) : (
                  <span>💼</span>
                )}
                <span>{w.info.name}</span>
              </button>
            ))
          ) : (
            <button
              onClick={() => onConnectProvider()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#161b26',
                border: '1px solid #334155',
                padding: '10px 12px',
                color: '#f8fafc',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 700,
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🦊</span>
              <div>
                <div>Браузерный кошелек</div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>MetaMask / Rabby / Phantom</div>
              </div>
            </button>
          )}
        </div>

        {/* Разделитель и кнопка автономного входа */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '4px 0',
          color: '#64748b',
          fontSize: '0.62rem'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
          <span>АВТОНОМНЫЙ РЕЖИМ</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
        </div>

        <button
          onClick={onOpenPkModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#1e1b4b',
            border: '1px solid #6366f1',
            padding: '10px 12px',
            color: '#e0e7ff',
            cursor: 'pointer',
            fontSize: '0.74rem',
            fontWeight: 700,
            textAlign: 'left'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🔐</span>
          <div>
            <div style={{ color: '#a5b4fc' }}>Вход по ключу (Шифрование в RAM)</div>
            <div style={{ fontSize: '0.58rem', color: '#818cf8' }}>Прямой ончейн без релееров, AES-GCM-256</div>
          </div>
        </button>
      </div>
    </div>
  );
};
