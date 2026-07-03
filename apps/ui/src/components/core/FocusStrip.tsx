import React from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { AppRegistry } from '../../registry/ComponentRegistry.js';
import { 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Maximize2, Minimize2, Settings, Command, GripVertical, Copy
} from 'lucide-react';
import { cn } from '../../lib/utils.js';

import { Select, MenuItem } from '@mui/material';

/**
 * @file FocusStrip.tsx
 * @description Standardized header visible only on the focused AppCard.
 * Includes directional spatial matrix controls (moveCard).
 */

export interface FocusStripProps {
  cardId: string;
  title?: string;
  icon?: React.ReactNode;
}

export const FocusStrip: React.FC<FocusStripProps> = ({
  cardId,
  title = 'Application',
  icon
}) => {
  const moveCard = useWorkspaceStore(s => s.moveCard);
  const setCardContent = useWorkspaceStore(s => s.setCardContent);
  const card = useWorkspaceStore(s => s.cards.find(c => c.id === cardId));
  const currentAppId = card?.appId || card?.activeTool || card?.metadata?.viewMode || 'file-explorer';

  const handleAppChange = (newAppId: string) => {
    setCardContent(cardId, newAppId);
  };

  return (
    <div className="h-10 bg-[var(--colors-background)] border-b border-[var(--colors-border)] flex items-center justify-between px-3 w-full shrink-0 select-none">
      <div className="flex items-center gap-2">
        {icon && <span className="material-icons text-sm text-[var(--colors-primary)]">{icon}</span>}
        
        {/* Dynamic App Swapper Dropdown (MUI) */}
        <Select
          size="small"
          value={String(currentAppId).toLowerCase()}
          onChange={(e) => handleAppChange(e.target.value as string)}
          sx={{ 
            height: 24, 
            fontSize: '0.70rem', 
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: 'var(--colors-primary)',
            bgcolor: '#18181b', // zinc-900
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#3f3f46' }, // zinc-700
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' }, // indigo-500
            '.MuiSvgIcon-root': { color: 'var(--colors-primary)' }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: '#18181b',
                color: 'var(--colors-primary)',
                border: '1px solid #3f3f46'
              }
            }
          }}
        >
          {Object.keys(AppRegistry).map((appId) => (
            <MenuItem key={appId} value={appId} sx={{ fontSize: '0.70rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {appId.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </div>

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
