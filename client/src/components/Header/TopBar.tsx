import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { language, toggleLanguage, t } = useLanguage();

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

      {/* Верхний левый блок: СЕТЬ и переключатель RU/EN */}
      <div style={{
        position: 'absolute',
        left: '4px',
        top: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 10
      }}>
        {onOpenNetworkModal && (
          <button
            onClick={onOpenNetworkModal}
            style={{
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
              borderRadius: '0px'
            }}
          >
            <span>🌐</span>
            <span>{t('topbar.networkBtn')}</span>
          </button>
        )}

        {/* Переключатель языка RU / EN */}
        <button
          onClick={toggleLanguage}
          title={t('topbar.switchLanguage')}
          style={{
            backgroundColor: '#1e1b4b',
            border: '1px solid #6366f1',
            color: '#c7d2fe',
            fontSize: '0.62rem',
            fontWeight: 800,
            padding: '3px 7px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            borderRadius: '0px',
            letterSpacing: '0.04em',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#312e81';
            e.currentTarget.style.borderColor = '#a855f7';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e1b4b';
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.color = '#c7d2fe';
          }}
        >
          <span>🌐</span>
          <span>{language === 'ru' ? 'RU' : 'EN'}</span>
        </button>
      </div>

      {/* Кнопка "ВЫЙТИ" в самом верху СПРАВА (если кошелек подключен) */}
      {connectedAddress && onExit && (
        <button
          onClick={onExit}
          title={t('topbar.exitTooltip')}
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
          <span>{t('topbar.exitBtn')}</span>
          <span>➔</span>
        </button>
      )}

      {/* Название игры строго по центру */}
      <div style={{
        fontSize: 'clamp(0.78rem, 2.8vw, 0.9rem)',
        color: '#c084fc',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 800,
        lineHeight: 1.1,
        whiteSpace: 'nowrap'
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

