import React from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

/**
 * @file FocusStrip.tsx
 * @description Standardized header visible only on the focused AppCard.
 * Includes directional spatial matrix controls (moveCard).
 */

export interface FocusStripProps {
  cardId: string;
  title?: string;
  icon?: string;
}

export const FocusStrip: React.FC<FocusStripProps> = ({
  cardId,
  title = 'Application',
  icon
}) => {
  const moveCard = useWorkspaceStore(s => s.moveCard);

  return (
    <div className="h-10 bg-[var(--colors-background)] border-b border-[var(--colors-border)] flex items-center justify-between px-3 w-full shrink-0 select-none">
      <span className="text-[var(--colors-primary)] text-sm font-semibold flex items-center gap-2">
        {icon && <span className="material-icons text-sm">{icon}</span>}
        {title}
      </span>

      {/* Spatial Matrix Routing Directional Buttons */}
      <div className="flex items-center gap-1 bg-[var(--colors-surface)] border border-[var(--colors-divider)] rounded p-0.5">
        <button
          onClick={() => moveCard(cardId, 'left')}
          title="Move Left"
          className="w-6 h-6 flex items-center justify-center text-xs text-[var(--colors-primary)] hover:bg-[var(--colors-divider)] rounded transition-colors cursor-pointer"
        >
          <span className="material-icons text-sm">chevron_left</span>
        </button>
        <button
          onClick={() => moveCard(cardId, 'up')}
          title="Move Up"
          className="w-6 h-6 flex items-center justify-center text-xs text-[var(--colors-primary)] hover:bg-[var(--colors-divider)] rounded transition-colors cursor-pointer"
        >
          <span className="material-icons text-sm">keyboard_arrow_up</span>
        </button>
        <button
          onClick={() => moveCard(cardId, 'down')}
          title="Move Down"
          className="w-6 h-6 flex items-center justify-center text-xs text-[var(--colors-primary)] hover:bg-[var(--colors-divider)] rounded transition-colors cursor-pointer"
        >
          <span className="material-icons text-sm">keyboard_arrow_down</span>
        </button>
        <button
          onClick={() => moveCard(cardId, 'right')}
          title="Move Right"
          className="w-6 h-6 flex items-center justify-center text-xs text-[var(--colors-primary)] hover:bg-[var(--colors-divider)] rounded transition-colors cursor-pointer"
        >
          <span className="material-icons text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
