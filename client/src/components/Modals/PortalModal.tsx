import React, { useState, useEffect } from 'react';
import { publicClient, MAIN_CONTRACT_ADDRESS, MAIN_ABI } from '../../config/contracts';
import { hexToString } from 'viem';

interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalId: number;
  portalX: number;
  portalY: number;
  connectedAddress: string;
  isDirectSigner: boolean;
  onRefresh: () => Promise<void>;
  onCreatePortal?: (targetContract: string, founderName: string, worldName: string, x: number, y: number) => Promise<void>;
  onTransferPortal?: (portalId: number, newOwner: string) => Promise<void>;
  onDestroyPortal?: (portalId: number, x: number, y: number) => Promise<void>;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  isOpen,
  onClose,
  portalId,
  portalX,
  portalY,
  connectedAddress,
  onRefresh,
  onCreatePortal,
  onTransferPortal,
  onDestroyPortal
}) => {
  const [portalInfo, setPortalInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Форма создания портала
  const [targetContract, setTargetContract] = useState<string>('');
  const [founderName, setFounderName] = useState<string>('');
  const [worldName, setWorldName] = useState<string>('');

  // Форма передачи владения
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>('');

  useEffect(() => {
    if (isOpen && portalId > 0) {
      loadPortalData(portalId);
    } else {
      setPortalInfo(null);
    }
  }, [isOpen, portalId]);

  const loadPortalData = async (id: number) => {
    try {
      setLoading(true);
      const data: any = await publicClient.readContract({
        address: MAIN_CONTRACT_ADDRESS,
        abi: MAIN_ABI,
        functionName: 'getPortal',
        args: [BigInt(id)]
      });

      if (data && data.targetContract && data.targetContract !== '0x0000000000000000000000000000000000000000') {
        const cleanHexText = (hex: `0x${string}`) => {
          try {
            return hexToString(hex, { size: 32 }).replace(/\0/g, '').trim();
          } catch {
            return hex;
          }
        };

        setPortalInfo({
          id: Number(data.id),
          targetContract: data.targetContract,
          parentContract: data.parentContract,
          founder: data.founder,
          founderName: cleanHexText(data.founderName),
          worldName: cleanHexText(data.worldName),
          createdAt: Number(data.createdAt)
        });
      } else {
        setPortalInfo(null);
      }
    } catch (e) {
      console.error('Ошибка загрузки данных портала:', e);
      setPortalInfo(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isOwner = portalInfo && connectedAddress && portalInfo.founder.toLowerCase() === connectedAddress.toLowerCase();

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreatePortal) return;
    try {
      setActionLoading(true);
      await onCreatePortal(targetContract, founderName, worldName, portalX, portalY);
      onClose();
      await onRefresh();
    } catch (err: any) {
      alert('Ошибка открытия врат: ' + (err.shortMessage || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onTransferPortal || !portalInfo) return;
    try {
      setActionLoading(true);
      await onTransferPortal(portalInfo.id, newOwnerAddress);
      alert('Владение порталом успешно передано!');
      await loadPortalData(portalInfo.id);
      await onRefresh();
    } catch (err: any) {
      alert('Ошибка передачи прав: ' + (err.shortMessage || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDestroySubmit = async () => {
    if (!onDestroyPortal || !portalInfo) return;
    if (!confirm('ВНИМАНИЕ! Портал будет навсегда уничтожен, а тайл на карте исчезнет. Продолжить?')) return;
    try {
      setActionLoading(true);
      await onDestroyPortal(portalInfo.id, portalX, portalY);
      alert('Портал уничтожен, врата дематериализованы.');
      onClose();
      await onRefresh();
    } catch (err: any) {
      alert('Ошибка сноса портала: ' + (err.shortMessage || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#0d111a',
        border: '2px solid #8b5cf6',
        borderRadius: '8px',
        maxWidth: '520px',
        width: '100%',
        padding: '20px',
        boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)',
        color: '#f8fafc',
        fontFamily: 'monospace'
      }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🌀</span>
            <span style={{ fontWeight: 800, color: '#c084fc', fontSize: '1rem' }}>
              {portalInfo ? `ВРАТА МУЛЬТИВСЕЛЕННОЙ #${portalInfo.id}` : `СОЗДАНИЕ БЕСКОНЕЧНОЙ МУЛЬТИВСЕЛЕННОЙ (${portalX}, ${portalY})`}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
            Считывание хроник квантового портала из Monad...
          </div>
        ) : portalInfo ? (
          /* Информация о существующем портале */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#131826', padding: '12px', borderRadius: '4px', border: '1px solid #1e293b' }}>
              <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginBottom: '4px' }}>НАЗВАНИЕ ВСЕЛЕННОЙ:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{portalInfo.worldName || 'Без имени'}</div>

              <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginTop: '8px', marginBottom: '4px' }}>ОСНОВАТЕЛЬ МИРА:</div>
              <div style={{ fontSize: '0.9rem', color: '#facc15' }}>
                {portalInfo.founderName} ({portalInfo.founder.slice(0, 8)}...{portalInfo.founder.slice(-6)})
              </div>

              <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginTop: '8px', marginBottom: '4px' }}>ЦЕЛЕВОЙ СМАРТ-КОНТРАКТ:</div>
              <div style={{ fontSize: '0.75rem', color: '#4ade80', wordBreak: 'break-all' }}>
                {portalInfo.targetContract}
              </div>

              <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '8px' }}>
                ОТКРЫТ: {new Date(portalInfo.createdAt * 1000).toLocaleString('ru-RU')}
              </div>
            </div>

            {/* Блок управления для владельца */}
            {isOwner && (
              <div style={{ marginTop: '8px', borderTop: '1px dashed #334155', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.8rem' }}>👑 УПРАВЛЕНИЕ ВЛАДЕЛЬЦА ПОРТАЛА</div>

                {/* Форма передачи прав */}
                <form onSubmit={handleTransferSubmit} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Новый владелец (0x...)"
                    value={newOwnerAddress}
                    onChange={(e) => setNewOwnerAddress(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      backgroundColor: '#0a0d14',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      padding: '6px 8px',
                      fontSize: '0.75rem',
                      borderRadius: '4px'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Передать
                  </button>
                </form>

                {/* Кнопка сноса */}
                <button
                  type="button"
                  onClick={handleDestroySubmit}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  💥 Уничтожить Врата и снести с карты
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Форма создания нового портала */
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Откройте гиперпространственный переход в новый смарт-контракт Вселенной на координатах ({portalX}, {portalY}).
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#a78bfa', marginBottom: '2px' }}>
                Адрес смарт-контракта вложенного мира (targetContract):
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={targetContract}
                onChange={(e) => setTargetContract(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#0a0d14',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  padding: '6px 8px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#a78bfa', marginBottom: '2px' }}>
                Имя первооткрывателя / Основателя:
              </label>
              <input
                type="text"
                placeholder="Например: Explorer_01"
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                required
                maxLength={32}
                style={{
                  width: '100%',
                  backgroundColor: '#0a0d14',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  padding: '6px 8px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#a78bfa', marginBottom: '2px' }}>
                Название создаваемого мира:
              </label>
              <input
                type="text"
                placeholder="Например: Monad Prime Horizon"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
                required
                maxLength={32}
                style={{
                  width: '100%',
                  backgroundColor: '#0a0d14',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  padding: '6px 8px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              style={{
                backgroundColor: '#8b5cf6',
                color: '#fff',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              {actionLoading ? 'Создание мультивселенной в Monad...' : '🌀 Поставить портал в свою мультивселенную'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
