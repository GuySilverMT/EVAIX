import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Globe, Terminal, Fingerprint, Folder, X, FileText, History, Save, StopCircle, LayoutTemplate, Database, ChevronDown, Settings, Plus } from 'lucide-react';
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
import { RefreshCcw, Activity } from 'lucide-react';
import { AgentDNAlab } from '../../features/dna-lab/AgentDNAlab.js';
import { UniversalDataGrid } from '../UniversalDataGrid.js';
import { DatabaseBrowser } from '../DatabaseBrowser.js';
import { NebulaBuilder } from '../../nebula/features/builder/NebulaBuilder.js';

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

export const SwappableCard = memo(({ id }: { id: string }) => {
    const {
        currentPath, navigateTo, readFile, writeFile, mkdir,
        files, refresh, createNode, ingestDirectory,
        loadChildren
    } = useCardVFS(id);

    const card = useWorkspaceStore(s => s.cards.find(c => c.id === id));
    const updateCard = useWorkspaceStore(s => s.updateCard);
    const activeWorkspacePath = useWorkspaceStore(s => s.activeWorkspacePath) || '';
    const projectType = useWorkspaceStore(s => s.projectType);
    const navigate = useNavigate();

    const availableTools = useMemo(() => {
        const baseTools = [
            { id: 'editor', name: 'Editor', icon: Code },
            { id: 'browser', name: 'Native Browser', icon: Globe },
            { id: 'files', name: 'Files', icon: Folder },
            { id: 'data', name: 'Data', icon: Database },
            { id: 'settings', name: 'Settings', icon: Settings }
        ];

        if (projectType === 'coding') {
            baseTools.push({ id: 'terminal', name: 'Terminal', icon: Terminal });
            baseTools.push({ id: 'badbuilder', name: 'BadBuilder', icon: LayoutTemplate });
        }

        return baseTools;
    }, [projectType]);


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
    const [viewMode, setViewMode] = useState<'editor' | 'diff' | 'terminal' | 'browser' | 'files' | 'config' | 'settings' | 'dna-lab' | 'preview' | 'data' | 'databrowser' | 'builder' | 'BadBuilder' | 'badbuilder' | 'ai-chat' | null>(() => {
        if (card?.activeTool === null) return 'editor';
        if (card?.activeTool) {
            if (card.activeTool === 'config') return 'settings';
            if (card.activeTool === 'BadBuilder') return 'badbuilder';
            return card.activeTool as any;
        }
        const meta = card?.metadata as { viewMode?: string } | undefined;
        const mode = meta?.viewMode;
        if (mode === 'config') return 'settings';
        if (mode === 'BadBuilder') return 'badbuilder';
        return (mode as any) || 'editor';
    });

    const setViewModeAndStore = useCallback((mode: typeof viewMode) => {
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

    // Close menu when clicking outside
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

    // Close new menu when clicking outside
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

    // Sync header filename with active file
    useEffect(() => {
        if (activeFile) setHeaderFilename(getBasename(activeFile));
    }, [activeFile]);

    // Persistence
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


    // 🟢 GOOD: Robust Default File Creation (No Crashes)
    useEffect(() => {
        // [PATH MIGRATION] If activeFile is pointing to hidden .nebula or chat folders, move it to sessions.
        if (activeFile && (activeFile.includes('/.nebula/sessions/') || activeFile.includes('/chat/') || activeFile.includes('/chats/'))) {
            const basename = getBasename(activeFile);
            const migratedPath = `${currentPath}/sessions/${basename}`;
            console.log(`[VFS] Migrating stale path: ${activeFile} -> ${migratedPath}`);
            setActiveFile(migratedPath);
            return;
        }

        // [PATH FIX] Ensure card-id prefix for session files
        if (activeFile && activeFile.includes('/sessions/') && !getBasename(activeFile).startsWith('card-')) {
            const migratedPath = `${currentPath}/sessions/card-${id}.md`;
            console.log(`[VFS] Fixing malformed session path: ${activeFile} -> ${migratedPath}`);
            setActiveFile(migratedPath);
            return;
        }

        const getNextAvailableName = async (dir: string, baseName: string, ext: string) => {
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
        };

        if (!activeFile && viewMode === 'editor') {
            const sessionsDir = `${currentPath}/sessions`;
            const autoCreate = async () => {
                try {
                    await mkdir(sessionsDir);
                } catch (e) {
                    // Ignore
                }
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
    }, [activeFile, viewMode, id, currentPath, writeFile, mkdir, readFile]);

    // Auto-switch view logic & Error Handling for Missing Files
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
                        // If file is missing (ENOENT), and it's a session file, create it!
                        if (err.message?.includes('ENOENT') && activeFile.includes('/sessions/')) {
                            console.warn(`[VFS] File missing, auto-creating: ${activeFile}`);
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

        // Determine target path
        const dir = activeFile.substring(0, activeFile.lastIndexOf('/'));
        const targetPath = headerFilename ? `${dir}/${headerFilename}` : activeFile;

        // Main Save
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

        // 🟢 Versioning (External)
        // Only for documents (.md, .txt)
        if (/\.(md|txt)$/i.test(targetPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const versionFilename = `${getBasename(targetPath)}.${timestamp}.md`;
            const versionPath = `/home/guy/nebula-docs-versions/${versionFilename}`;

            // Fire-and-forget version save
            void writeFile(versionPath, val).catch(() => { /* Silent fail on versioning is ok */ });
        }

        // Legacy Backup (Optional, keeping for safety)
        const backupPath = `${currentPath}/.nebula/backups/${getBasename(targetPath)}.bak`;
        void writeFile(backupPath, val).catch(() => { });
    }, [activeFile, writeFile, currentPath, headerFilename]);

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
            setViewModeAndStore('config');
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
            // Auto-refresh content after agent run
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
    }, [id, agentConfig, startSessionMutation, currentPath, sessionId, isRunning, activeFile, readFile, refresh]);

    return (
        <div className="flex h-full w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden relative flex-col">

            {/* 1. Header with Clean Filename Display */}
            <div className="h-9 border-b border-[var(--border-color)] flex items-center px-2 bg-[var(--bg-secondary)] gap-2">
                {/* Custom Tool Icon Dropdown */}
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

                <div className="flex-1 flex items-center bg-[var(--bg-primary)] rounded-sm border border-[var(--border-color)] px-2 h-6" title={activeFile}>
                    <FileText size={10} className="text-[var(--text-muted)] mr-1.5" />
                    <input
                        value={headerFilename}
                        onChange={(e) => setHeaderFilename(e.target.value)}
                        onBlur={() => {
                            // If user cleared it, revert to current basename
                            if (!headerFilename) setHeaderFilename(getBasename(activeFile));
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && viewMode) void handleSave(content);
                        }}
                        className="bg-transparent text-[10px] text-[var(--text-primary)] w-full outline-none font-mono placeholder:text-[var(--text-muted)]"
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

                <div className="flex gap-0.5">
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

            {/* 2. Content Split */}
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

                        {(viewMode === 'config' || viewMode === 'settings') && (
                            <div className="h-full flex items-center justify-center p-8 text-center bg-zinc-900/50 backdrop-blur-sm">
                                <div className="max-w-xs space-y-4">
                                    <Fingerprint size={48} className="mx-auto text-[var(--color-primary)] opacity-50" />
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Redirecting to DNA Lab</h3>
                                    <p className="text-[10px] text-[var(--text-muted)]">Deep role configuration is now handled in the centralized Agent DNA Lab for a superior editing experience.</p>
                                    <button
                                        onClick={() => navigate(`/org-structure?roleId=${card?.roleId}`)}
                                        className="w-full bg-[var(--color-primary)] text-white py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                                    >
                                        Open DNA Lab
                                    </button>
                                </div>
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
                            />
                        )}
                        {showHistory && (
                            <HistoryPanel
                                activeFile={activeFile}
                                onRestore={(content) => {
                                    setContent(content);
                                    void writeFile(activeFile, content); // Save restored content immediately
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
                        {viewMode === 'browser' && <SmartBrowser cardId={id} screenspaceId={card?.screenspaceId || 1} url={browserUrl} onUrlChange={setBrowserUrl} />}
                        {viewMode === 'dna-lab' && <AgentDNAlab embeddedMode roleId={agentConfig.roleId} onRoleChange={(roleId) => updateCard(id, { roleId: roleId })} />}
                        {viewMode === 'preview' && <iframe src="http://localhost:8000" className="w-full h-full border-none bg-white" />}
                        {(viewMode === 'BadBuilder' || viewMode === 'badbuilder') && (
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
                    </ErrorBoundary>

                    {/* [NEW] SupplementaryAgentSlot */}
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
                                        // Worker logic: Start a separate session or delegate
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
                </div> {/* End Main Content Area */}
            </div> {/* End Content Split */}
        </div>
    );
});
SwappableCard.displayName = 'SwappableCard';