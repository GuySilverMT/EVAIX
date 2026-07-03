import React from 'react';

/**
 * @file StackStrip.tsx
 * @description Condensed title-bar state of backgrounded AppCards.
 */

export interface StackStripProps {
  title?: string;
}

export const StackStrip: React.FC<StackStripProps> = ({ title = 'Application' }) => {
  return (
    <div className="h-6 bg-[var(--colors-background)] border-b border-[var(--colors-border)] flex items-center px-2 w-full shrink-0 opacity-70 hover:opacity-100 cursor-pointer transition-opacity">
      <span className="text-[var(--colors-primary)] text-xs truncate">
        {title}
      </span>
    </div>
  );
};
