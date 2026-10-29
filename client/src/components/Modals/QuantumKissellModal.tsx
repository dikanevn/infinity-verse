import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface QuantumKissellModalProps {
  isOpen: boolean;
  onExit: () => void;
}

export const QuantumKissellModal: React.FC<QuantumKissellModalProps> = ({
  isOpen,
  onExit
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: 'monospace, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          maxWidth: '680px',
          width: '100%',
          gap: '32px'
        }}
      >
        <div
          style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
            fontWeight: 600,
            color: '#f8fafc',
            lineHeight: 1.6,
            letterSpacing: '0.04em',
            textShadow: '0 0 20px rgba(168, 85, 247, 0.45)'
          }}
        >
          {t('kissell.text')}
        </div>

        <button
          type="button"
          onClick={onExit}
          style={{
            backgroundColor: '#1e1b4b',
            color: '#e0e7ff',
            border: '1px solid #818cf8',
            borderRadius: '8px',
            padding: '12px 32px',
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
            boxShadow: '0 0 20px rgba(129, 140, 248, 0.35)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#312e81';
            e.currentTarget.style.borderColor = '#c084fc';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(192, 132, 252, 0.6)';
            e.currentTarget.style.transform = 'scale(1.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e1b4b';
            e.currentTarget.style.borderColor = '#818cf8';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(129, 140, 248, 0.35)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {t('kissell.exit')}
        </button>
      </div>
    </div>
  );
};
