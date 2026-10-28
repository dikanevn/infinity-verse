import React from 'react';
import type { CellData, PlayerData } from '../../types';
import { TERRAIN_CONFIG, OBJECT_CONFIG } from '../../config/constants';
import { getSandTextureForCoord, pixelMatrixToSvgUri } from '../../config/sandTextures';
import {
  STAR_PIXELS_8X8,
  OBELISK_PIXELS_8X8,
  PORTAL_PIXELS_8X8,
  PLAYER_PIXELS_8X8
} from '../../config/pixelTextures';
import { publicClient, MAIN_CONTRACT_ADDRESS, MAIN_ABI } from '../../config/contracts';
import { hexToString } from 'viem';

const STAR_PIXEL_SPRITE_URI = pixelMatrixToSvgUri(STAR_PIXELS_8X8);
const OBELISK_PIXEL_SPRITE_URI = pixelMatrixToSvgUri(OBELISK_PIXELS_8X8);
const PORTAL_PIXEL_SPRITE_URI = pixelMatrixToSvgUri(PORTAL_PIXELS_8X8);
const PLAYER_PIXEL_SPRITE_URI = pixelMatrixToSvgUri(PLAYER_PIXELS_8X8);

interface CellViewProps {
  coord: { x: number; y: number };
  cell?: CellData;
  isSelected: boolean;
  player: PlayerData | null;
  onSelect: (coord: { x: number; y: number }) => void;
  onQuickMove?: (coord: { x: number; y: number }) => void;
}

