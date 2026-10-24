import { useState, useEffect } from 'react';
import { keccak256, encodePacked } from 'viem';
import type { CellData } from '../types';
import { MAIN_CONTRACT_ADDRESS, MAIN_ABI, publicClient } from '../config/contracts';
import { INITIAL_COORDS, CONNECTION_CONFIG } from '../config/constants';

export function useWorldState(connectedAddress: string) {
  const [cells, setCells] = useState<CellData[]>([]);
  const [contractVersion, setContractVersion] = useState<string>('0.0.0.0.9-MAIN-G-2');
  const [lastBlockTimestamp, setLastBlockTimestamp] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('Калибровка межпространственной связи...');
  const [statusState, setStatusState] = useState<'green' | 'yellow' | 'red' | 'blue'>('blue');

  const fetchState = async () => {
    try {
      const xs = INITIAL_COORDS.map(c => c.x);
      const ys = INITIAL_COORDS.map(c => c.y);

      const [ver, onchainCells, latestBlock] = await Promise.all([
        publicClient.readContract({
          address: MAIN_CONTRACT_ADDRESS,
          abi: MAIN_ABI,
          functionName: 'VERSION',
        }),
        publicClient.readContract({
          address: MAIN_CONTRACT_ADDRESS,
          abi: MAIN_ABI,
          functionName: 'getCellsBatch',
          args: [xs, ys]
        }),
        publicClient.getBlock({ blockTag: 'latest' })
      ]);

      setContractVersion(ver);
      setLastBlockTimestamp(Number(latestBlock.timestamp));

      const parsed: CellData[] = INITIAL_COORDS.map((coord, i) => {
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

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, CONNECTION_CONFIG.SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [connectedAddress]);

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
