import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Code, Globe, Terminal, Fingerprint, Folder, X, FileText, History, Save, StopCircle, LayoutTemplate, ChevronDown, Plus, Play, Activity, RefreshCcw, Sparkles, Table, Layers } from 'lucide-react';
import { toast } from 'sonner';
import SmartEditor from '../SmartEditor.js';
import { SmartTerminal } from '../SmartTerminal.js';
import { SmartBrowser } from '../SmartBrowser.js';
import { useCardVFS } from '../../hooks/useCardVFS.js';
import { FileExplorer } from '../FileExplorer.js';
import { type CardAgentState } from '../settings/AgentSettings.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { trpc } from '../../utils/trpc.js';
import type { TerminalMessage } from '@repo/common/agent';
import CompactRoleSelector from '../CompactRoleSelector.js';
import { ErrorBoundary } from '../ErrorBoundary.js';
import { AIChat } from '../AIChat.js';
import MonacoDiffEditor from '../MonacoDiffEditor.js';
import { cn } from '../../lib/utils.js';
import { HistoryPanel } from '../HistoryPanel.js';
import { AgentDNAlab } from '../../features/dna-lab/AgentDNAlab.js';
import { UniversalDataGrid } from '../UniversalDataGrid.js';
import { DatabaseBrowser } from '../DatabaseBrowser.js';
import { NebulaBuilder } from '../../nebula/features/builder/NebulaBuilder.js';
import { OpenWebUIDenseChat } from '../cooperative/OpenWebUIDenseChat.js';
import { PropertyPanel } from '../nebula/system/PropertyPanel.js';
import SettingsWorkflow from '../../features/workflows/SettingsWorkflow.jsx';
import ProviderWorkflow from '../../features/workflows/ProviderWorkflow.jsx';
import { ChatCard } from '../apps/ChatCard.js';
import { DocsCard } from '../apps/DocsCard.js';
import { SheetsCard } from '../apps/SheetsCard.js';
import { PromptCard } from '../apps/PromptCard.js';
import { ProjectManagerCard } from '../apps/ProjectManagerCard.js';

/**
 * @file AppCard.tsx
 * @description The standardized chrome-less "Agentic Wrapper" in EVAIX Agentic Spatial Window Manager.
 * Wraps web-native payload nodes with progressive column stacking logic, featuring:
 * - FocusStrip: Localized top header visible when focused.
 * - StackStrip: Backgrounded condensed state visible when column is stacked.
 */

// Helper to get filename from path
const getBasename = (path: string) => path.split('/').pop() || path;

const parseCSV = (csv: string): Record<string, string>[] => {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    result.push(obj);
  }
  return result;
};

