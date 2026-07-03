import React, { useState } from 'react';
import { useProviderStore } from '../../stores/provider.store.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { SystemPortal } from './SystemPortal.js';

export interface AvexBarProps {
  contextLocation?: string;
}

export type ContextStrategy = 'Visible Card' | 'Visible Tab' | 'Full Stack';

/**
 * @file AvexBar.tsx
 * @description The global AI preemptive HUD (the Matrix Model Bar).
 * Adheres to Context Sensitivity, Empty State Gateway Handler (LiteLLM),
 * Icon Matrix rendering ([S], [P], [M], [R], ContextEstimator, [Play]),
 * and Right-Click ContextStack menu routing.
 */

export const AvexBar: React.FC<AvexBarProps> = ({ contextLocation = 'main-nav' }) => {
  const providers = useProviderStore(s => s.providers);
  const activeProviderId = useProviderStore(s => s.activeProviderId);
  const activeModelId = useProviderStore(s => s.activeModelId);
  const activeRoleId = useProviderStore(s => s.activeRoleId);

  const spawnApp = useWorkspaceStore(s => s.spawnApp);
  const executeAgent = useWorkspaceStore(s => s.executeAgent);

  // SystemPortal state
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [portalTab, setPortalTab] = useState<'provider' | 'model' | 'role' | 'system'>('provider');

  // ContextStack Right-Click Menu State
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>('Visible Card');

  const openPortal = (tab: 'provider' | 'model' | 'role' | 'system') => {
    setPortalTab(tab);
    setIsPortalOpen(true);
  };

  const activeProvider = providers.find(p => p.id === activeProviderId) || providers[0];

  const handlePlayClick = () => {
    executeAgent(`${contextStrategy} (${contextLocation})`);
  };

  const handlePlayContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const selectStrategy = (strategy: ContextStrategy) => {
    setContextStrategy(strategy);
    setIsContextMenuOpen(false);
  };

  return (
    <>
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
        <div className="flex items-center gap-3">
          {providers.length === 0 ? (
            /* 1. Empty State: Glowing Gateway Button to Link LiteLLM */
            <button
              onClick={() => spawnApp('lite-llm-config')}
              className="px-3 py-1 text-xs font-bold rounded bg-green-950/80 hover:bg-green-900 text-green-300 border border-green-500/50 flex items-center gap-2 transition-all shadow-lg animate-pulse cursor-pointer"
              title="Click to Gateway: Link LiteLLM Provider"
            >
              <span className="material-icons text-sm text-green-400">hub</span>
              <span>Link LiteLLM (+)</span>
            </button>
          ) : (
            /* 2. Populated State: Matrix Icons ([S], [P], [M], [R], [ContextEstimator], [Play]) */
            <div className="flex items-center gap-2">
              {/* [S] System / Scope Button */}
              <button
                onClick={() => openPortal('system')}
                className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs border border-[var(--colors-divider)] transition-all cursor-pointer"
                title="[S] System & Scope Config"
              >
                S
              </button>

              {/* [P] Provider Button */}
              <button
                onClick={() => openPortal('provider')}
                style={{
                  backgroundColor: activeProvider?.color || '#3b82f6'
                }}
                className="w-7 h-7 rounded flex items-center justify-center text-white font-bold text-xs border border-white/40 transition-all cursor-pointer shadow-sm"
                title={`[P] Provider: ${activeProvider?.name || 'Select Provider'}`}
              >
                P
              </button>

              {/* [M] Model Button */}
              <button
                onClick={() => openPortal('model')}
                className="w-7 h-7 rounded bg-blue-900/80 hover:bg-blue-800 text-blue-200 flex items-center justify-center font-bold text-xs border border-blue-500/50 transition-all cursor-pointer"
                title={`[M] Model: ${activeModelId || 'Select Model'}`}
              >
                M
              </button>

              {/* [R] Role Button */}
              <button
                onClick={() => openPortal('role')}
                className="w-7 h-7 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 flex items-center justify-center font-bold text-xs border border-purple-500/50 transition-all cursor-pointer"
                title={`[R] Role: ${activeRoleId || 'Select Role'}`}
              >
                R
              </button>

              {/* [ContextEstimator] HUD Indicator */}
              <div
                className="px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-[var(--colors-divider)] text-[11px] font-mono flex items-center gap-1.5 cursor-pointer hover:border-zinc-500"
                onClick={() => openPortal('system')}
                title={`Context Strategy: ${contextStrategy}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                <span>{contextStrategy}</span>
              </div>

              {/* [Play] Action Button with Left-Click & Right-Click Menu */}
              <button
                onClick={handlePlayClick}
                onContextMenu={handlePlayContextMenu}
                className="w-7 h-7 rounded bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition-all shadow-md cursor-pointer ml-1"
                title="Left-Click: Execute Agent | Right-Click: ContextStack Menu"
              >
                <span className="material-icons text-sm">play_arrow</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SystemPortal Modal */}
      <SystemPortal
        isOpen={isPortalOpen}
        onClose={() => setIsPortalOpen(false)}
        initialType={portalTab}
      />

      {/* Right-Click ContextStack Dropdown Menu */}
      {isContextMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setIsContextMenuOpen(false)}
        >
          <div
            style={{ top: menuPosition.y, left: menuPosition.x }}
            className="absolute bg-zinc-900 border border-[var(--colors-divider)] rounded-lg shadow-xl p-1.5 text-xs text-[var(--colors-primary)] w-44 font-[var(--typography-fontFamily)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-[var(--colors-divider)] mb-1">
              ContextStack Strategy
            </div>

            <button
              onClick={() => selectStrategy('Visible Card')}
              className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between text-xs transition-colors ${
                contextStrategy === 'Visible Card'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span>Visible Card</span>
              {contextStrategy === 'Visible Card' && <span>✓</span>}
            </button>

            <button
              onClick={() => selectStrategy('Visible Tab')}
              className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between text-xs transition-colors ${
                contextStrategy === 'Visible Tab'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span>Visible Tab</span>
              {contextStrategy === 'Visible Tab' && <span>✓</span>}
            </button>

            <button
              onClick={() => selectStrategy('Full Stack')}
              className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between text-xs transition-colors ${
                contextStrategy === 'Full Stack'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span>Full Stack</span>
              {contextStrategy === 'Full Stack' && <span>✓</span>}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
