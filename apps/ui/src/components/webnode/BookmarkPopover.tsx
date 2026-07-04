/**
 * @file BookmarkPopover.tsx
 * @description Component for bookmark creation popover
 */

import React from 'react';
import { BookmarkFolder } from './types';

interface BookmarkPopoverProps {
  show: boolean;
  bookmarkTitle: string;
  onTitleChange: (value: string) => void;
  selectedFolderId: string | null;
  onFolderChange: (value: string | null) => void;
  isCreatingFolder: boolean;
  onToggleCreateFolder: () => void;
  newFolderName: string;
  onNewFolderNameChange: (value: string) => void;
  folders: BookmarkFolder[] | undefined;
  onSaveFolder: () => void;
  onSaveBookmark: () => void;
  onCancel: () => void;
  isSavingFolder: boolean;
  isSavingBookmark: boolean;
}

export function BookmarkPopover({
  show,
  bookmarkTitle,
  onTitleChange,
  selectedFolderId,
  onFolderChange,
  isCreatingFolder,
  onToggleCreateFolder,
  newFolderName,
  onNewFolderNameChange,
  folders,
  onSaveFolder,
  onSaveBookmark,
  onCancel,
  isSavingFolder,
  isSavingBookmark
}: BookmarkPopoverProps) {
  if (!show) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-950 border border-border shadow-2xl rounded-lg p-4 z-50 flex flex-col space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add Bookmark</h4>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-bold uppercase">Title</label>
        <input
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
          value={bookmarkTitle}
          onChange={e => onTitleChange(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-bold uppercase">Folder</label>
        {isCreatingFolder ? (
          <div className="flex space-x-2">
            <input
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={e => onNewFolderNameChange(e.target.value)}
              autoFocus
            />
            <button
              onClick={onSaveFolder}
              disabled={isSavingFolder}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground font-bold rounded shadow hover:opacity-90"
            >
              {isSavingFolder ? '...' : 'Save'}
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <select
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
              value={selectedFolderId || ''}
              onChange={e => onFolderChange(e.target.value || null)}
            >
              <option value="">No Folder</option>
              {folders?.map((f: BookmarkFolder) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button
              onClick={onToggleCreateFolder}
              className="px-2 py-1 text-xs bg-muted text-muted-foreground hover:text-white rounded"
            >
              +
            </button>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs text-muted-foreground hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={onSaveBookmark}
          disabled={isSavingBookmark}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground font-bold rounded shadow hover:opacity-90"
        >
          {isSavingBookmark ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
