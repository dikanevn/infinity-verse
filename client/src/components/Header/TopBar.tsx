import React from 'react';

interface TopBarProps {
  statusText: string;
  statusState: 'green' | 'yellow' | 'red' | 'blue';
}

export const TopBar: React.FC<TopBarProps> = ({ statusText, statusState }) => {
  return (
    <div style={{ textAlign: 'center', margin: '2px 0 6px 0', width: '100%' }}>
      <div style={{
        fontSize: '1.05rem',
        color: '#c084fc',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 800
      }}>
        INFINITY-VERSE
      </div>
      <div style={{
        minHeight: '22px',
        fontSize: '0.72rem',
        fontWeight: 600,
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
        gap: '6px',
        marginTop: '2px'
      }}>
        {statusText}
      </div>
    </div>
  );
};
