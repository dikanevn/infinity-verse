import React from 'react';

interface IdleOverlayProps {
  isOpen: boolean;
  onResume: () => void;
}

export const IdleOverlay: React.FC<IdleOverlayProps> = ({ isOpen, onResume }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onResume}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          onResume();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '420px',
          width: '90%',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(168, 85, 247, 0.5)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(168, 85, 247, 0.35)',
          color: '#f8fafc',
          fontFamily: 'monospace, system-ui, sans-serif'
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
          ⏸️
        </div>

        <h2 style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: '#d8b4fe',
          textTransform: 'uppercase',
          margin: '0 0 10px 0'
        }}>
          Пауза по неактивности
        </h2>

        <p style={{
          fontSize: '0.85rem',
          color: '#94a3b8',
          lineHeight: '1.5',
          margin: '0 0 20px 0'
        }}>
          Связь с блокчейном приостановлена для экономии ресурсов и защиты от лишних запросов.
        </p>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '10px',
          backgroundColor: 'rgba(147, 51, 234, 0.25)',
          border: '1px solid rgba(192, 132, 252, 0.4)',
          color: '#e9d5ff',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)'
        }}>
          <span>Нажмите в любое место, чтобы продолжить</span>
          <span style={{ fontSize: '0.75rem', color: '#c084fc' }}>⚡</span>
        </div>
      </div>
    </div>
  );
};
