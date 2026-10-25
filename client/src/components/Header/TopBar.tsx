import React from 'react';

interface TopBarProps {
  statusText: string;
  statusState: 'green' | 'yellow' | 'red' | 'blue';
  onOpenNetworkModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ statusText, statusState, onOpenNetworkModal }) => {
  return (
    <div style={{ textAlign: 'center', margin: '0 0 4px 0', width: '100%' }}>
      {/* CSS-анимация мигания для критической ошибки связи */}
      <style>{`
        @keyframes pulse-red-alert {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.9)); transform: scale(1); }
          50% { opacity: 0.35; filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.2)); transform: scale(0.98); }
        }
      `}</style>

      <div style={{
        fontSize: '1rem',
        color: '#c084fc',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 800,
        lineHeight: 1.1
      }}>
        INFINITY-VERSE
      </div>
      <div style={{
        minHeight: '22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '2px',
        flexWrap: 'wrap'
      }}>
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
          gap: '4px',
          animation: statusState === 'red' ? 'pulse-red-alert 1s infinite ease-in-out' : 'none'
        }}>
          {statusText}
        </div>

        {onOpenNetworkModal && (
          <button
            onClick={onOpenNetworkModal}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              color: '#38bdf8',
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '2px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '0px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🌐</span>
            <span>ВЫБРАТЬ СЕТЬ</span>
          </button>
        )}
      </div>
    </div>
  );
};