const stringifyCSV = (data: Record<string, unknown>[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const headerLine = headers.join(',');
  const rowLines = data.map(row => 
    headers.map(header => String(row[header] ?? '')).join(',')
  );
  return [headerLine, ...rowLines].join('\n');
};

/**
 * FocusStrip — Localized top header of an AppCard (only visible when focused).
 */
export interface FocusStripProps {
  viewMode: string | null;
  availableTools: Array<{ id: string; name: string; icon: any }>;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement>;
  setViewModeAndStore: (mode: any) => void;
  activeFile: string;
  headerFilename: string;
  setHeaderFilename: (fn: string) => void;
  handleSave: (val: string) => void;
  content: string;
  showHistory: boolean;
  setShowHistory: (s: boolean) => void;
  newMenuOpen: boolean;
  setNewMenuOpen: (open: boolean) => void;
  newMenuRef: React.RefObject<HTMLDivElement>;
  mkdir: (dir: string) => Promise<void>;
  getNextAvailableName: (dir: string, baseName: string, ext: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  setActiveFile: (fn: string) => void;
  currentPath: string;
  editorTab: 'editor' | 'chat';
  setEditorTab: (tab: 'editor' | 'chat') => void;
  runAgent: (goal: string, roleIdOverride?: string) => Promise<void>;
  agentConfig: { roleId: string };
  isRunning: boolean;
  showSupplementary: boolean;
  setShowSupplementary: (s: boolean) => void;
  abortController: React.RefObject<AbortController | null>;
  setIsRunning: (r: boolean) => void;
}

export const FocusStrip: React.FC<FocusStripProps> = ({
  viewMode, availableTools, menuOpen, setMenuOpen, menuRef, setViewModeAndStore,
  activeFile, headerFilename, setHeaderFilename, handleSave, content, showHistory,
  setShowHistory, newMenuOpen, setNewMenuOpen, newMenuRef, mkdir, getNextAvailableName,
  writeFile, setActiveFile, currentPath, editorTab, setEditorTab, runAgent, agentConfig,
  isRunning, showSupplementary, setShowSupplementary, abortController, setIsRunning
}) => {
  return (
    <div className="h-9 border-b border-[var(--border-color)] flex items-center px-2 bg-[var(--bg-secondary)] gap-2">
      <div className="relative shrink-0 font-sans" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center justify-center gap-1 px-1.5 h-6 rounded bg-[var(--bg-primary)] hover:bg-zinc-800 text-[var(--text-primary)] border border-[var(--border-color)] transition-all"
          title="Select Tool"
        >
          {(() => {
            const activeTool = availableTools.find(t => t.id === viewMode);
            const IconComp = activeTool?.icon || Folder;
            return <IconComp size={12} className={activeTool ? "text-[var(--color-primary)]" : "text-zinc-500"} />;
          })()}
          <ChevronDown size={8} className="text-zinc-500" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-7 z-50 bg-zinc-900 border border-zinc-700 rounded shadow-xl py-1 flex flex-col gap-0.5 min-w-[36px] items-center p-1">
            {availableTools.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setViewModeAndStore(t.id as any);
                  setMenuOpen(false);
                }}
                title={t.name}
                className={cn(
                  "p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center w-7 h-7 transition-colors",
                  viewMode === t.id && "text-[var(--color-primary)] bg-zinc-800"
                )}
              >
                <t.icon size={13} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center bg-[var(--bg-primary)] rounded-sm border border-[var(--border-color)] px-2 h-6 w-48 shrink-0" title={activeFile}>
        <FileText size={10} className="text-[var(--text-muted)] mr-1.5" />
        <input
          value={headerFilename}
          onChange={(e) => setHeaderFilename(e.target.value)}
          onBlur={() => {
            if (!headerFilename) setHeaderFilename(getBasename(activeFile));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && viewMode) void handleSave(content);
          }}
          className="bg-transparent text-[10px] text-[var(--text-primary)] w-full outline-none font-mono placeholder:text-[var(--text-muted)] truncate"
          placeholder="filename.md"
        />
        <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap ml-1">
          {activeFile.includes('/sessions/') ? '(Session)' : ''}
        </span>
        <button
          onClick={() => viewMode && void handleSave(content)}
          className="p-1 hover:text-[var(--color-primary)] text-[var(--text-muted)] transition-colors"
          title="Save (Ctrl+S)"
          disabled={!viewMode}
        >
          <Save size={10} />
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={cn("p-1 hover:text-[var(--color-primary)] transition-colors", showHistory ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]")}
          title="Version History"
          disabled={!viewMode}
        >
          <History size={10} />
        </button>

        <div className="relative shrink-0 flex items-center font-sans" ref={newMenuRef}>
          <button
            type="button"
            onClick={() => setNewMenuOpen(!newMenuOpen)}
            className="p-1 hover:text-[var(--color-primary)] text-[var(--text-muted)] transition-colors"
            title="Create New File"
          >
            <Plus size={10} />
          </button>
          {newMenuOpen && (
            <div className="absolute right-0 top-6 z-50 bg-zinc-900 border border-zinc-700 rounded shadow-xl py-1 flex flex-col gap-0.5 min-w-[140px] p-1 font-mono text-[9px]">
              <button
                type="button"
                onClick={async () => {
                  setNewMenuOpen(false);
                  const sessionsDir = `${currentPath}/sessions`;
                  try { await mkdir(sessionsDir); } catch(e) {}
                  const newPath = await getNextAvailableName(sessionsDir, 'Document', 'md');
                  await writeFile(newPath, '');
                  setActiveFile(newPath);
                  setViewModeAndStore('editor');
                  toast.success(`Created Document: ${getBasename(newPath)}`);
                }}
                className="w-full text-left px-2 py-1 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded"
              >
                New Document (.md)
              </button>
              <button
                type="button"
                onClick={async () => {
                  setNewMenuOpen(false);
                  const sessionsDir = `${currentPath}/sessions`;
                  try { await mkdir(sessionsDir); } catch(e) {}
                  const newPath = await getNextAvailableName(sessionsDir, 'DataGrid', 'json');
                  const initialData = JSON.stringify([{ "Column1": "", "Column2": "" }], null, 2);
                  await writeFile(newPath, initialData);
                  setActiveFile(newPath);
                  setViewModeAndStore('data');
                  toast.success(`Created Data Grid: ${getBasename(newPath)}`);
                }}
                className="w-full text-left px-2 py-1 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded"
              >
                New Data Grid (.json)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center gap-1.5 px-2">
        {viewMode === 'editor' && (
          <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded p-0.5">
            <button 
              onClick={() => setEditorTab('editor')} 
              className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-colors", editorTab === 'editor' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
              title="Editor Mode"
            >
              Editor
            </button>
            <button 
              onClick={() => setEditorTab('chat')} 
              className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-colors", editorTab === 'chat' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
              title="AI Chat Mode"
            >
              AI Chat
            </button>
          </div>
        )}
        
        <button
          onClick={() => void runAgent("Analyze this document and continue.", agentConfig.roleId)}
          disabled={isRunning}
          title="Run Agent"
          className="flex items-center gap-1 px-2 h-6 text-[10px] font-bold rounded bg-[var(--color-primary)] text-black hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
        >
          <Play size={10} fill="currentColor" />
          Run Agent
        </button>
      </div>

      <div className="flex gap-0.5 shrink-0">
        <button
          onClick={() => setShowSupplementary(!showSupplementary)}
          className={cn(
            "p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)]",
            showSupplementary && "text-orange-500 bg-[var(--bg-primary)]"
          )}
          title="Toggle Supplementary Liaison (Worker)"
        >
          <Activity size={12} />
        </button>
        {isRunning && (
          <button
            onClick={() => {
              abortController.current?.abort();
              setIsRunning(false);
            }}
            className="p-1 text-red-500 hover:text-red-400 rounded"
            title="Stop Agent Run"
          >
            <StopCircle size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * StackStrip — Backgrounded state of an AppCard (visible when column is stacked).
 */
export interface StackStripProps {
  id: string;
  viewMode: string | null;
  onFocus?: () => void;
}

export const StackStrip: React.FC<StackStripProps> = ({ id, viewMode, onFocus }) => {
  return (
    <div 
      onClick={onFocus}
      className="h-7 bg-zinc-900/90 hover:bg-zinc-800 border-b border-zinc-800 px-3 flex items-center justify-between cursor-pointer transition-colors font-mono text-xs select-none shrink-0"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider truncate">
          {viewMode ? viewMode.toUpperCase() : 'APP CARD'}
        </span>
        <span className="text-[9px] text-zinc-600 truncate">[{id.slice(0, 6)}]</span>
      </div>
      <span className="text-[9px] text-indigo-400 font-bold uppercase hover:underline">Focus 🗁</span>
    </div>
  );
};

export interface AppCardProps {
  id: string;
  isFocused?: boolean;
  isCondensed?: boolean;
  isHiddenInTabs?: boolean;
  onFocus?: () => void;
}

export const AppCard = memo(({ id, isFocused: _isFocused = true, isCondensed = false, isHiddenInTabs: _isHiddenInTabs = false, onFocus }: AppCardProps) => {
    const {
        currentPath, navigateTo, readFile, writeFile, mkdir,
        files, refresh, createNode, ingestDirectory,
        loadChildren
    } = useCardVFS(id);

    const card = useWorkspaceStore(s => s.cards.find(c => c.id === id));
    const updateCard = useWorkspaceStore(s => s.updateCard);
    const activeWorkspacePath = useWorkspaceStore(s => s.activeWorkspacePath) || '';

    const availableTools = useMemo(() => {
        return [
            { id: 'chat', name: 'Gemini Chat', icon: Sparkles },
            { id: 'docs', name: 'Google Docs', icon: FileText },
            { id: 'sheets', name: 'Sheets Grid', icon: Table },
            { id: 'prompt', name: 'Prompt Studio', icon: Terminal },
            { id: 'project-manager', name: 'Project Tree', icon: Layers },
            { id: 'files', name: 'Files Explorer', icon: Folder },
            { id: 'browser', name: 'Native Browser', icon: Globe },
            { id: 'editor', name: 'Code Editor', icon: Code },
            { id: 'dna-lab', name: 'Agent DNA Lab', icon: Fingerprint }
        ];
    }, []);

    const startSessionMutation = trpc.agent.startSession.useMutation();

    const agentConfig = useMemo(() => {
        const meta = card?.metadata as { agentConfig?: CardAgentState } | undefined;
        return meta?.agentConfig || {
            roleId: card?.roleId || '',
            modelId: null,
            isLocked: false,
            temperature: 0.7,
            maxTokens: 2048
        };
    }, [card]);

    const [activeFile, setActiveFile] = useState<string>(() => {
        const meta = card?.metadata as { activeFile?: string } | undefined;
        return meta?.activeFile || '';
    });

    const [browserUrl, setBrowserUrl] = useState(() => {
        const meta = card?.metadata as { url?: string } | undefined;
        return meta?.url || "https://google.com";
    });

    const [content, setContent] = useState<string>('');
    
    type ViewMode = 'chat' | 'docs' | 'sheets' | 'prompt' | 'project-manager' | 'editor' | 'diff' | 'terminal' | 'browser' | 'files' | 'dna-lab' | 'preview' | 'data' | 'databrowser' | 'builder' | 'badbuilder' | 'ai-chat' | 'property-panel' | 'settings' | 'provider' | null;
    
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (card?.activeTool === null) return 'chat';
        if (card?.activeTool) {
            if (card.activeTool === 'config' || card.activeTool === 'settings') return 'dna-lab';
            return card.activeTool as ViewMode;
        }
        const meta = card?.metadata as { viewMode?: string } | undefined;
        const mode = meta?.viewMode;
        return (mode as ViewMode) || 'chat';
    });

    const setViewModeAndStore = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        updateCard(id, { 
            activeTool: mode,
            metadata: {
                ...(useWorkspaceStore.getState().cards.find(c => c.id === id)?.metadata || {}),
                viewMode: mode || undefined
            }
        });
    }, [id, updateCard]);

    useEffect(() => {
        if (!viewMode) {
            setViewModeAndStore('editor');
        }
    }, [viewMode, setViewModeAndStore]);

    const [terminalLogs, setTerminalLogs] = useState<TerminalMessage[]>([]);
    const [sessionId] = useState(() => `session-${id}-${Date.now()}`);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [headerFilename, setHeaderFilename] = useState('');
    const [editorTab, setEditorTab] = useState<'editor' | 'chat'>('editor');
    const [showHistory, setShowHistory] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState('');
    const [showSupplementary, setShowSupplementary] = useState(false);
    const [supplementaryLogs, setSupplementaryLogs] = useState<TerminalMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const abortController = useRef<AbortController | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [newMenuOpen, setNewMenuOpen] = useState(false);
    const newMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    useEffect(() => {
        if (!newMenuOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
                setNewMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [newMenuOpen]);

    useEffect(() => {
        if (activeFile) setHeaderFilename(getBasename(activeFile));
    }, [activeFile]);

    useEffect(() => {
        const currentCard = useWorkspaceStore.getState().cards.find(c => c.id === id);
        updateCard(id, {
            metadata: {
                ...(currentCard?.metadata || {}),
                activeFile,
                url: browserUrl
            }
        });
    }, [activeFile, browserUrl, id, updateCard]);

    const getNextAvailableName = useCallback(async (dir: string, baseName: string, ext: string) => {
        let index = 1;
        while (true) {
            const name = `${baseName}_${index}.${ext}`;
            const fullPath = `${dir}/${name}`;
            try {
                await readFile(fullPath);
            } catch (err: any) {
                return fullPath;
            }
            index++;
            if (index > 100) return `${dir}/${baseName}_${Date.now()}.${ext}`;
        }
    }, [readFile]);

    useEffect(() => {
        if (activeFile && (activeFile.includes('/.nebula/sessions/') || activeFile.includes('/chat/') || activeFile.includes('/chats/'))) {
            const basename = getBasename(activeFile);
            const migratedPath = `${currentPath}/sessions/${basename}`;
            setActiveFile(migratedPath);
            return;
        }

        if (activeFile && activeFile.includes('/sessions/') && !getBasename(activeFile).startsWith('card-')) {
            const migratedPath = `${currentPath}/sessions/card-${id}.md`;
            setActiveFile(migratedPath);
            return;
        }

        if (!activeFile && viewMode === 'editor') {
            const sessionsDir = `${currentPath}/sessions`;
            const autoCreate = async () => {
                try { await mkdir(sessionsDir); } catch (e) {}
                try {
                    const filePath = await getNextAvailableName(sessionsDir, 'Document', 'md');
                    await writeFile(filePath, '');
                    setActiveFile(filePath);
                } catch (e) {
                    console.error('Failed to auto create session file', e);
                }
            };
            void autoCreate();
        }
    }, [activeFile, viewMode, id, currentPath, writeFile, mkdir, readFile, getNextAvailableName]);

    useEffect(() => {
        if (activeFile) {
            if (activeFile.startsWith('http')) {
                setBrowserUrl(prev => prev === activeFile ? prev : activeFile);
                setViewModeAndStore('browser');
            } else if (/\.(png|jpg|jpeg|gif|svg|html)$/i.test(activeFile)) {
                setBrowserUrl(`file://${activeFile}`);
                setViewModeAndStore('browser');
            } else if (/\.(json|csv)$/i.test(activeFile)) {
                setViewModeAndStore('data');
                void readFile(activeFile)
                    .then(setContent)
                    .catch(async (err: any) => {
                        if (err.message?.includes('ENOENT')) {
                            const defaultData = activeFile.endsWith('.csv') ? 'Column1,Column2\n,' : '[]';
                            await writeFile(activeFile, defaultData);
                            setContent(defaultData);
                        } else {
                            setContent('[]');
                        }
                    });
            } else {
                void readFile(activeFile)
                    .then(setContent)
                    .catch(async (err: any) => {
                        if (err.message?.includes('ENOENT') && activeFile.includes('/sessions/')) {
                            await writeFile(activeFile, '');
                            setContent('');
                        } else {
                            setContent('');
                        }
                    });
            }
        }
    }, [activeFile, readFile, writeFile, setViewModeAndStore]);

    const handleSave = useCallback(async (val: string | undefined) => {
        if (val === undefined) return;
        setContent(val);
        if (!activeFile) return;

        const dir = activeFile.substring(0, activeFile.lastIndexOf('/'));
        const targetPath = headerFilename ? `${dir}/${headerFilename}` : activeFile;

        try {
            await writeFile(targetPath, val);
            if (targetPath !== activeFile) {
                setActiveFile(targetPath);
                toast.success(`Renamed to ${headerFilename}`);
            }
        } catch (err) {
            toast.error("Failed to save", { description: (err as Error).message });
            return;
        }

        if (/\.(md|txt)$/i.test(targetPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const versionFilename = `${getBasename(targetPath)}.${timestamp}.md`;
            const versionPath = `/home/guy/nebula-docs-versions/${versionFilename}`;
            void writeFile(versionPath, val).catch(() => { });
        }

        const backupPath = `${currentPath}/.nebula/backups/${getBasename(targetPath)}.bak`;
        void writeFile(backupPath, val).catch(() => { });
    }, [activeFile, writeFile, currentPath, headerFilename]);

    const gridData = useMemo(() => {
        if (!content) return [];
        if (activeFile.endsWith('.csv')) {
            return parseCSV(content);
        }
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) return parsed;
            return [];
        } catch (e) {
            return [];
        }
    }, [content, activeFile]);

    const handleGridChange = useCallback((newData: Record<string, unknown>[]) => {
        let serialized = '';
        if (activeFile.endsWith('.csv')) {
            serialized = stringifyCSV(newData);
        } else {
            serialized = JSON.stringify(newData, null, 2);
        }
        void handleSave(serialized);
    }, [activeFile, handleSave]);

    const runAgent = useCallback(async (goal: string, roleIdOverride?: string) => {
        if (isRunning) return;
        const effectiveRoleId = roleIdOverride || agentConfig.roleId;
        if (!effectiveRoleId) {
            toast.error("Role Required", { description: "Select a role first." });
            setViewModeAndStore('dna-lab');
            return;
        }

        setIsRunning(true);
        abortController.current = new AbortController();
        toast.loading("Running Agent...", { id: 'agent-run' });

        try {
            const isCollab = (card?.metadata as any)?.collabMode || false;
            const input = {
                cardId: id,
                userGoal: goal,
                roleId: effectiveRoleId,
                sessionId,
                modelConfig: {
                    modelId: agentConfig.modelId || undefined,
                    temperature: agentConfig.temperature,
                    maxTokens: agentConfig.maxTokens
                },
                context: { 
                    targetDir: currentPath,
                    collabMode: isCollab
                }
            };
            const session = await startSessionMutation.mutateAsync(input, { signal: abortController.current.signal } as any);
            toast.success("Done", { id: 'agent-run' });
            if (session.logs) {
                setTerminalLogs(p => [...p, ...session.logs.map((l: string) => ({ message: l, type: 'info', timestamp: new Date().toISOString() } as TerminalMessage))]);
            }
            if (activeFile) {
                void refresh().then(() => readFile(activeFile)).then(setContent).catch(() => { });
            }
            setViewModeAndStore('terminal');
        } catch (err: any) {
            if (err.name === 'AbortError') {
                toast.info("Run cancelled", { id: 'agent-run' });
            } else {
                const msg = err.message;
                if (msg.includes('Watchdog') || msg.includes('timeout') || msg.includes('429')) {
                    setIsRecovering(true);
                    setRecoveryStep('OODA: OBSERVING FAILURE -> ORIENTING TO FALLBACK');
                    setTimeout(() => setRecoveryStep('OODA: DECIDING ON RECOVERY PATH -> ACTING: RETRYING WITH NPX/FALLBACK'), 1500);
                }
                toast.error("Failed", { id: 'agent-run', description: msg });
            }
        } finally {
            setIsRunning(false);
            abortController.current = null;
        }
    }, [id, agentConfig, startSessionMutation, currentPath, sessionId, isRunning, activeFile, readFile, refresh, setViewModeAndStore, card?.metadata]);

    if (isCondensed) {
        return <StackStrip id={id} viewMode={viewMode} onFocus={onFocus} />;
    }

    return (
        <div className="flex h-full w-full rounded-none border-0 bg-[var(--bg-secondary)] overflow-hidden relative flex-col">
            <FocusStrip
                viewMode={viewMode}
                availableTools={availableTools}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                menuRef={menuRef}
                setViewModeAndStore={setViewModeAndStore}
                activeFile={activeFile}
                headerFilename={headerFilename}
                setHeaderFilename={setHeaderFilename}
                handleSave={handleSave}
                content={content}
                showHistory={showHistory}
                setShowHistory={setShowHistory}
                newMenuOpen={newMenuOpen}
                setNewMenuOpen={setNewMenuOpen}
                newMenuRef={newMenuRef}
                mkdir={mkdir}
                getNextAvailableName={getNextAvailableName}
                writeFile={writeFile}
                setActiveFile={setActiveFile}
                currentPath={currentPath}
                editorTab={editorTab}
                setEditorTab={setEditorTab}
                runAgent={runAgent}
                agentConfig={agentConfig}
                isRunning={isRunning}
                showSupplementary={showSupplementary}
                setShowSupplementary={setShowSupplementary}
                abortController={abortController}
                setIsRunning={setIsRunning}
            />

            <div className="flex-1 flex overflow-hidden relative select-text">
                <div
                    className={cn(
                        "flex-1 min-h-0 overflow-hidden relative",
                        "bg-[var(--color-background)]"
                    )}
                >
                    <ErrorBoundary>
                        {viewMode === null && (
                            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900/40 backdrop-blur-sm">
                                <LayoutTemplate size={32} className="text-zinc-600 mb-3 animate-pulse" />
                                <span className="text-xs font-semibold text-zinc-400 mb-1">Card Tool Unselected</span>
                                <span className="text-[10px] text-zinc-500 font-mono">Select a tool from the header dropdown to begin</span>
                            </div>
                        )}

                        {viewMode === 'editor' && (
                            <SmartEditor
                                cardId={id}
                                fileName={activeFile}
                                content={content}
                                onChange={(val) => void handleSave(val)}
                                onRun={(goal, roleId) => void runAgent(goal || content, roleId)}
                                roleId={agentConfig.roleId}
                                onRoleChange={(roleId) => updateCard(id, { roleId: roleId })}
                                onNavigate={(url) => {
                                    setBrowserUrl(url);
                                    setViewModeAndStore('browser');
                                }}
                                activeTab={editorTab}
                                onTabChange={setEditorTab}
                            />
                        )}
                        {showHistory && (
                            <HistoryPanel
                                activeFile={activeFile}
                                onRestore={(content) => {
                                    setContent(content);
                                    void writeFile(activeFile, content);
                                }}
                                onClose={() => setShowHistory(false)}
                            />
                        )}
                        {viewMode === 'diff' && (
                            <div className="h-full w-full flex flex-col">
                                <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between">
                                    <span className="text-xs font-bold text-zinc-400">Diff View: {getBasename(activeFile)}</span>
                                    <button onClick={() => setViewModeAndStore('editor')} className="text-[10px] text-blue-400 hover:underline">Close Diff</button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <MonacoDiffEditor
                                        original={`// Previous version\n${content}`}
                                        modified={content + '\n// New changes'}
                                        language="typescript"
                                    />
                                </div>
                            </div>
                        )}
                        {viewMode === 'files' && <FileExplorer
                            files={files}
                            currentPath={currentPath}
                            onNavigate={(p) => void navigateTo(p)}
                            onSelect={(p) => { setActiveFile(p); if (!p.endsWith('/')) setViewModeAndStore('editor'); }}
                            onCreateNode={(t, n) => void createNode(t, n)}
                            onRefresh={() => void refresh()}
                            onEmbedDir={(p) => void ingestDirectory(p)}
                            onLoadChildren={loadChildren}
                            className="p-2"
                            activeContent={content}
                            onSaveContent={(path, text) => {
                                void (async () => {
                                    await writeFile(path, text);
                                    toast.success("Saved content to " + getBasename(path));
                                    setActiveFile(path);
                                    setViewModeAndStore('editor');
                                })();
                            }}
                        />}
                        {viewMode === 'terminal' && <SmartTerminal workingDirectory={currentPath} logs={terminalLogs} onInput={(msg) => void runAgent(msg)} />}
                        {viewMode === 'ai-chat' && (
                            <AIChat
                                logs={terminalLogs}
                                onInput={(msg) => void runAgent(msg)}
                                isRunning={isRunning}
                            />
                        )}
                        {viewMode === 'browser' && <SmartBrowser cardId={id} url={browserUrl} onUrlChange={setBrowserUrl} />}
                        {viewMode === 'chat' && <OpenWebUIDenseChat />}
                        {viewMode === 'dna-lab' && <AgentDNAlab embeddedMode roleId={agentConfig.roleId} onRoleChange={(roleId) => updateCard(id, { roleId: roleId })} />}
                        {viewMode === 'preview' && <iframe src="http://localhost:8000" className="w-full h-full border-none bg-white" />}
                        {viewMode === 'badbuilder' && (
                            <iframe
                                src={`http://localhost:4000/badbuilder/index.html?workspace=${encodeURIComponent(activeWorkspacePath)}`}
                                className="w-full h-full border-none bg-zinc-950"
                            />
                        )}
                        {viewMode === 'data' && (
                            <div className="h-full w-full bg-zinc-950 p-2">
                                <UniversalDataGrid 
                                    data={gridData} 
                                    onChange={handleGridChange}
                                    onCreateTable={async () => {
                                        const sessionsDir = `${currentPath}/sessions`;
                                        try { await mkdir(sessionsDir); } catch(e) {}
                                        const newPath = await getNextAvailableName(sessionsDir, 'DataGrid', 'json');
                                        const initialData = JSON.stringify([{ "Column1": "", "Column2": "" }], null, 2);
                                        await writeFile(newPath, initialData);
                                        setActiveFile(newPath);
                                        setContent(initialData);
                                    }}
                                />
                            </div>
                        )}
                        {viewMode === 'databrowser' && <DatabaseBrowser id={id} />}
                        {viewMode === 'builder' && (
                            <NebulaBuilder
                                initialTree={{
                                    rootId: 'root',
                                    nodes: {
                                        root: { id: 'root', type: 'Box', props: {}, children: [] }
                                    },
                                    imports: [],
                                    exports: [],
                                    version: 1
                                }}
                                onSave={(newTree) => {
                                    console.log('Saved card tree:', newTree);
                                    toast.success("Nebula Tree updated");
                                }}
                            />
                        )}
                        {viewMode === 'chat' && <ChatCard />}
                        {viewMode === 'docs' && <DocsCard />}
                        {viewMode === 'sheets' && <SheetsCard />}
                        {viewMode === 'prompt' && <PromptCard />}
                        {viewMode === 'project-manager' && <ProjectManagerCard />}
                        {viewMode === 'property-panel' && <PropertyPanel />}
                        {viewMode === 'settings' && <SettingsWorkflow />}
                        {viewMode === 'provider' && <ProviderWorkflow />}
                    </ErrorBoundary>

                    {showSupplementary && (
                        <div className="absolute right-0 top-0 bottom-0 w-[30%] min-w-[200px] border-l border-[var(--border-color)] bg-zinc-950 flex flex-col z-[40] animate-in slide-in-from-right duration-300">
                            <div className="h-8 border-b border-zinc-900 bg-zinc-900/50 flex items-center px-4 justify-between">
                                <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Worker Liaison</span>
                                <button onClick={() => setShowSupplementary(false)} className="hover:text-white text-zinc-600"><X size={10} /></button>
                            </div>
                            <div className="flex-1 min-h-0 bg-black/40">
                                <SmartTerminal
                                    workingDirectory={currentPath}
                                    logs={supplementaryLogs}
                                    onInput={(msg) => {
                                        setSupplementaryLogs(p => [...p, { message: `Queuing: ${msg}`, type: 'info', timestamp: new Date().toISOString() } as TerminalMessage]);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {showRolePicker && (
                        <div className="absolute top-9 right-2 w-72 h-[350px] bg-zinc-950 border border-zinc-800 z-50 shadow-2xl rounded-lg animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                            <div className="flex items-center justify-between p-2.5 border-b border-zinc-800 bg-zinc-900/50 rounded-t-lg">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-1.5 px-0.5">
                                    <Fingerprint size={12} className="text-blue-500" />
                                    Role Selector
                                </span>
                                <button onClick={() => setShowRolePicker(false)} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-all">
                                    <X size={12} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <CompactRoleSelector
                                    selectedRoleId={card?.roleId || ''}
                                    onSelect={(roleId) => {
                                        updateCard(id, { roleId: roleId });
                                        setShowRolePicker(false);
                                    }}
                                    onEdit={(roleId) => {
                                        updateCard(id, { roleId: roleId });
                                        setShowRolePicker(false);
                                        setViewModeAndStore('dna-lab');
                                    }}
                                    className="border-none"
                                />
                            </div>
                        </div>
                    )}

                    {isRecovering && (
                        <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 animate-pulse border border-orange-500/50">
                                <Activity className="text-orange-500" size={32} />
                            </div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Autonomic Recovery Active</h2>
                            <div className="bg-zinc-900 border border-zinc-800 rounded px-4 py-2 mb-6">
                                <span className="text-[10px] font-mono text-orange-400 animate-pulse">{recoveryStep}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsRecovering(false)}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => void runAgent("Retry the last failed command.", agentConfig.roleId)}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                                >
                                    <RefreshCcw size={12} />
                                    Force Retry
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

AppCard.displayName = 'AppCard';

// Backward compatibility export
export const SwappableCard = AppCard;
