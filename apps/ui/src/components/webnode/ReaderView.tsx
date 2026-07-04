/**
 * @file ReaderView.tsx
 * @description Component for displaying extracted content in reader mode
 */

import React from 'react';

interface ReaderViewProps {
  show: boolean;
  content: string;
  onClose: () => void;
}

export function ReaderView({ show, content, onClose }: ReaderViewProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-40 bg-[var(--bg-background)] overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Reader View</h2>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded bg-muted"
          >
            Back to Browser
          </button>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}
