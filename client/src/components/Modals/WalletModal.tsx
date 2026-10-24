import React from 'react';
import type { EIP6963ProviderDetail } from '../../types';

interface WalletModalProps {
  isOpen: boolean;
  walletProviders: EIP6963ProviderDetail[];
  onClose: () => void;
  onConnectProvider: (provider?: EIP6963ProviderDetail) => void;
  onOpenPkModal: () => void;
  onGoogleLoginSuccess?: (idToken: string) => void;
  isLoggingInGoogle?: boolean;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  walletProviders,
  onClose,
  onConnectProvider,
  onOpenPkModal,
  onGoogleLoginSuccess,
  isLoggingInGoogle
}) => {
  const googleBtnRef = React.useRef<HTMLDivElement>(null);
  const isRenderedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) {
      isRenderedRef.current = false;
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

          // Вычисляем точную ширину модального контейнера для стабильной отрисовки
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

        {/* Быстрый вход через Google с жестко зафиксированным размером слота */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
            🚀 БЫСТРЫЙ ВХОД (БЕЗ УСТАНОВКИ КОШЕЛЬКА):
          </div>
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
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '2px 0',
          color: '#64748b',
          fontSize: '0.62rem'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
          <span>ИЛИ ВНЕШНИЙ КОШЕЛЕК</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {walletProviders.length > 0 ? (
            walletProviders.map((w) => (
              <button
                key={w.info.uuid}
                onClick={() => onConnectProvider(w)}
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
                  transition: 'all 0.15s ease'
                }}
              >
                {w.info.icon ? (
                  <img src={w.info.icon} alt={w.info.name} style={{ width: '24px', height: '24px' }} />
                ) : (
                  <span>💼</span>
                )}
                <span>{w.info.name}</span>
              </button>
            ))
          ) : (
            <button
              onClick={() => onConnectProvider()}
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
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🦊</span>
              <div>
                <div>Браузерный кошелек</div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>MetaMask / Rabby / Phantom</div>
              </div>
            </button>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '2px 0',
          color: '#64748b',
          fontSize: '0.62rem'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
          <span>АВТОНОМНЫЙ РЕЖИМ</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }}></div>
        </div>

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
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🔐</span>
          <div>
            <div>Вход по ключу (Шифрование в RAM)</div>
            <div style={{ fontSize: '0.62rem', color: '#818cf8' }}>Прямой ончейн без релееров, AES-GCM-256</div>
          </div>
        </button>
      </div>
    </div>
  );
};
