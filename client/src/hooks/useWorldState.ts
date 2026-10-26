import { useState, useEffect } from 'react';
import { keccak256, encodePacked } from 'viem';
import type { CellData } from '../types';
import { AAA_CONTRACT_ADDRESS, AAA_ABI, publicClient } from '../config/contracts';
import { CONNECTION_CONFIG } from '../config/constants';

export function useWorldState(
  connectedAddress: string,
  focusPoints: { x: number; y: number }[]
) {
  const [cells, setCells] = useState<CellData[]>([]);
  const [contractVersion, setContractVersion] = useState<string>('0.0.0.0.9-MAIN-G-2');
  const [lastBlockTimestamp, setLastBlockTimestamp] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Калибровка межпространственной связи...');
  const [statusState, setStatusState] = useState<'green' | 'yellow' | 'red' | 'blue'>('blue');

  const fetchState = async () => {
    try {
      // Собираем координаты 5х5 вокруг каждой точки фокуса (игрок + антенна/курсор)
      const coordMap = new Map<string, { x: number; y: number }>();

      // Если точек нет, по умолчанию берем (0, 0)
      const points = focusPoints.length > 0 ? focusPoints : [{ x: 0, y: 0 }];

      for (const pt of points) {
        for (let dy = 2; dy >= -2; dy--) {
          for (let dx = -2; dx <= 2; dx++) {
            const cx = pt.x + dx;
            const cy = pt.y + dy;
            coordMap.set(`${cx},${cy}`, { x: cx, y: cy });
          }
        }
      }

      const activeCoords = Array.from(coordMap.values());
      const xs = activeCoords.map(c => c.x);
      const ys = activeCoords.map(c => c.y);

      // Запрашиваем из ноды только активные клетки и latestBlock
      const [onchainCells, latestBlock] = await Promise.all([
        publicClient.readContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'getCellsBatch',
          args: [xs, ys]
        }),
        publicClient.getBlock({ blockTag: 'latest' })
      ]);

      setLastBlockTimestamp(Number(latestBlock.timestamp));

      const parsed: CellData[] = activeCoords.map((coord, i) => {
        const c = onchainCells[i];
        const localKey = keccak256(encodePacked(['int32', 'int32'], [coord.x, coord.y]));

        return {
          x: coord.x,
          y: coord.y,
          key: localKey,
          terrain: Number(c.terrain),
          object: Number(c.object),
          state: Number(c.state),
          reserved: Number(c.reserved),
          paramA: 0,
          paramB: 0
        };
      });

      setCells(parsed);
    } catch (err: any) {
      console.error(err);
      setStatusState('red');
      setStatusText('🚨 Ошибка: межпространственная связь потеряна');
    }
  };

  // Однократно считываем версию контракта при старте, чтобы не спамить ноду
  useEffect(() => {
    publicClient.readContract({
      address: AAA_CONTRACT_ADDRESS,
      abi: AAA_ABI,
      functionName: 'VERSION',
    }).then(ver => setContractVersion(ver)).catch(console.error);
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, CONNECTION_CONFIG.SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [connectedAddress, JSON.stringify(focusPoints)]);

  useEffect(() => {
    if (!lastBlockTimestamp) return;

    const updateStatus = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const ageSec = Math.max(0, nowSec - lastBlockTimestamp);

      if (ageSec > CONNECTION_CONFIG.DANGER_BLOCK_AGE_SEC) {
        setStatusState('red');
        setStatusText(`🚨 Нет сигнала (${ageSec} сек назад)`);
      } else if (ageSec > CONNECTION_CONFIG.WARN_BLOCK_AGE_SEC) {
        setStatusState('yellow');
        setStatusText(`⚠️ Замедление связи (${ageSec} сек назад)`);
      } else {
        setStatusState('green');
        setStatusText(`📡 Межпространственная связь (${ageSec} сек назад)`);
      }
    };

    updateStatus();
    const ticker = setInterval(updateStatus, 1000);
    return () => clearInterval(ticker);
  }, [lastBlockTimestamp]);

  return {
    cells,
    contractVersion,
    statusText,
    statusState,
    setStatusText,
    fetchState
  };
}
