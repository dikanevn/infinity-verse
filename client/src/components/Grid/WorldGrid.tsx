import React from 'react';
import type { CellData, PlayerData } from '../../types';
import { INITIAL_COORDS } from '../../config/constants';
import { CellView } from './CellView';

interface WorldGridProps {
  cells: CellData[];
  selectedCoord: { x: number; y: number };
  player: PlayerData | null;
  onSelectCoord: (coord: { x: number; y: number }) => void;
}

export const WorldGrid: React.FC<WorldGridProps> = ({
  cells,
  selectedCoord,
  player,
  onSelectCoord
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      margin: '6px 0 12px 0',
      width: '100%'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 78px)',
        gridTemplateRows: 'repeat(5, 78px)',
        gap: '6px',
        backgroundColor: '#10131d',
        padding: '6px',
        border: '2px solid #2e384d',
        borderRadius: '0px'
      }}>
        {INITIAL_COORDS.map((coord) => {
          const cell = cells.find(c => c.x === coord.x && c.y === coord.y);
          const isSelected = selectedCoord.x === coord.x && selectedCoord.y === coord.y;

          return (
            <CellView
              key={`${coord.x},${coord.y}`}
              coord={coord}
              cell={cell}
              isSelected={isSelected}
              player={player}
              onSelect={onSelectCoord}
            />
          );
        })}
      </div>
    </div>
  );
};
