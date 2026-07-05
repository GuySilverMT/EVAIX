/**
 * @file BrowserControls.tsx
 * @description Component for browser navigation controls
 */

import React from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BrowserControlsProps {
  input: string;
  onInputChange: (value: string) => void;
  onGo: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  isReady: boolean;
  onAddBookmark?: () => void;
  bookmarkActive?: boolean;
  children?: React.ReactNode;
}

export function BrowserControls({
  input,
  onInputChange,
  onGo,
  onBack,
  onForward,
  onReload,
  isReady,
  onAddBookmark,
  bookmarkActive = false,
  children
}: BrowserControlsProps) {
  return (
    <div className="h-10 flex items-center px-2 space-x-2">
      <div className="flex items-center space-x-0.5">
        <button
          type="button"
          onClick={onBack}
          disabled={!isReady}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onForward}
          disabled={!isReady}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
        >
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={onReload}
          disabled={!isReady}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
        >
          <RotateCw size={16} />
        </button>
      </div>

      <div className="flex-1 relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          <Lock size={12} className="opacity-50" />
        </div>
        <input
          className="w-full bg-card/50 text-foreground text-xs font-mono rounded py-1.5 pl-8 pr-12 border border-border focus:bg-card focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onGo(); }}
          onFocus={e => e.target.select()}
          placeholder="Enter URL or search..."
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 space-x-1">
          {onAddBookmark && (
            <button
              type="button"
              onClick={onAddBookmark}
              className={cn(
                'p-1 hover:bg-muted rounded transition-colors',
                bookmarkActive ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
              )}
            >
              <Star size={14} />
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
