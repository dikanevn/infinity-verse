import React from 'react';

interface TopBarProps {
  statusText: string;
  statusState: 'green' | 'yellow' | 'red' | 'blue';
  connectedAddress?: string;
  onOpenNetworkModal?: () => void;
  onExit?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  statusText,
  statusState,
  connectedAddress,
  onOpenNetworkModal,
  onExit
}) => {
  return (
    <div style={{
      width: '100%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 0 6px 0',
      minHeight: '44px'
    }}>
      {/* CSS-анимация мигания для критической ошибки связи */}
      <style>{`
        @keyframes pulse-red-alert {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.9)); transform: scale(1); }
          50% { opacity: 0.35; filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.2)); transform: scale(0.98); }
        }
      `}</style>

      {/* Кнопка "ВЫБРАТЬ СЕТЬ" в самом верху СЛЕВА */}
      {onOpenNetworkModal && (
        <button
          onClick={onOpenNetworkModal}
          style={{
            position: 'absolute',
            left: '4px',
            top: '2px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            color: '#38bdf8',
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '3px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '0px',
            zIndex: 10
          }}
        >
          <span>🌐</span>
          <span>СЕТЬ</span>
        </button>
      )}

      {/* Кнопка "ВЫЙТИ" в самом верху СПРАВА (если кошелек подключен) */}
      {connectedAddress && onExit && (
        <button
          onClick={onExit}
          title="Отключить кошелек"
          style={{
            position: 'absolute',
            right: '4px',
            top: '2px',
            backgroundColor: 'transparent',
            border: '1px solid #475569',
            color: '#94a3b8',
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '3px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '0px',
            zIndex: 10
          }}
        >
          <span>ВЫЙТИ</span>
          <span>➔</span>
        </button>
      )}

      {/* Название игры строго по центру */}
      <div style={{
        fontSize: '1rem',
        color: '#c084fc',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 800,
        lineHeight: 1.1
      }}>
        INFINITY-VERSE-TEST
      </div>

      {/* Статус связи */}
      <div style={{
        fontSize: '0.68rem',
        fontWeight: statusState === 'red' ? 800 : 600,
        letterSpacing: '0.04em',
        color: statusState === 'red'
          ? '#ef4444'
          : statusState === 'yellow'
            ? '#f59e0b'
            : statusState === 'blue'
              ? '#38bdf8'
              : '#10b981',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        marginTop: '3px',
        animation: statusState === 'red' ? 'pulse-red-alert 1s infinite ease-in-out' : 'none'
      }}>
        {statusText}
      </div>
    </div>
  );
};

