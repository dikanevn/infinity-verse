import React, { useState } from 'react';
import type { PlayerData, AuthMode } from '../../types';

interface PlayerControlsProps {
  connectedAddress: string;
  player: PlayerData | null;
  isPlayerLoading: boolean;
  actionPending: boolean;
  authMode?: AuthMode;
  isDirectSignerMode: boolean;
  isGoogleMode?: boolean;
  isMetaMaskMode?: boolean;
  selectedCoord?: { x: number; y: number };
  walletProvidersCount: number;
  onOpenWalletModal: () => void;
  onSpawn: () => void;
  onMove?: (x: number, y: number) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  connectedAddress,
  player,
  isPlayerLoading,
  actionPending,
  isDirectSignerMode,
  isMetaMaskMode,
  walletProvidersCount,
  onOpenWalletModal,
  onSpawn
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connectedAddress) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(connectedAddress)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopy(connectedAddress);
        });
      return;
    }
    fallbackCopy(connectedAddress);
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Ошибка копирования адреса:', err);
    }
  };
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      margin: '4px 0'
    }}>
      {!connectedAddress ? (
        <button
          onClick={onOpenWalletModal}
          style={{
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0px',
            padding: '8px 20px',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⚡ ПОДКЛЮЧИТЬ КОШЕЛЕК</span>
          <span style={{ fontSize: '0.62rem', backgroundColor: '#6d28d9', padding: '2px 6px' }}>
            {walletProvidersCount > 0 ? `${walletProvidersCount} найдено` : 'МЕНЮ'}
          </span>
        </button>
      ) : isPlayerLoading ? (
        <div style={{
          fontSize: '0.75rem',
          color: '#38bdf8',
          fontWeight: 700,
          letterSpacing: '0.05em',
          padding: '8px 16px',
          border: '1px dashed #38bdf8'
        }}>
          ⏳ ПОИСК ПЕРСОНАЖА В БЛОКЧЕЙНЕ...
        </div>
      ) : !player?.exists ? (
        <button
          onClick={onSpawn}
          disabled={actionPending}
          style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0px',
            padding: '8px 18px',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: actionPending ? 'wait' : 'pointer',
            letterSpacing: '0.05em',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
          }}
        >
          {actionPending
            ? 'РОЖДЕНИЕ В МИРЕ...'
            : isMetaMaskMode
            ? '🦊 РОДИТЬСЯ (METAMASK DIRECT)'
            : isDirectSignerMode
            ? '⚡ РОДИТЬСЯ (DIRECT)'
            : '✨ РОДИТЬСЯ (GOOGLE GASLESS)'}
        </button>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.72rem',
          backgroundColor: '#131826',
          border: `1px solid ${isMetaMaskMode ? '#f59e0b' : isDirectSignerMode ? '#38bdf8' : '#a855f7'}`,
          padding: '6px 12px'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            
            <span style={{ color: '#94a3b8', fontSize: '0.62rem', fontFamily: 'monospace' }}>
              {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </span>
            <button
              onClick={handleCopyAddress}
              title={copied ? "Скопировано в буфер!" : "Скопировать полный адрес"}
              style={{
                background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(51, 65, 85, 0.5)',
                border: `1px solid ${copied ? '#22c55e' : '#475569'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                padding: '1px 5px',
                fontSize: '0.62rem',
                lineHeight: 1.2,
                color: copied ? '#4ade80' : '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.15s'
              }}
            >
              {copied ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>скопировано</span>
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>копия</span>
                </>
              )}
            </button>
            : <b>({player.x}, {player.y})</b>
          </span>

          {/* Режим кошелька */}
          {isMetaMaskMode && (
            <span style={{
              fontSize: '0.58rem',
              padding: '2px 5px',
              backgroundColor: '#78350f',
              color: '#f8fafc',
              fontWeight: 700
            }}>
              METAMASK
            </span>
          )}
        </div>
      )}
    </div>
  );
};
