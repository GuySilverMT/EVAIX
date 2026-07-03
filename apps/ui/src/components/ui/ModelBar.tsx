import React, { useState } from 'react';
import { useProviderStore } from '../../stores/provider.store.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { Menu, MenuItem, Popover, Tooltip, Divider } from '@mui/material';
import { Sparkles, Play, Link as LinkIcon, Eye, Zap, Database, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils.js';

export type ContextStrategy = 'Visible Card' | 'Visible Tab' | 'Full Stack';

export interface ModelBarProps {
  contextLocation?: string;
  isCondensed?: boolean;
  expandDirection?: 'left' | 'right' | 'up' | 'down';
  className?: string;
  onPlayClick?: () => void;
}

export const ModelBar: React.FC<ModelBarProps> = ({
  contextLocation = 'Global Context',
  isCondensed = false,
  expandDirection = 'left',
  className,
  onPlayClick
}) => {
  const providers = useProviderStore(s => s.providers);
  const roles = useProviderStore(s => s.roles);
  const activeProviderId = useProviderStore(s => s.activeProviderId);
  const activeModelId = useProviderStore(s => s.activeModelId);
  const activeRoleId = useProviderStore(s => s.activeRoleId);
  
  const setActiveProvider = useProviderStore(s => s.setActiveProvider);
  const setActiveModel = useProviderStore(s => s.setActiveModel);
  const setActiveRole = useProviderStore(s => s.setActiveRole);
  const toggleProvider = useProviderStore(s => s.toggleProvider);
  const toggleModel = useProviderStore(s => s.toggleModel);

  const spawnApp = useWorkspaceStore(s => s.spawnApp);
  const executeAgent = useWorkspaceStore(s => s.executeAgent);

  // Dropdown States
  const [menuAnchorEl, setMenuAnchorEl] = useState<{ element: HTMLElement; type: 'system' | 'provider' | 'model' | 'role' } | null>(null);

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>('Visible Card');

  // For Condensed State
  const [condensedAnchorEl, setCondensedAnchorEl] = useState<HTMLButtonElement | null>(null);

  const openMenu = (type: 'system' | 'provider' | 'model' | 'role', event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl({ element: event.currentTarget, type });
    setCondensedAnchorEl(null); // close condensed popover if open
  };

  const closeMenu = () => setMenuAnchorEl(null);

  const activeProvider = providers.find(p => p.id === activeProviderId) || providers[0];
  const availableModels = activeProvider?.models || [];

  const handlePlayClick = () => {
    if (onPlayClick) {
      onPlayClick();
    } else {
      executeAgent(`${contextStrategy} (${contextLocation})`);
    }
  };

  const handlePlayContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const selectStrategy = (strategy: ContextStrategy) => {
    setContextStrategy(strategy);
    setIsContextMenuOpen(false);
  };

  // Mock token estimator logic based on strategy
  const getContextEstimate = () => {
    // A crafty calculation placeholder until actual VFS tokens are read
    switch (contextStrategy) {
      case 'Visible Tab': return '8/256K';
      case 'Visible Card': return '33/256K';
      case 'Full Stack': return '128/256K';
      default: return '0/256K';
    }
  };

  const getContextColor = () => {
    switch (contextStrategy) {
      case 'Visible Tab': return 'text-green-400';
      case 'Visible Card': return 'text-yellow-400';
      case 'Full Stack': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  // The actual Matrix HUD
  const renderMatrix = () => {
    if (providers.length === 0) {
      return (
        <Tooltip title="Gateway: Link LiteLLM Provider" placement={expandDirection === 'left' ? 'bottom-end' : 'bottom-start'}>
          <button
            onClick={() => spawnApp('lite-llm-config')}
            className="px-3 h-7 text-[10px] font-bold rounded bg-green-950/80 hover:bg-green-900 text-green-300 border border-green-500/50 flex items-center gap-2 transition-all shadow-lg animate-pulse cursor-pointer uppercase tracking-widest"
          >
            <LinkIcon size={12} />
            <span>Link Gateway</span>
          </button>
        </Tooltip>
      );
    }

    return (
      <div className="flex items-center gap-1.5 h-7">
        <Tooltip title="[S] System & Scope Config" placement="bottom">
          <button
            onClick={(e) => openMenu('system', e)}
            className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-black text-xs border border-[var(--colors-divider)] transition-all cursor-pointer shadow-sm"
          >
            S
          </button>
        </Tooltip>

        <Tooltip title={`[P] Provider: ${activeProvider?.name || 'Select Provider'}`} placement="bottom">
          <button
            onClick={(e) => openMenu('provider', e)}
            style={{ backgroundColor: activeProvider?.color || '#3b82f6' }}
            className="w-7 h-7 rounded flex items-center justify-center text-white font-black text-xs border border-white/40 transition-all cursor-pointer shadow-sm"
          >
            P
          </button>
        </Tooltip>

        <Tooltip title={`[M] Model: ${activeModelId || 'Select Model'}`} placement="bottom">
          <button
            onClick={(e) => openMenu('model', e)}
            className="w-7 h-7 rounded bg-blue-900/80 hover:bg-blue-800 text-blue-200 flex items-center justify-center font-black text-xs border border-blue-500/50 transition-all cursor-pointer shadow-sm"
          >
            M
          </button>
        </Tooltip>

        <Tooltip title={`[R] Role: ${activeRoleId || 'Select Role'}`} placement="bottom">
          <button
            onClick={(e) => openMenu('role', e)}
            className="w-7 h-7 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 flex items-center justify-center font-black text-xs border border-purple-500/50 transition-all cursor-pointer shadow-sm"
          >
            R
          </button>
        </Tooltip>

        <Tooltip title={`Context: ${contextStrategy} | Location: ${contextLocation}`} placement="bottom">
          <div
            className="h-7 px-2.5 rounded bg-[#18181b] border border-[#3f3f46] flex flex-col items-center justify-center cursor-default hover:border-zinc-500 transition-colors shadow-sm min-w-[60px]"
          >
            <span className={cn("text-[9px] font-mono font-bold tracking-tight", getContextColor())}>
              {getContextEstimate()}
            </span>
          </div>
        </Tooltip>

        <Tooltip title="Left-Click: Run Agent | Right-Click: Context Strategy" placement={expandDirection === 'left' ? 'bottom-end' : 'bottom-start'}>
          <button
            onClick={handlePlayClick}
            onContextMenu={handlePlayContextMenu}
            className="w-7 h-7 rounded bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition-all shadow-md cursor-pointer ml-0.5"
          >
            <Play size={14} fill="currentColor" />
          </button>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      {isCondensed ? (
        <>
          <button
            onClick={(e) => setCondensedAnchorEl(e.currentTarget)}
            className="w-7 h-7 flex items-center justify-center rounded-sm transition-all border shadow-sm hover:shadow-md active:scale-95 bg-gradient-to-br from-[var(--color-primary)] to-purple-600 text-white border-transparent"
            title={`AI Context: ${contextLocation}`}
          >
            <Sparkles size={14} />
          </button>

          <Popover
            open={Boolean(condensedAnchorEl)}
            anchorEl={condensedAnchorEl}
            onClose={() => setCondensedAnchorEl(null)}
            anchorOrigin={{
              vertical: 'center',
              horizontal: expandDirection === 'left' ? 'left' : 'right',
            }}
            transformOrigin={{
              vertical: 'center',
              horizontal: expandDirection === 'left' ? 'right' : 'left',
            }}
            PaperProps={{
              sx: {
                bgcolor: '#09090b',
                backgroundImage: 'none',
                border: '1px solid #3f3f46',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                p: 0.5,
                ml: expandDirection === 'right' ? 1 : 0,
                mr: expandDirection === 'left' ? 1 : 0,
              }
            }}
          >
            {renderMatrix()}
          </Popover>
        </>
      ) : (
        renderMatrix()
      )}

      {/* Main Dynamic Menu for S, P, M, R */}
      <Menu
        open={Boolean(menuAnchorEl)}
        anchorEl={menuAnchorEl?.element}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: expandDirection === 'left' ? 'right' : 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: expandDirection === 'left' ? 'right' : 'left' }}
        PaperProps={{
          sx: {
            bgcolor: '#18181b',
            color: 'var(--colors-primary)',
            border: '1px solid var(--colors-divider)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
            minWidth: 180,
            mt: 0.5
          }
        }}
        MenuListProps={{ sx: { p: 0 } }}
      >
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-[var(--colors-divider)] mb-1 outline-none pointer-events-none bg-black/20">
          {menuAnchorEl?.type === 'system' && 'System Routing Logic'}
          {menuAnchorEl?.type === 'provider' && 'Select Provider'}
          {menuAnchorEl?.type === 'model' && 'Select Model'}
          {menuAnchorEl?.type === 'role' && 'Select Agent Role'}
        </div>

        {/* SYSTEM MENU */}
        {menuAnchorEl?.type === 'system' && (
          <div className="p-1">
            {['Round Robin', 'Smart Availability', 'Manual Strict', 'Cost Arbitrage'].map(logic => (
              <MenuItem 
                key={logic}
                onClick={() => { console.log('Set routing logic', logic); closeMenu(); }}
                sx={getMenuItemStyles(false)}
              >
                <div className="flex items-center gap-2">
                  <Settings size={12} />
                  <span>{logic}</span>
                </div>
              </MenuItem>
            ))}
          </div>
        )}

        {/* PROVIDER MENU */}
        {menuAnchorEl?.type === 'provider' && (
          <div className="p-1">
            {providers.map(provider => (
              <MenuItem 
                key={provider.id}
                onClick={() => { setActiveProvider(provider.id); closeMenu(); }}
                onContextMenu={(e) => { e.preventDefault(); toggleProvider(provider.id); }}
                sx={getMenuItemStyles(activeProviderId === provider.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: provider.color || '#3b82f6' }} />
                    <span className={cn(!provider.enabled && "opacity-50 line-through")}>{provider.name}</span>
                  </div>
                  <div className={cn("w-1.5 h-1.5 rounded-full", provider.enabled ? "bg-green-500" : "bg-red-500")} title={provider.enabled ? "Active" : "Disabled (Right-Click to Toggle)"} />
                </div>
              </MenuItem>
            ))}
          </div>
        )}

        {/* MODEL MENU */}
        {menuAnchorEl?.type === 'model' && (
          <div className="p-1 max-h-[300px] overflow-y-auto custom-scrollbar">
            {availableModels.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-500 text-center">No models loaded.</div>
            )}
            {availableModels.map(model => (
              <MenuItem 
                key={model.id}
                onClick={() => { setActiveModel(model.id); closeMenu(); }}
                onContextMenu={(e) => { e.preventDefault(); toggleModel(activeProviderId!, model.id); }}
                sx={getMenuItemStyles(activeModelId === model.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn("text-xs", !model.enabled && "opacity-50 line-through truncate max-w-[140px]")} title={model.name}>
                    {model.name}
                  </span>
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 ml-2", model.enabled ? "bg-green-500" : "bg-red-500")} />
                </div>
              </MenuItem>
            ))}
          </div>
        )}

        {/* ROLE MENU */}
        {menuAnchorEl?.type === 'role' && (
          <div className="p-1">
            {roles.map(role => (
              <MenuItem 
                key={role.id}
                onClick={() => { setActiveRole(role.id); closeMenu(); }}
                sx={getMenuItemStyles(activeRoleId === role.id)}
              >
                <div className="flex items-center gap-2">
                  <Shield size={12} color={role.color || '#e056d5'} />
                  <span>{role.name}</span>
                </div>
              </MenuItem>
            ))}
          </div>
        )}
      </Menu>

      {/* Right-Click ContextStack Dropdown Menu */}
      <Menu
        open={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        anchorReference="anchorPosition"
        anchorPosition={isContextMenuOpen ? { top: contextMenuPosition.y, left: contextMenuPosition.x } : undefined}
        MenuListProps={{ sx: { p: 0.5, bgcolor: '#18181b' } }}
        PaperProps={{
          sx: {
            bgcolor: '#18181b',
            color: 'var(--colors-primary)',
            border: '1px solid var(--colors-divider)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
            minWidth: 160
          }
        }}
      >
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-[var(--colors-divider)] mb-1 outline-none pointer-events-none">
          ContextStack Strategy
        </div>

        <MenuItem onClick={() => selectStrategy('Visible Card')} sx={getMenuItemStyles(contextStrategy === 'Visible Card')}>
          <div className="flex w-full justify-between items-center"><Zap size={12} className="mr-2"/> <span>Visible Card</span></div>
        </MenuItem>

        <MenuItem onClick={() => selectStrategy('Visible Tab')} sx={getMenuItemStyles(contextStrategy === 'Visible Tab')}>
          <div className="flex w-full justify-between items-center"><Eye size={12} className="mr-2"/> <span>Visible Tab</span></div>
        </MenuItem>

        <MenuItem onClick={() => selectStrategy('Full Stack')} sx={getMenuItemStyles(contextStrategy === 'Full Stack')}>
          <div className="flex w-full justify-between items-center"><Database size={12} className="mr-2"/> <span>Full Stack</span></div>
        </MenuItem>
      </Menu>
    </div>
  );
};

function getMenuItemStyles(isActive: boolean) {
  return {
    fontSize: '0.75rem',
    borderRadius: 0.5,
    mx: 0.5,
    mb: 0.25,
    fontWeight: isActive ? 'bold' : 'normal',
    bgcolor: isActive ? 'rgb(37 99 235)' : 'transparent',
    color: isActive ? 'white' : 'var(--colors-primary)',
    '&:hover': { bgcolor: isActive ? 'rgb(29 78 216)' : '#27272a' }
  };
}
