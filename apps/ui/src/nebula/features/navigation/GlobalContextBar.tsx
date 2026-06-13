import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Command, Sparkles, X, Layers,
  Workflow, Settings, Palette, Plus, Minus,
  ChevronDown, Terminal, Mic, Database, Users,
  ShieldCheck, Folder
} from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { useWorkspaceStore } from '../../../stores/workspace.store.js';
import { trpc } from '../../../utils/trpc.js';

// ─────────────────────────────────────────────────────────────────────────────
// Workflow definitions — drives the Workflows dropdown
// ─────────────────────────────────────────────────────────────────────────────
const WORKFLOWS = [
  { id: 'org',        label: 'Org & Orchestration',  icon: Users,       columnCount: 2 },
] as const;

interface GlobalContextBarProps {
  aiOpen?: boolean;
  setAiOpen?: (open: boolean) => void;
  onToggleTheme?: () => void;
  themeOpen?: boolean;
  onOpenTerminal?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// DropdownPortal — renders dropdown content at document.body so it always
// appears above cards regardless of parent stacking contexts (overflow-hidden,
// transform, etc.)
// ─────────────────────────────────────────────────────────────────────────────
interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  width?: number;
  children: React.ReactNode;
}

function DropdownPortal({ anchorRef, open, onClose, align = 'left', width = 208, children }: DropdownPortalProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const portalRef = useRef<HTMLDivElement>(null);

  // Position relative to the anchor button
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const left = align === 'right'
      ? rect.right - width
      : rect.left;
    setPos({ top: rect.bottom + 4, left });
  }, [open, anchorRef, align, width]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        portalRef.current && !portalRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={portalRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width, zIndex: 99999 }}
      className="bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/60 rounded-sm py-1 animate-in fade-in zoom-in-95 duration-100"
    >
      {children}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Ticker — polls systemHealth.getLogs every 5s
// ─────────────────────────────────────────────────────────────────────────────
function LogTicker({ onClick }: { onClick: () => void }) {
  const { data: logs } = trpc.systemHealth.getLogs.useQuery(
    { limit: 30 },
    { refetchInterval: 5000, refetchIntervalInBackground: true }
  );

  const tickerText = logs?.length
    ? logs.map(l => `${l.ts.substring(11, 19)} ${l.msg}`).join('   ·   ')
    : 'System nominal — no recent events';

  return (
    <button
      onClick={onClick}
      title="Click to open Terminal"
      className="flex-1 min-w-0 h-full flex items-center overflow-hidden cursor-pointer group relative"
    >
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent pointer-events-none" />
      <div
        className="whitespace-nowrap font-mono text-[9px] text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors"
        style={{ animation: 'ticker 40s linear infinite' }}
      >
        {tickerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerText}
      </div>
      <div className="absolute right-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-1.5 py-0.5 z-20">
        <Terminal size={9} />
        <span className="text-[8px] font-bold uppercase tracking-wider">Open Terminal</span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceFlipper — portal-based screenspace switcher
// ─────────────────────────────────────────────────────────────────────────────
function WorkspaceFlipper() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { screenspaces, activeScreenspaceId, switchScreenspace } = useWorkspaceStore();
  const active = screenspaces.find(s => s.id === activeScreenspaceId);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div>
      <button
        ref={anchorRef}
        onClick={() => setOpen(o => !o)}
        title="Switch Workspace"
        className={cn(
          'flex items-center gap-1 px-2 h-8 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all border',
          open
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)]/50'
        )}
      >
        <Layers size={11} />
        <span className="hidden sm:block">{active?.name ?? 'WS'}</span>
        <ChevronDown size={9} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      <DropdownPortal anchorRef={anchorRef} open={open} onClose={close} align="left" width={160}>
        <div className="px-3 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          Screenspaces
        </div>
        <div className="h-px bg-zinc-700 my-1" />
        {screenspaces.map(ss => (
          <button
            key={ss.id}
            onClick={() => { switchScreenspace(ss.id); close(); }}
            className={cn(
              'w-full text-left px-3 py-1.5 text-[10px] transition-colors',
              ss.id === activeScreenspaceId
                ? 'text-indigo-400 bg-indigo-400/10 font-bold'
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
            )}
          >
            {ss.id === activeScreenspaceId ? '● ' : '○ '}{ss.name}
          </button>
        ))}
      </DropdownPortal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectContextBar — Active Project Context + Model Selector
