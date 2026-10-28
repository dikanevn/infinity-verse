import React, { useState } from 'react';
import { RELAYER_URL } from '../../config/contracts';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedAddress?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  connectedAddress
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    setIsSending(true);

    try {
      // 1. Отправляем отзыв через Cloudflare Relayer прямо в Telegram
      await fetch(RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feedback',
          message: text.trim(),
          author: connectedAddress || ''
        })
      });

      // 2. Локальная копия
      const saved = JSON.parse(localStorage.getItem('infinity_feedbacks') || '[]');
      saved.push({
        text: text.trim(),
        author: connectedAddress || 'anonymous',
        date: new Date().toISOString()
      });
      localStorage.setItem('infinity_feedbacks', JSON.stringify(saved));
    } catch (e) {
      console.error('Feedback send error:', e);
    } finally {
      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setText('');
        onClose();
      }, 2000);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        paddingTop: 'max(24px, 8dvh)',
        overflowY: 'auto'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #a855f7',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '420px',
          padding: '20px',
          boxShadow: '0 10px 30px rgba(168, 85, 247, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          color: '#f8fafc',
          fontFamily: 'monospace, system-ui, sans-serif',
          maxHeight: 'calc(100dvh - 48px)',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>😈</span>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f5d0fe' }}>
              ОБРАТНАЯ СВЯЗЬ
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
          привет друг! если хочешь, напиши, что тебе не нравится, или нравится, или любые мысли!
        </p>

        {isSent ? (
          <div style={{
            padding: '14px',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            color: '#4ade80',
            textAlign: 'center',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            ✓ Спасибо за мысль! Записано.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Критика особенно приветствуется. Если человека что-то бесит, значит он наверняка уже знает как это исправить и сделать лучше."
              rows={4}
              style={{
                width: '100%',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '10px',
                color: '#f8fafc',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '7px 14px',
                  backgroundColor: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!text.trim() || isSending}
                style={{
                  padding: '7px 18px',
                  backgroundColor: text.trim() && !isSending ? '#8b5cf6' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: text.trim() && !isSending ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                {isSending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <a
                href="https://linktr.ee/dikanevn"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#a855f7',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#c084fc')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a855f7')}
              >
                <span>Контакты</span>
                <span style={{ fontSize: '0.65rem' }}>↗</span>
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
