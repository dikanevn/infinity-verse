import React, { useState, useEffect } from 'react';
import { MONAD_RPC_LIST, type RpcEndpoint } from '../../config/rpcList';
import { getActiveRpcUrl } from '../../config/contracts';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRpc: (rpcUrl: string) => void;
}

export const NetworkModal: React.FC<NetworkModalProps> = ({ isOpen, onClose, onSelectRpc }) => {
  const [activeUrl, setActiveUrl] = useState<string>(getActiveRpcUrl());
  const [pings, setPings] = useState<Record<string, { latency: number | null; block: number | null; error: boolean }>>({});
  const [testing, setTesting] = useState<boolean>(false);

  const measurePing = async (endpoint: RpcEndpoint) => {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: []
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await res.json();
      const end = performance.now();
      const latency = Math.round(end - start);
      const blockNum = data.result ? parseInt(data.result, 16) : null;
      return { latency, block: blockNum, error: false };
    } catch {
      return { latency: null, block: null, error: true };
    }
  };

  const checkAllPings = async () => {
    setTesting(true);
    const results: Record<string, { latency: number | null; block: number | null; error: boolean }> = {};
    await Promise.all(
      MONAD_RPC_LIST.map(async (ep) => {
        const res = await measurePing(ep);
        results[ep.url] = res;
      })
    );
    setPings(results);
    setTesting(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveUrl(getActiveRpcUrl());
      checkAllPings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    localStorage.setItem('infinity_active_rpc', url);
    setActiveUrl(url);
    onSelectRpc(url);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90dvh',
          backgroundColor: '#0a0d16',
          border: '1px solid #38bdf8',
          boxShadow: '0 0 35px rgba(56, 189, 248, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Шапка */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f172a'
        }}>
          <div>
            <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.06em' }}>
              🌐 ВЫБОР СЕТИ И RPC УЗЛА
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.62rem' }}>
              Monad Testnet (Chain ID: 10143)
            </div>
          </div>
          <button
            onClick={checkAllPings}
            disabled={testing}
            title="Перепроверить пинг"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#38bdf8',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '4px 8px',
              cursor: testing ? 'wait' : 'pointer'
            }}
          >
            {testing ? '⏳ ТЕСТ...' : '🔄 ПИНГ'}
          </button>
        </div>

        {/* Список RPC */}
        <div style={{
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto'
        }}>
          {MONAD_RPC_LIST.map((ep) => {
            const isCurrent = activeUrl === ep.url;
            const pingInfo = pings[ep.url];

            return (
              <div
                key={ep.id}
                onClick={() => handleSelect(ep.url)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: isCurrent ? 'rgba(56, 189, 248, 0.12)' : '#0d121f',
                  border: isCurrent ? '1px solid #38bdf8' : '1px solid #1e293b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: isCurrent ? '#38bdf8' : '#f8fafc', fontWeight: 700, fontSize: '0.74rem' }}>
                      {ep.name}
                    </span>
                    {ep.recommended && (
                      <span style={{
                        fontSize: '0.55rem',
                        backgroundColor: '#065f46',
                        color: '#6ee7b7',
                        padding: '1px 5px',
                        fontWeight: 800
                      }}>
                        РЕКОМЕНДОВАНО
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{
                        fontSize: '0.55rem',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        padding: '1px 5px',
                        fontWeight: 800
                      }}>
                        АКТИВЕН
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.60rem', fontFamily: 'monospace' }}>
                    {ep.url}
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  {pingInfo ? (
                    pingInfo.error ? (
                      <span style={{ color: '#ef4444', fontSize: '0.62rem', fontWeight: 700 }}>
                        ❌ ОФФЛАЙН
                      </span>
                    ) : (
                      <>
                        <span style={{
                          color: pingInfo.latency! <= 250 ? '#10b981' : pingInfo.latency! <= 600 ? '#f59e0b' : '#ef4444',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          fontFamily: 'monospace'
                        }}>
                          ⚡ {pingInfo.latency} ms
                        </span>
                        {pingInfo.block && (
                          <span style={{ color: '#64748b', fontSize: '0.55rem', fontFamily: 'monospace' }}>
                            #{pingInfo.block}
                          </span>
                        )}
                      </>
                    )
                  ) : (
                    <span style={{ color: '#475569', fontSize: '0.62rem' }}>
                      опрос...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Футер */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#0f172a'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#334155',
              color: '#ffffff',
              border: 'none',
              padding: '6px 16px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
  );
};
