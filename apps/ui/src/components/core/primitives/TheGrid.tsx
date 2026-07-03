import React from 'react';
import { useWorkspaceStore, type CardData } from '../../../stores/workspace.store.js';
import { AppCard } from '../../work-order/AppCard.js';

/**
 * @file TheGrid.tsx
 * @description The spatial window matrix renderer.
 * Groups active cards by columnId, renders columns in flex-row,
 * and sorts cards within each column by rowIndex.
 */

export interface TheGridProps {
  displayId?: number;
}

export const TheGrid: React.FC<TheGridProps> = ({ displayId = 0 }) => {
  const cards = useWorkspaceStore(s => s.cards);
  const totalColumns = useWorkspaceStore(s => s.columns) || 2;

  // Filter cards by displayId / screenspaceId
  const activeCards = cards.filter(
    c => (c.displayId ?? c.screenspaceId ?? 0) === displayId
  );

  // Group activeCards by columnId
  const columnsMap: Record<number, CardData[]> = {};
  for (let colIdx = 0; colIdx < totalColumns; colIdx++) {
    columnsMap[colIdx] = [];
  }

  activeCards.forEach(card => {
    const colId = card.columnId ?? card.column ?? 0;
    if (!columnsMap[colId]) {
      columnsMap[colId] = [];
    }
    columnsMap[colId].push(card);
  });

  // Sort cards within each column by rowIndex
  Object.keys(columnsMap).forEach(colIdStr => {
    const colId = Number(colIdStr);
    columnsMap[colId].sort((a, b) => {
      const rowA = a.rowIndex ?? 0;
      const rowB = b.rowIndex ?? 0;
      return rowA - rowB;
    });
  });

  return (
    <div className="flex flex-row flex-1 w-full h-full gap-[1px] bg-[var(--colors-divider)] overflow-hidden">
      {Array.from({ length: totalColumns }).map((_, colIndex) => {
        const colCards = columnsMap[colIndex] || [];

        return (
          <div
            key={`column-${colIndex}`}
            className="flex flex-col flex-1 h-full bg-[var(--colors-background)] overflow-hidden"
          >
            {colCards.map((card, idx) => {
              const isFocused = idx === 0;
              return (
                <div
                  key={card.id}
                  className={`w-full flex flex-col overflow-hidden ${
                    isFocused ? 'flex-1 min-h-0' : 'h-7 shrink-0'
                  }`}
                >
                  <AppCard
                    id={card.id}
                    isFocused={isFocused}
                    isCondensed={!isFocused}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
