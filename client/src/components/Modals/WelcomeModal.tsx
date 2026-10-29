import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
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
        userSelect: 'none',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '520px',
          width: '92%',
          backgroundColor: '#090a10',
          border: '1.5px solid #8b5cf6',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 0 35px rgba(139, 92, 246, 0.35)',
          color: '#f8fafc',
          fontFamily: 'monospace, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Заголовок */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🌌</span>
          <h2
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#d8b4fe',
              letterSpacing: '0.04em'
            }}
          >
            {t('welcome.title')}
          </h2>
        </div>

        {/* Текст приветствия */}
        <div
          style={{
            fontSize: '0.92rem',
            lineHeight: '1.6',
            color: '#cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <p style={{ margin: 0 }}>
            {t('welcome.p1')}
          </p>
          <p style={{ margin: 0 }}>
            {t('welcome.p2')}
          </p>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#e9d5ff',
              lineHeight: '1.5'
            }}
          >
            <span style={{ fontWeight: 700, color: '#f5d0fe' }}>{t('welcome.controlsTitle')}</span>
            <span>
              {t('welcome.controlsDesc', {
                wasd: t('welcome.wasd'),
                rmb: t('welcome.rmb'),
                doubleTap: t('welcome.doubleTap')
              })}
            </span>
          </div>
        </div>

        {/* Кнопка закрытия */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#1e1b4b',
              color: '#e0e7ff',
              border: '1px solid #818cf8',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
              boxShadow: '0 0 15px rgba(129, 140, 248, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#312e81';
              e.currentTarget.style.borderColor = '#c084fc';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(192, 132, 252, 0.5)';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e1b4b';
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(129, 140, 248, 0.3)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
