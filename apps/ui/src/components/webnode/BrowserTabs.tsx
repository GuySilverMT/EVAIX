/**
 * @file BrowserTabs.tsx
 * @description Component for rendering browser tabs
 */

import React from 'react';
import { Globe } from 'lucide-react';
import { Plus, X as CloseIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tab } from './types';

interface BrowserTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onAddTab: () => void;
  onCloseTab: (e: React.MouseEvent, id: string) => void;
}

export function BrowserTabs({ tabs, activeTabId, onTabClick, onAddTab, onCloseTab }: BrowserTabsProps) {
  return (
    <div className="h-9 flex items-center bg-muted/20 border-b border-border/50 overflow-x-auto no-scrollbar px-1">
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => onTabClick(tab.id)}
          className={cn(
            'group flex items-center min-w-[120px] max-w-[180px] h-7 px-3 text-[10px] font-bold cursor-pointer rounded-t-md transition-all mr-0.5 border-x border-t',
            activeTabId === tab.id
              ? 'bg-background border-border text-foreground border-b-background z-10'
              : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted/60'
          )}
        >
          <Globe size={10} className={cn('mr-2', activeTabId === tab.id ? 'text-primary' : 'text-muted-foreground/50')} />
          <span className="truncate flex-1">{tab.title}</span>
          <button
            onClick={(e) => onCloseTab(e, tab.id)}
            className="ml-2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
          >
            <CloseIcon size={10} />
          </button>
        </div>
      ))}
      <button
        onClick={onAddTab}
        className="p-1.5 hover:bg-muted rounded text-muted-foreground ml-1"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
