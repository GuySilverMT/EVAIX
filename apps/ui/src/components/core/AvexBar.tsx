/**
 * @file AvexBar.tsx
 * @description The global AI preemptive HUD.
 * Features a live clock that acts as a quick-launcher for the Scheduler app.
 */

import React, { useState, useEffect } from 'react';
import { ModelBar } from '../ui/ModelBar.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { useProviderStore } from '../../stores/provider.store.js';
import { trpc } from '../../utils/trpc.js';
import { toast } from 'sonner';

export interface AvexBarProps {
  contextLocation?: string;
}

export const AvexBar: React.FC<AvexBarProps> = ({ contextLocation = 'main-nav' }) => {
  // Pull in the app spawner from the Zustand store
  const spawnApp = useWorkspaceStore(s => s.spawnApp);
  
  // Provider store for model/role selection
  const activeModelId = useProviderStore(s => s.activeModelId);
  const activeRoleId = useProviderStore(s => s.activeRoleId);
  
  // State for the live clock
  const [time, setTime] = useState(new Date());
  
  // State for agent execution
  const [contextDepth, setContextDepth] = useState(10);
  const [prompt, setPrompt] = useState('');
  const [isPromptMode, setIsPromptMode] = useState(false);

  // tRPC mutation for running agent sessions
  const runSession = trpc.llm.runAgentSession.useMutation({
    onSuccess: (data) => {
      toast.success('Agent execution completed');
      console.log('Agent response:', data.text);
    },
    onError: (error) => {
      toast.error('Agent execution failed', { description: error.message });
      console.error('Agent execution error:', error);
    }
  });

  // Update the clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date and time (e.g., "7/3/2026", "7:10:00 PM")
  const dateStr = time.toLocaleDateString();
  const timeStr = time.toLocaleTimeString();

  const handlePlayClick = () => {
    if (!activeModelId || !activeRoleId) {
      toast.error('Please select a model and role first');
      return;
    }
    
    if (!prompt.trim()) {
      setIsPromptMode(true);
      return;
    }

    runSession.mutate({
      modelId: activeModelId,
      roleId: activeRoleId,
      contextDepth,
      prompt
    });
  };

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
      <div className="flex items-center gap-4">
        {isPromptMode && (
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePlayClick();
              } else if (e.key === 'Escape') {
                setIsPromptMode(false);
              }
            }}
            placeholder="Enter prompt and press Enter..."
            className="w-64 h-7 px-3 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        )}
        <ModelBar 
          contextLocation={contextLocation} 
          isCondensed={false} 
          expandDirection="left" 
          onPlayClick={handlePlayClick}
          contextDepth={contextDepth}
          onContextDepthChange={setContextDepth}
        />
      </div>
    </div>
  );
};
