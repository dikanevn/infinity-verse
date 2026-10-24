import React from 'react';

interface TopBarProps {
  statusText: string;
  statusState: 'green' | 'yellow' | 'red' | 'blue';
}

export const TopBar: React.FC<TopBarProps> = ({ statusText, statusState }) => {
  return (
    <div style={{ textAlign: 'center', margin: '0 0 4px 0', width: '100%' }}>
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
        minHeight: '20px',
        fontSize: '0.68rem',
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
        marginTop: '1px'
      }}>
        {statusText}
      </div>
    </div>
  );
};

