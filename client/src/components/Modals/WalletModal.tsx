import React from 'react';
import type { EIP6963ProviderDetail } from '../../types';

interface WalletModalProps {
  isOpen: boolean;
  walletProviders: EIP6963ProviderDetail[];
  onClose: () => void;
  onConnectProvider: (provider?: EIP6963ProviderDetail) => void;
  onConnectMetaMaskWithSession: (provider?: EIP6963ProviderDetail) => void;
  onOpenPkModal: () => void;
  onGoogleLoginSuccess?: (idToken: string) => void;
  isLoggingInGoogle?: boolean;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  walletProviders,
  onClose,
  onConnectProvider,
  onConnectMetaMaskWithSession,
  onOpenPkModal,
  onGoogleLoginSuccess,
  isLoggingInGoogle
}) => {
  const googleBtnRef = React.useRef<HTMLDivElement>(null);
  const isRenderedRef = React.useRef<boolean>(false);
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) {
      isRenderedRef.current = false;
      setShowAdvanced(false);
      return;
    }

    let intervalId: any = null;

    const setupGoogle = () => {
      const google = (window as any).google;
      if (google?.accounts?.id && googleBtnRef.current && !isRenderedRef.current) {
        try {
          googleBtnRef.current.innerHTML = '';
          google.accounts.id.initialize({
            client_id: '302988323060-edu3imkm9esfe41g4658va7gqmfd7up6.apps.googleusercontent.com',
            callback: (response: any) => {
              if (response?.credential && onGoogleLoginSuccess) {
                onGoogleLoginSuccess(response.credential);
              }
            }
          });

          const containerWidth = googleBtnRef.current.parentElement?.clientWidth || 340;
          const targetWidth = Math.min(340, Math.max(260, containerWidth));

          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: targetWidth,
            text: 'continue_with',
            shape: 'rectangular'
          });
          isRenderedRef.current = true;
          if (intervalId) clearInterval(intervalId);
        } catch (e) {
          console.error('Google button init error:', e);
        }
      }
    };

    setupGoogle();
    if (!isRenderedRef.current) {
      intervalId = setInterval(setupGoogle, 150);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, onGoogleLoginSuccess]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#0d111a',
        border: '2px solid #8b5cf6',
        boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui, sans-serif',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '8px'
        }}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#c084fc', letterSpacing: '0.05em' }}>
            ⚡ ВЫБЕРИТЕ СПОСОБ ВХОДА
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* ОСНОВНОЙ БЛОК: БЫСТРЫЙ ВХОД БЕЗ ОКОН И БЕЗ ГАЗА (GOOGLE + METAMASK СЕССИЯ) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.04em' }}>
            🚀 БЫСТРЫЙ ВХОД (БЕЗ КОМИССИИ И ОКОН):
          </div>

          {/* 1. Кнопка Google */}
          <div
            ref={googleBtnRef}
            style={{
              height: '44px',
              minHeight: '44px',
              maxHeight: '44px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '4px',
              overflow: 'hidden',
              width: '100%'
            }}
          >
            {isLoggingInGoogle && (
              <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>⏳ Вход через Google...</span>
            )}
          </div>

          {/* 2. Кнопка MetaMask с сессией на 20 часов */}
          <button
            onClick={() => onConnectMetaMaskWithSession(walletProviders[0])}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#1c1917',
              border: '1px solid #f97316',
              padding: '10px 12px',
              color: '#fdba74',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              textAlign: 'left',
              boxShadow: '0 0 12px rgba(249, 115, 22, 0.25)',
              borderRadius: '4px'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🦊</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 800 }}>Вход через MetaMask (Сессия на 20 ч)</div>
              <div style={{ fontSize: '0.62rem', color: '#fb923c' }}>1 бесплатная подпись, игра без окон и без газа</div>
            </div>
          </button>
        </div>

        {/* Разделитель / Кнопка раскрытия дополнительных способов */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '2px 0',
          color: '#64748b',
          fontSize: '0.62rem'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'transparent',
              border: 'none',
              color: showAdvanced ? '#a78bfa' : '#64748b',
              fontSize: '0.62rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px'
            }}
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            <span>ДОПОЛНИТЕЛЬНЫЕ СПОСОБЫ ВХОДА</span>
          </button>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
        </div>

        {/* Блок дополнительных способов входа: Вход по ключу + MetaMask Direct (за свой газ) */}
        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {/* Кнопка входа по ключу в RAM */}
            <button
              onClick={onOpenPkModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#1a1836',
                border: '1px solid #6366f1',
                padding: '10px 12px',
                color: '#c7d2fe',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 700,
                textAlign: 'left',
                borderRadius: '4px',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🔐</span>
              <div>
                <div>Вход по ключу (Шифрование в RAM)</div>
                <div style={{ fontSize: '0.62rem', color: '#818cf8' }}>Прямой ончейн без релееров, AES-GCM-256</div>
              </div>
            </button>

            {/* Ручной режим MetaMask Direct за свой газ */}
            {metamaskProvider ? (
              <button
                onClick={() => onConnectProvider(metamaskProvider)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#161b26',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  borderRadius: '4px'
                }}
              >
                {metamaskProvider.info.icon ? (
                  <img src={metamaskProvider.info.icon} alt="MetaMask" style={{ width: '22px', height: '22px' }} />
                ) : (
                  <span style={{ fontSize: '1.2rem' }}>🦊</span>
                )}
                <div>
                  <div>MetaMask Direct (Ручной режим)</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Каждый шаг подтверждается окном за личный газ</div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => onConnectProvider(walletProviders[0])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#161b26',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  borderRadius: '4px'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🦊</span>
                <div>
                  <div>MetaMask Direct (Ручной режим)</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Каждый шаг подтверждается окном за личный газ</div>
                </div>
              </button>
            )}

            {/* Другие кошельки в ручном режиме */}
            {walletProviders.filter(p => p !== metamaskProvider).map(p => (
              <button
                key={'direct-' + p.info.uuid}
                onClick={() => onConnectProvider(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#161b26',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  borderRadius: '4px'
                }}
              >
                {p.info.icon ? (
                  <img src={p.info.icon} alt={p.info.name} style={{ width: '22px', height: '22px', borderRadius: '4px' }} />
                ) : (
                  <span style={{ fontSize: '1.2rem' }}>🔌</span>
                )}
                <div>
                  <div>{p.info.name} (Прямой ончейн)</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Подтверждение транзакций через {p.info.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
