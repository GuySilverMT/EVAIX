/**
 * @file AvexBar.tsx
 * @description The global AI preemptive HUD.
 * Features a live clock that acts as a quick-launcher for the Scheduler app.
 */

import React, { useState, useEffect } from 'react';
import { ModelBar } from '../ui/ModelBar.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

export interface AvexBarProps {
  contextLocation?: string;
}

export const AvexBar: React.FC<AvexBarProps> = ({ contextLocation = 'main-nav' }) => {
  // Pull in the app spawner from the Zustand store
  const spawnApp = useWorkspaceStore(s => s.spawnApp);
  
  // State for the live clock
  const [time, setTime] = useState(new Date());

  // Update the clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date and time (e.g., "7/3/2026", "7:10:00 PM")
  const dateStr = time.toLocaleDateString();
  const timeStr = time.toLocaleTimeString();

  return (
    <div className="w-full h-10 flex items-center justify-between px-4 bg-[var(--colors-background)] border-b border-[var(--colors-divider)] text-[var(--colors-primary)] text-sm font-[var(--typography-fontFamily)] shrink-0 select-none">
      {/* Left Side: System Context & Live Clock */}
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className="tracking-widest uppercase font-bold text-zinc-400">
          EVAIX MATRIX
        </span>
        
        <span className="text-zinc-600">|</span>
        
        {/* Clickable Clock / Calendar Launcher */}
        <button 
          onClick={() => spawnApp('scheduler')}
          className="font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer flex gap-3"
          title="Open Scheduler"
        >
          <span>{dateStr}</span>
          <span>{timeStr}</span>
        </button>

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