// ─────────────────────────────────────────────────────────────────────────────
function ProjectContextBar() {
  const navigate = useNavigate();
  const { activeWorkspaceId, projectType, activeModelId, setActiveModelId } = useWorkspaceStore();
  const [modelOpen, setModelOpen] = useState(false);
  const modelAnchorRef = useRef<HTMLButtonElement>(null);

  // Fetch workspace details if activeWorkspaceId is present
  const { data: wsDetails } = trpc.workspace.get.useQuery(
    { id: activeWorkspaceId || '' },
    { enabled: !!activeWorkspaceId }
  );

  // Fetch active models
  const { data: models } = trpc.model.list.useQuery();

  const handleModelSelect = (modelId: string) => {
    setActiveModelId(modelId);
    setModelOpen(false);
  };

  const selectedModel = models?.find(m => m.id === activeModelId) || models?.[0];

  useEffect(() => {
    if (models && models.length > 0 && !activeModelId) {
      setActiveModelId(models[0].id);
    }
  }, [models, activeModelId, setActiveModelId]);

  return (
    <div className="flex items-center gap-2">
      {/* Dashboard Back Button */}
      <button
        onClick={() => navigate('/')}
        title="Go to Dashboard"
        className="flex items-center justify-center w-8 h-8 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] hover:text-white hover:border-indigo-500/50 transition-all animate-in fade-in"
      >
        <Folder size={13} className="text-zinc-500 hover:text-indigo-400" />
      </button>

      {activeWorkspaceId && wsDetails && (
        <div className="flex items-center gap-2 border-l border-zinc-800 pl-2 animate-in slide-in-from-left-2 duration-200">
          {/* Project Info Badge */}
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[120px]" title={wsDetails.name}>
              {wsDetails.name}
            </span>
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
              {projectType || wsDetails.projectType}
            </span>
          </div>

          <div className="w-px h-4 bg-zinc-800 mx-1" />

          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              ref={modelAnchorRef}
              onClick={() => setModelOpen(o => !o)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-8 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all border",
                modelOpen
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                  : "bg-[var(--bg-primary)] text-zinc-400 border-[var(--border-color)] hover:text-white hover:border-indigo-500/50"
              )}
            >
              <Sparkles size={11} className={cn("text-indigo-400", modelOpen && "text-white animate-pulse")} />
              <span className="max-w-[100px] truncate">{selectedModel?.name || "Select Model"}</span>
              <ChevronDown size={8} className={cn("transition-transform", modelOpen && "rotate-180")} />
            </button>

            <DropdownPortal anchorRef={modelAnchorRef} open={modelOpen} onClose={() => setModelOpen(false)} align="left" width={220}>
              <div className="px-3 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                Select Model Fleet
              </div>
              <div className="h-px bg-zinc-700 my-1" />
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {models && models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleModelSelect(m.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[10px] flex flex-col transition-colors border-b border-zinc-800/30 last:border-b-0",
                      m.id === activeModelId
                        ? "text-indigo-400 bg-indigo-400/10 font-bold"
                        : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                    )}
                  >
                    <span className="font-bold truncate w-full">{m.name}</span>
                    <span className="text-[8px] text-zinc-500 font-mono mt-0.5 truncate w-full">
                      {m.provider?.name || m.providerId}
                    </span>
                  </button>
                ))}
              </div>
            </DropdownPortal>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsDropdown — portal-based settings/theme switcher
// ─────────────────────────────────────────────────────────────────────────────
function SettingsDropdown({ onToggleTheme, themeOpen }: { onToggleTheme?: () => void; themeOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div>
      <button
        ref={anchorRef}
        onClick={() => setOpen(o => !o)}
        title="Settings & Theme"
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-sm transition-all border',
          open || themeOpen
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)]/50'
        )}
      >
        <Settings size={13} />
      </button>

      <DropdownPortal anchorRef={anchorRef} open={open} onClose={close} align="right" width={192}>
        <button
          onClick={() => { onToggleTheme?.(); close(); }}
          className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Palette size={12} />
          Theme Engine
        </button>
        <button
          onClick={() => { useWorkspaceStore.getState().setActiveWorkflow('settings'); close(); }}
          className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Settings size={12} />
          Constitution & Settings
        </button>
        <button
          onClick={() => { useWorkspaceStore.getState().setActiveWorkflow('org'); close(); }}
          className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Users size={12} />
          Org & Orchestration
        </button>
        <button
          onClick={() => { useWorkspaceStore.getState().setActiveWorkflow('provider'); close(); }}
          className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ShieldCheck size={12} />
          Provider & Billing
        </button>
        <button
          onClick={() => { useWorkspaceStore.getState().setActiveWorkflow('datacenter'); close(); }}
          className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Database size={12} />
          Data Center
        </button>
        <button
          onClick={() => { useWorkspaceStore.getState().setActiveWorkflow('voice'); close(); }}
          className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Mic size={12} />
          Voice Playground
        </button>
      </DropdownPortal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Count Controls
