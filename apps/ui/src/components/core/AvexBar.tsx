import React from 'react';
import { ModelBar } from '../ui/ModelBar.js';

export interface AvexBarProps {
  contextLocation?: string;
}

/**
 * @file AvexBar.tsx
 * @description The global AI preemptive HUD.
 * Now delegated entirely to the highly-reusable ModelBar component.
 */

export const AvexBar: React.FC<AvexBarProps> = ({ contextLocation = 'main-nav' }) => {
  return (
    <div className="w-full h-10 flex items-center justify-between px-4 bg-[var(--colors-background)] border-b border-[var(--colors-divider)] text-[var(--colors-primary)] text-sm font-[var(--typography-fontFamily)] shrink-0 select-none">
      {/* Left Side: System Context Location Identifier */}
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className="tracking-widest uppercase font-bold text-zinc-400">
          EVAIX MATRIX
        </span>
        <span className="text-zinc-600">|</span>
        <span className="font-mono text-zinc-400 bg-zinc-900 border border-[var(--colors-divider)] px-2 py-0.5 rounded text-[10px]">
          LOCATION: {contextLocation.toUpperCase()}
        </span>
      </div>

      {/* Right Side: Matrix HUD */}
      <ModelBar 
        contextLocation={contextLocation} 
        isCondensed={false} 
        expandDirection="left" 
      />
    </div>
  );
};
