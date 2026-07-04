/**
 * @file BookmarkBar.tsx
 * @description Component for displaying bookmark folders bar
 */

import React from 'react';
import { Folder, ChevronDown, ExternalLink, Plus } from 'lucide-react';
import { BookmarkFolder } from './types';

interface BookmarkBarProps {
  folders: BookmarkFolder[] | undefined;
  onBookmarkClick: (url: string) => void;
}

export function BookmarkBar({ folders, onBookmarkClick }: BookmarkBarProps) {
  return (
    <div className="h-8 border-t border-border/50 bg-card/30 flex items-center px-3 space-x-4 overflow-x-auto no-scrollbar">
      {folders?.map((folder: BookmarkFolder) => (
        <div
          key={folder.id}
          className="group relative flex items-center space-x-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap py-1"
        >
          <Folder size={12} className="text-muted-foreground/60" />
          <span>{folder.name}</span>
          <ChevronDown size={10} className="opacity-50" />

          <div className="absolute top-full left-0 mt-0 hidden group-hover:block z-[100] bg-zinc-900 border border-zinc-800 rounded shadow-2xl py-1 min-w-[140px]">
            {folder.bookmarks?.map((bm: any) => (
              <div
                key={bm.id}
                onClick={() => onBookmarkClick(bm.url)}
                className="px-3 py-1.5 hover:bg-white/5 flex items-center justify-between text-[10px]"
              >
                <span className="truncate mr-2">{bm.title}</span>
                <ExternalLink size={10} className="opacity-30" />
              </div>
            ))}
            {(!folder.bookmarks || folder.bookmarks.length === 0) && (
              <div className="px-3 py-2 text-zinc-600 italic">Empty</div>
            )}
          </div>
        </div>
      ))}
      <button className="p-1 hover:bg-muted rounded text-muted-foreground opacity-40 hover:opacity-100">
        <Plus size={12} />
      </button>
    </div>
  );
}