// ─────────────────────────────────────────────────────────────────────────────
function ColumnControls() {
  const { columns, setColumns } = useWorkspaceStore();

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setColumns(columns - 1)}
        disabled={columns <= 2}
        title="Remove Column"
        className="w-6 h-6 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-[var(--border-color)]"
      >
        <Minus size={11} />
      </button>
      <div className="min-w-[20px] text-center text-[10px] font-mono font-bold text-[var(--text-secondary)]">
        {columns}
      </div>
      <button
        onClick={() => setColumns(columns + 1)}
        disabled={columns >= 4}
        title="Add Column"
        className="w-6 h-6 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-[var(--border-color)]"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GlobalContextBar
// ─────────────────────────────────────────────────────────────────────────────
export const GlobalContextBar = ({
  aiOpen,
  setAiOpen,
  onToggleTheme,
  themeOpen,
  onOpenTerminal,
}: GlobalContextBarProps) => {
  const { activeWorkflow } = useWorkspaceStore();

  return (
    <>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="flex-none h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center select-none px-2 gap-1.5 overflow-hidden">

        {/* ── LEFT: Core controls ── */}
        <div className="flex items-center gap-1 flex-none">
          <ProjectContextBar />
          <div className="w-px h-4 bg-[var(--border-color)]" />
          <WorkspaceFlipper />
          <div className="w-px h-4 bg-[var(--border-color)]" />
          <SettingsDropdown onToggleTheme={onToggleTheme} themeOpen={themeOpen} />
          <div className="w-px h-4 bg-[var(--border-color)]" />
          <ColumnControls />
        </div>

        <div className="w-px h-4 bg-[var(--border-color)] flex-none" />

        {/* ── CENTER: Log Ticker ── */}
        <LogTicker onClick={onOpenTerminal ?? (() => {})} />

        <div className="w-px h-4 bg-[var(--border-color)] flex-none" />

        {/* ── RIGHT: Miniaturized AI Command ── */}
        <div className="flex items-center gap-1 flex-none">
          {aiOpen ? (
            <div className="flex items-center w-64 h-7 bg-[var(--bg-primary)] border border-[var(--color-primary)] rounded shadow-lg animate-in slide-in-from-right-2 overflow-hidden">
              <div className="w-7 h-full flex items-center justify-center text-[var(--color-primary)] bg-[var(--color-primary)]/10">
                <Sparkles size={12} className="animate-pulse" />
              </div>
              <input
                id="nebula-ai-input"
                autoFocus
                placeholder="Command the engine..."
                className="flex-1 h-full bg-transparent border-none outline-none text-[10px] px-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono"
                onBlur={() => setAiOpen?.(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    alert('Global Command: ' + e.currentTarget.value);
                    setAiOpen?.(false);
                  }
                  if (e.key === 'Escape') setAiOpen?.(false);
                }}
              />
              <button onClick={() => setAiOpen?.(false)} className="px-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAiOpen?.(true)}
              className="group flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all h-7"
            >
              <Sparkles size={11} className="text-[var(--color-primary)]" />
              <span className="text-[9px] font-bold uppercase tracking-wider">AI</span>
              <div className="flex items-center gap-0.5 text-[8px] text-[var(--text-muted)] font-mono bg-[var(--bg-secondary)] px-1 rounded">
                <span>⌘</span><span>K</span>
              </div>
            </button>
          )}

          {activeWorkflow && (
            <div className="hidden sm:flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded px-2 py-0.5">
              <Command size={8} />
              {activeWorkflow}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