export const CellView: React.FC<CellViewProps> = ({
  coord,
  cell,
  isSelected,
  player,
  onSelect,
  onQuickMove
}) => {
  const [showTooltip, setShowTooltip] = React.useState<boolean>(false);

  // Туман войны — только если клетка вообще не прочитана из блокчейна (!cell)
  const isFog = !cell;

  const tInfo = cell ? (TERRAIN_CONFIG[cell.terrain] || { name: `T:${cell.terrain}`, icon: '', bg: '#14291e' }) : TERRAIN_CONFIG[0];
  const hasObject = !isFog && !!cell?.object && cell.object !== 0;
  const isQuantumSubstance = hasObject && cell.object === 3;
  const oInfo = hasObject ? (OBJECT_CONFIG[cell.object] || { name: `O:${cell.object}`, icon: '' }) : { name: '—', icon: '' };

  // Если это песок (terrain === 1), берем уникальную процедурную текстуру по координатам (x, y)
  const isSand = !isFog && cell.terrain === 1;
  const sandBgPattern = isSand ? getSandTextureForCoord(coord.x, coord.y) : undefined;

  // Если прочитано из блокчейна и terrain === 0 — это Квантовый Хаос
  const isChaos = !isFog && cell.terrain === 0;

  // Проверка: портал Мультивселенной
  const isPortal = !isFog && cell?.object === 4;
  const portalId = isPortal ? (((cell.state || 0) << 8) | (cell.reserved || 0)) : 0;
  const [portalMeta, setPortalMeta] = React.useState<{ targetContract: string; founder: string; founderName: string; worldName: string } | null>(null);

  React.useEffect(() => {
    if (isPortal && portalId > 0 && !portalMeta) {
      publicClient.readContract({
        address: MAIN_CONTRACT_ADDRESS,
        abi: MAIN_ABI,
        functionName: 'getPortal',
        args: [BigInt(portalId)]
      }).then((data: any) => {
        if (data && data.targetContract && data.targetContract !== '0x0000000000000000000000000000000000000000') {
          const cleanHex = (hex: `0x${string}`) => {
            try {
              return hexToString(hex, { size: 32 }).replace(/\0/g, '').trim();
            } catch {
              return hex;
            }
          };
          setPortalMeta({
            targetContract: data.targetContract,
            founder: data.founder,
            founderName: cleanHex(data.founderName) || 'Bob',
            worldName: cleanHex(data.worldName) || "Bob's World"
          });
        }
      }).catch(err => console.error('Ошибка предзагрузки портала:', err));
    }
  }, [isPortal, portalId, portalMeta]);

  // Проверка: находится ли игрок на этой клетке
  const isPlayerHere = !!player?.exists && player.x === coord.x && player.y === coord.y;
  const isAdjacent = !!player?.exists && (() => {
    const dx = Math.abs(coord.x - player.x);
    const dy = Math.abs(coord.y - player.y);
    return (dx <= 1 && dy <= 1) && (dx + dy > 0);
  })();

  // Название объекта для всплывающей плашки над выбранной клеткой
  const selectedObjectName = React.useMemo(() => {
    if (isFog) return 'Туман войны';
    if (isChaos) return 'Квантовый хаос';
    if (!hasObject) return 'Пусто';
    if (cell?.object === 3) {
      const sec = cell.secondsWeight || 1;
      const tokens = (sec * 50) / 600;
      const displayTokens = tokens.toFixed(2);
      return `Квантовая субстанция (${displayTokens} INFER-TEST)`;
    }
    if (cell?.object === 1 || cell?.object === 9) return 'Обелиск';
    if (cell?.object === 2) return 'Стена';
    if (cell?.object === 4) return portalMeta ? `Портал: ${portalMeta.worldName}` : 'Портал';
    return oInfo.name || 'Объект';
  }, [isFog, isChaos, hasObject, cell?.object, portalMeta, oInfo.name]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdjacent && onQuickMove) {
      onQuickMove(coord);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdjacent && onQuickMove) {
      onQuickMove(coord);
    } else {
      onSelect(coord);
    }
  };

  const handleClick = () => {
    onSelect(coord);
    if (isChaos) {
      setShowTooltip(prev => !prev);
    } else if (isPortal) {
      setShowTooltip(prev => isSelected ? !prev : true);
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => {
        if (isChaos) setShowTooltip(true);
        
      }}
      onMouseLeave={() => {
        if (isChaos) setShowTooltip(false);
        
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      title={
        isChaos
          ? 'Квантовый хаос. Для декогеренции необходим наблюдатель поблизости.'
          : undefined
      }
      style={{
        boxSizing: 'border-box',
        width: '62px',
        height: '62px',
        background: isFog 
          ? 'radial-gradient(circle at 50% 50%, #475569 0%, #334155 45%, #1e293b 80%, #0f172a 100%)' 
          : (sandBgPattern ? `url("${sandBgPattern}") no-repeat center/cover` : (isChaos ? '#06080f' : tInfo.bg)),
        imageRendering: isSand ? 'pixelated' : 'auto',
        border: isSelected ? '2px solid #38bdf8' : isFog ? '1px dashed rgba(148, 163, 184, 0.25)' : 'none',
        opacity: isFog ? 0.88 : 1,
        borderRadius: '0px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        color: '#ffffff',
        fontFamily: 'inherit',
        position: 'relative',
        padding: '3px 4px',
        transition: 'all 0.15s ease',
        boxShadow: isSelected 
          ? '0 0 14px rgba(56, 189, 248, 0.7)' 
          : isFog 
          ? 'inset 0 0 16px rgba(15, 23, 42, 0.9), 0 0 8px rgba(100, 116, 139, 0.2)' 
          : 'none',
        overflow: 'visible'
      }}
    >
            {/* Название объекта прямо над клеткой при ее выделении */}
      {isSelected && !isChaos && !isPortal && hasObject && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: hasObject ? '#f3e8ff' : '#94a3b8',
            border: hasObject ? '1px solid #a855f7' : '1px solid #38bdf8',
            boxShadow: hasObject
              ? '0 4px 14px rgba(0, 0, 0, 0.8), 0 0 10px rgba(168, 85, 247, 0.45)'
              : '0 4px 14px rgba(0, 0, 0, 0.8), 0 0 8px rgba(56, 189, 248, 0.4)',
            borderRadius: '4px',
            padding: '3px 7px',
            fontSize: '0.62rem',
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            zIndex: 90,
            pointerEvents: 'none',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {cell?.object === 3 && <span>🟣</span>}
          {(cell?.object === 1 || cell?.object === 9) && <span>🗿</span>}
          {cell?.object === 2 && <span>🧱</span>}
          {cell?.object === 4 && <img src={PORTAL_PIXEL_SPRITE_URI} alt="Портал" style={{ width: '14px', height: '14px', imageRendering: 'pixelated' }} />}
          <span>{selectedObjectName}</span>
          {/* Треугольная стрелочка вниз */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: hasObject ? '4px solid #a855f7' : '4px solid #38bdf8'
            }}
          />
        </div>
      )}

      {/* Всплывающая подсказка про наблюдателя для Квантового Хаоса */}
      {isChaos && (showTooltip || isSelected) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(false);
          }}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            color: '#e2e8f0',
            border: '1px solid #8b5cf6',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8), 0 0 10px rgba(139, 92, 246, 0.4)',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '0.62rem',
            lineHeight: 1.35,
            width: '180px',
            textAlign: 'center',
            zIndex: 99,
            pointerEvents: 'auto',
            backdropFilter: 'blur(8px)',
            cursor: 'default'
          }}
        >
          <div style={{ color: '#c084fc', fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <span>🌀</span>
            <span>Квантовый хаос</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Для декогеренции необходим наблюдатель поблизости.
          </div>
          {/* Треугольная стрелка внизу подсказки */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #8b5cf6'
          }} />
        </div>
      )}

      {/* Всплывающая подсказка с адресом, именем основателя и названием мира для Портала */}
      {isPortal && isSelected && showTooltip && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(false);
          }}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            color: '#f8fafc',
            border: '1px solid #c084fc',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.9), 0 0 14px rgba(192, 132, 252, 0.5)',
            borderRadius: '6px',
            padding: '7px 10px',
            fontSize: '0.64rem',
            lineHeight: 1.35,
            width: '235px',
            textAlign: 'left',
            zIndex: 100,
            pointerEvents: 'auto',
            backdropFilter: 'blur(10px)',
            cursor: 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}
        >
          <div style={{
            color: '#c084fc',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(192, 132, 252, 0.25)',
            paddingBottom: '3px',
            marginBottom: '2px'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <img src={PORTAL_PIXEL_SPRITE_URI} alt="Портал" style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} />
              <span>Врата #{portalId}</span>
            </span>
            <span style={{ fontSize: '0.55rem', color: '#a855f7', fontWeight: 600 }}>({coord.x}, {coord.y})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.58rem' }}>Мир:</span>
              <span style={{ color: '#facc15', fontWeight: 700, fontSize: '0.66rem' }}>
                {portalMeta ? portalMeta.worldName : 'Загрузка...'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.58rem' }}>Основатель:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.62rem' }}>
                {portalMeta ? portalMeta.founderName : '...'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.55rem' }}>Адрес владельца:</span>
              <span style={{
                color: '#facc15',
                fontFamily: 'monospace',
                fontSize: '0.54rem',
                wordBreak: 'break-all',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: '2px 4px',
                borderRadius: '3px',
                marginTop: '1px'
              }}>
                {portalMeta ? portalMeta.founder : 'Определяется...'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', paddingTop: '2px', borderTop: '1px dashed #334155' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.55rem' }}>Адрес смарт-контракта:</span>
              <span style={{
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: '0.56rem',
                wordBreak: 'break-all',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                padding: '2px 4px',
                borderRadius: '3px',
                marginTop: '1px'
              }}>
                {portalMeta ? portalMeta.targetContract : 'Определяется...'}
              </span>
            </div>
          </div>

          {/* Стрелка вниз */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #c084fc'
          }} />
        </div>
      )}
      {/* Слой пелены плотного полупрозрачного тумана над неизведанной клеткой */}
      {isFog && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(203, 213, 225, 0.22) 0%, rgba(100, 116, 139, 0.35) 60%, rgba(30, 41, 59, 0.8) 100%)',
            backdropFilter: 'blur(3px)',
            mixBlendMode: 'screen'
          }}
        />
      )}


      {/* Верхняя строка: Координаты и Названия */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        lineHeight: 1
      }}>
        <span style={{
          fontSize: '0.55rem',
          color: isSelected ? '#38bdf8' : (isFog ? '#475569' : '#cbd5e1'),
          fontWeight: isSelected ? 800 : 600
        }}>
          ({coord.x},{coord.y})
        </span>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          textAlign: 'right'
        }}>
          <span style={{ fontSize: '0.52rem', color: isFog ? '#64748b' : (isChaos ? '#a78bfa' : '#fef08a'), fontWeight: 700 }}>
            {isFog ? '🌫️ Туман' : (isChaos ? '🌀 Хаос' : tInfo.name)}
          </span>
          <span style={{
            fontSize: '0.48rem',
            color: hasObject ? '#67e8f9' : '#64748b',
            fontWeight: hasObject ? 700 : 500
          }}>
            {isQuantumSubstance ? '—' : hasObject ? oInfo.name : '—'}
          </span>
        </div>
      </div>

      {/* Центр клетки: Обелиск, Звезда, Портал и Человечек (Игрок) на переднем плане */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        fontSize: '1.75rem',
        lineHeight: 1,
        position: 'relative',
        width: '100%',
        height: '100%'
      }}>
        {/* Базовый объект клетки (Обелиск, Стена, Звезда, Портал) */}
        {!isFog && cell?.object === 1 && (
          <img
            src={OBELISK_PIXEL_SPRITE_URI}
            alt="Обелиск"
            style={{
              width: '32px',
              height: '32px',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        )}
        {!isFog && cell?.object === 9 && (
          <img
            src={OBELISK_PIXEL_SPRITE_URI}
            alt="Обелиск"
            style={{
              width: '32px',
              height: '32px',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        )}
        {!isFog && cell?.object === 3 && (
          <img
            src={STAR_PIXEL_SPRITE_URI}
            alt=""
            style={{
              width: '32px',
              height: '32px',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.75))',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        )}
        {!isFog && cell?.object === 4 && (
          <img
            src={PORTAL_PIXEL_SPRITE_URI}
            alt="Портал"
            style={{
              width: '32px',
              height: '32px',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.7))',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        )}
        {hasObject && ![1, 3, 4, 9].includes(cell.object) && (
          oInfo.icon
        )}
        {isFog && '☁️'}

        {/* Человечек (Игрок) на переднем плане (zIndex: 10 поверх любого объекта клетки) */}
        {isPlayerHere && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              pointerEvents: 'none'
            }}
          >
            <img
              src={PLAYER_PIXEL_SPRITE_URI}
              alt="Игрок"
              style={{
                width: '32px',
                height: '32px',
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.9))',
                userSelect: 'none'
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
};
