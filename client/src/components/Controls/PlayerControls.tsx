import React from 'react';
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
  selectedCoord: { x: number; y: number };
  walletProvidersCount: number;
  onOpenWalletModal: () => void;
  onSpawn: () => void;
  onMove: (x: number, y: number) => void;
  onRevokeSession: () => void;
  onExitRam: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  connectedAddress,
  player,
  isPlayerLoading,
  actionPending,
  isDirectSignerMode,
  isGoogleMode,
  isMetaMaskMode,
  selectedCoord,
  walletProvidersCount,
  onOpenWalletModal,
  onSpawn,
  onMove,
  onRevokeSession,
  onExitRam
}) => {
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
            ? '⚡ РОДИТЬСЯ (RAM DIRECT)'
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
          <span>
            {isMetaMaskMode ? '🦊' : isDirectSignerMode ? '⚡' : '🌐'}{' '}
            <span style={{ color: '#94a3b8', fontSize: '0.62rem' }}>
              {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </span>
            : <b>({player.x}, {player.y})</b>
          </span>

          {/* Режим кошелька */}
          <span style={{
            fontSize: '0.58rem',
            padding: '2px 5px',
            backgroundColor: isMetaMaskMode ? '#78350f' : isDirectSignerMode ? '#0c4a6e' : '#581c87',
            color: '#f8fafc',
            fontWeight: 700
          }}>
            {isMetaMaskMode ? 'METAMASK' : isDirectSignerMode ? 'RAM' : 'GOOGLE'}
          </span>

          {/* Кнопка выхода или сброса */}
          {isDirectSignerMode || isMetaMaskMode || isGoogleMode ? (
            <button
              onClick={onExitRam}
              title="Отключить кошелек"
              style={{
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #475569',
                padding: '2px 6px',
                fontSize: '0.62rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              ВЫЙТИ
            </button>
          ) : (
            <button
              onClick={onRevokeSession}
              disabled={actionPending}
              title="Аннулировать сессионный ключ в блокчейне"
              style={{
                backgroundColor: 'transparent',
                color: '#f87171',
                border: '1px solid #ef4444',
                padding: '2px 6px',
                fontSize: '0.62rem',
                fontWeight: 700,
                cursor: actionPending ? 'wait' : 'pointer',
                marginLeft: '4px'
              }}
            >
              🔒 СБРОС СЕССИИ
            </button>
          )}

          {/* Если выбрана соседняя клетка — предлагаем сделать шаг */}
          {(() => {
            const dx = Math.abs(selectedCoord.x - player.x);
            const dy = Math.abs(selectedCoord.y - player.y);
            const isAdjacent = (dx <= 1 && dy <= 1) && (dx + dy > 0);
            const isObelisk = selectedCoord.x === 0 && selectedCoord.y === 0;

            if (isAdjacent && !isObelisk) {
              return (
                <button
                  onClick={() => onMove(selectedCoord.x, selectedCoord.y)}
                  disabled={actionPending}
                  style={{
                    backgroundColor: isMetaMaskMode ? '#f59e0b' : '#38bdf8',
                    color: '#07080d',
                    border: 'none',
                    borderRadius: '0px',
                    padding: '4px 10px',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    cursor: actionPending ? 'wait' : 'pointer',
                    marginLeft: '6px'
                  }}
                >
                  {actionPending
                    ? 'ХОД...'
                    : `ШАГ НА (${selectedCoord.x}, ${selectedCoord.y}) ${isMetaMaskMode ? '🦊' : '➔'}`}
                </button>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};
