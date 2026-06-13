import React, { useEffect, useState, useMemo, useRef, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useHotkeys } from '../hooks/useHotkeys.js';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { useBuilderStore } from '../stores/builder.store.js';
import layoutData from '../../../badbuilder/agentworkbench.layout.json';
import { useColumnFocus } from '../hooks/useColumnFocus.js';
import { Button } from '../components/ui/button.js';
import { cn } from '../lib/utils.js';
import { trpc } from '../utils/trpc.js';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Workflow components
// ─────────────────────────────────────────────────────────────────────────────
const ProviderWorkflow  = lazy(() => import('../features/workflows/ProviderWorkflow.jsx'));
const OrgWorkflow       = lazy(() => import('../features/workflows/OrgWorkflow.jsx'));
const DatacenterWorkflow= lazy(() => import('../features/workflows/DatacenterWorkflow.jsx'));
const SettingsWorkflow  = lazy(() => import('../features/workflows/SettingsWorkflow.jsx'));
const VoiceWorkflow     = lazy(() => import('../features/workflows/VoiceWorkflow.jsx'));

// ─────────────────────────────────────────────────────────────────────────────
import { AgentWorkbenchScaffold } from '../components/cooperative/AgentWorkbenchScaffold.js';

// ─────────────────────────────────────────────────────────────────────────────
// Workflow → Component mapping
// ─────────────────────────────────────────────────────────────────────────────
const WORKFLOW_COMPONENTS: Record<string, React.ComponentType> = {
  provider:   ProviderWorkflow,
  org:        OrgWorkflow,
  datacenter: DatacenterWorkflow,
  settings:   SettingsWorkflow,
  voice:      VoiceWorkflow,
};

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowSuspenseFallback
// ─────────────────────────────────────────────────────────────────────────────
function WorkflowFallback({ name }: { name: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center flex-col gap-3 bg-zinc-950">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        Loading {name} Workflow…
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentWorkbench — main entry point
// ─────────────────────────────────────────────────────────────────────────────
export default function AgentWorkbench({ className }: { className?: string }) {
  const { id } = useParams<{ id: string }>();
  const decodedPath = useMemo(() => id ? decodeURIComponent(id) : null, [id]);

  const {
    setCards, addCard,
    activeWorkspace, activeScreenspaceId, loadWorkspace,
    activeWorkflow,
    setActiveWorkspaceId, setProjectType, setProjectName, projectType, activeWorkspaceId, cards,
    columns, setColumns
  } = useWorkspaceStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // Load project configuration from local file system
  const vfsReadQuery = trpc.vfs.read.useQuery(
    { path: decodedPath ? `${decodedPath}/.evaix/project.json` : '' },
    { enabled: !!decodedPath }
  );

  useEffect(() => {
    if (decodedPath && decodedPath !== activeWorkspaceId) {
      setActiveWorkspaceId(decodedPath);
    }
  }, [decodedPath, activeWorkspaceId, setActiveWorkspaceId]);

  useEffect(() => {
    if (vfsReadQuery.data?.content) {
      try {
        const config = JSON.parse(vfsReadQuery.data.content);
        
        let layoutColumns = config.layout?.columns;
        if (!layoutColumns && Array.isArray(config.cards) && config.cards.length > 0) {
          const colsCount = config.columns || 3;
          layoutColumns = Array.from({ length: colsCount }).map((_, colIndex) => {
            const colCards = config.cards.filter((c: any) => c.column === colIndex);
            return {
              id: `col-${colIndex + 1}`,
              cards: colCards.map((c: any) => ({
                id: c.id,
                roleId: c.roleId || '',
                activeTool: c.activeTool !== undefined ? c.activeTool : (c.metadata?.viewMode || null),
                metadata: c.metadata
              }))
            };
          });
        }

        if (!layoutColumns || !Array.isArray(layoutColumns) || layoutColumns.length === 0) {
          layoutColumns = [
            {
              id: 'col-1',
              cards: [
                {
                  id: 'card-1',
                  roleId: '',
                  activeTool: null
                }
              ]
            }
          ];
        }

        const parsedCards: CardData[] = [];
        layoutColumns.forEach((col: any, colIndex: number) => {
          if (Array.isArray(col.cards)) {
            col.cards.forEach((c: any) => {
              parsedCards.push({
                id: c.id,
                roleId: c.roleId || '',
                column: colIndex,
                screenspaceId: c.screenspaceId || activeScreenspaceId,
                activeTool: c.activeTool !== undefined ? c.activeTool : (c.metadata?.viewMode || null),
                metadata: {
                  ...c.metadata,
                  viewMode: c.metadata?.viewMode || c.activeTool || undefined
                }
              });
            });
          }
        });

        if (config.projectType) setProjectType(config.projectType);
        if (config.name) setProjectName(config.name);
        setColumns(layoutColumns.length);
        setCards(parsedCards);
      } catch (e) {
        console.error("Failed to parse project.json from VFS", e);
      }
    }
  }, [vfsReadQuery.data?.content, setProjectType, setProjectName, setColumns, setCards, activeScreenspaceId]);

  // Debounced Save project state to project.json
  const vfsWriteMutation = trpc.vfs.write.useMutation();
  const serializedState = useMemo(() => {
    if (!activeWorkspaceId || !projectType) return null;
    
    const layoutColumns = Array.from({ length: columns }).map((_, colIndex) => {
      const colCards = cards.filter(c => c.column === colIndex);
      return {
        id: `col-${colIndex + 1}`,
        cards: colCards.map(c => ({
          id: c.id,
          roleId: c.roleId || '',
          activeTool: c.activeTool !== undefined ? c.activeTool : (c.metadata?.viewMode || null),
          metadata: c.metadata
        }))
      };
    });

    return {
      name: useWorkspaceStore.getState().projectName || 'Unnamed Project',
      projectType,
      layout: {
        columns: layoutColumns
      }
    };
  }, [projectType, columns, cards, activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId || !serializedState) return;
    const timer = setTimeout(() => {
      vfsWriteMutation.mutate({
        path: `${activeWorkspaceId}/.evaix/project.json`,
        content: JSON.stringify(serializedState, null, 2),
        provider: 'local'
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [serializedState, activeWorkspaceId]);

  const { loadProject, currentTree } = useBuilderStore();

  useEffect(() => {
    loadProject(layoutData);
  }, [loadProject]);

  const treeNodes = currentTree?.nodes;
  const rootNode = currentTree ? currentTree.nodes[currentTree.rootId] : null;

  // Extract columns mapping (pull from workspace store cards)
  const cardsByColumn = useMemo(() => {
    const buckets: Record<number, any[]> = {};
    for (let i = 0; i < columns; i++) buckets[i] = [];

    if (Array.isArray(cards)) {
        cards.forEach(card => {
            if (card.screenspaceId === activeScreenspaceId && typeof card.column === 'number' && card.column < columns) {
                buckets[card.column].push(card);
            }
        });
    }
    return buckets;
  }, [columns, cards, activeScreenspaceId]);

  const { data: roles } = trpc.roles.list.useQuery();
  const availableRoles = Array.isArray(roles) ? roles : [];

  const handleAddColumn = () => {
    const newColIndex = columns;
    setColumns(columns + 1);
    
    const roleId = availableRoles.length > 0 ? availableRoles[0].id : '';
    addCard({
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roleId,
      column: newColIndex,
      screenspaceId: activeScreenspaceId,
      activeTool: null,
      metadata: { viewMode: null }
    });
  };

  const handleRemoveColumn = (colIndexToRemove: number) => {
    const remainingCards = cards.filter(c => c.column !== colIndexToRemove || c.screenspaceId !== activeScreenspaceId);
    const shiftedCards = remainingCards.map(c => {
      if (c.screenspaceId === activeScreenspaceId && c.column > colIndexToRemove) {
        return { ...c, column: c.column - 1 };
      }
      return c;
    });
    setCards(shiftedCards);
    setColumns(Math.max(1, columns - 1));
  };

  useEffect(() => {
    if (!activeWorkspace) loadWorkspace('default');
  }, [activeWorkspace, loadWorkspace]);

  const [focusedCardIndex, setFocusedCardIndex] = useState<{ [key: number]: number }>({});
  const { setColumnFocus } = useColumnFocus(columns);

  const handleSpawnTool = (columnIndex: number, viewMode: 'editor' | 'terminal' | 'builder' | 'databrowser') => {
    if (!activeWorkspaceId) {
      toast.error('No active workspace context loaded.');
      return;
    }
    const roleId = availableRoles.length > 0 ? availableRoles[0].id : '';
    addCard({
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roleId,
      column: columnIndex,
      screenspaceId: activeScreenspaceId,
      metadata: { viewMode }
    });
    toast.success(`Spawned ${viewMode} tool`);
  };

  const handleSpawnCard = (columnIndex: number) => {
    handleSpawnTool(columnIndex, 'editor');
  };

  const scrollToCardIndex = (columnIndex: number, cardIndex: number) => {
    setFocusedCardIndex(prev => ({ ...prev, [columnIndex]: cardIndex }));
    const card = cardsByColumn[columnIndex]?.[cardIndex];
    if (card) document.getElementById(`card-${card.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Numeric hotkeys 1–9 for quick card focus
  useHotkeys(
    Array.from({ length: 9 }).map((_, i) => ({ id: `select-card-${i + 1}`, action: `Select Card ${i + 1}`, keys: `${i + 1}` })),
    Array.from({ length: 9 }).reduce<Record<string, () => void>>((acc, _, i) => {
      acc[`Select Card ${i + 1}`] = () => {
        const el = document.activeElement as HTMLElement;
        const isEditable = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' ||
          el?.contentEditable === 'true' || !!el?.closest('.ProseMirror') || !!el?.closest('.monaco-editor');
        if (isEditable) return;

        let count = 0;
        for (let col = 0; col < columns; col++) {
          const colCards = cardsByColumn[col] || [];
          if (count + colCards.length > i) { scrollToCardIndex(col, i - count); return; }
          count += colCards.length;
        }
      };
      return acc;
    }, {})
  );

  // ── Workflow mode: render the active workflow full-screen ──────────────────
  if (activeWorkflow && WORKFLOW_COMPONENTS[activeWorkflow]) {
    const WorkflowComponent = WORKFLOW_COMPONENTS[activeWorkflow];
    return (
      <div className={cn('h-full w-full flex flex-col overflow-hidden', className)}>
        <Suspense fallback={<WorkflowFallback name={activeWorkflow} />}>
          <WorkflowComponent />
        </Suspense>
      </div>
    );
  }

  // ── Free-grid mode (default, no active workflow) ───────────────────────────
  return (
    <div className={cn('h-full w-full flex flex-col overflow-hidden relative bg-zinc-950', className)}>
      {/* Workspace Header Bar */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Workspace:</span>
          <span className="text-xs font-bold text-white font-mono">{useWorkspaceStore.getState().projectName || 'Unnamed Project'}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold uppercase">{projectType}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAddColumn}
            variant="outline"
            className="h-6 px-2.5 bg-indigo-950/30 border-indigo-900/50 hover:bg-indigo-900/50 text-[10px] font-bold text-indigo-400 uppercase rounded flex items-center gap-1.5"
          >
            <Plus size={10} /> Add Column
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex overflow-x-auto bg-zinc-950 p-4 gap-4 min-w-full">
        {Array.from({ length: columns }).map((_, columnIndex) => {
          const columnCards = cardsByColumn[columnIndex] || [];
          const currentFocusIndex = focusedCardIndex[columnIndex] || 0;
          const currentCard = columnCards[currentFocusIndex];

          return (
            <div
              key={columnIndex}
              className="flex-1 flex flex-col overflow-hidden bg-[var(--color-background-secondary)] rounded-lg border border-zinc-800/80 min-w-[280px]"
            >
              {/* Cards above the focused one (clickable breadcrumbs) */}
              {currentFocusIndex > 0 && (
                <div className="flex-none bg-[var(--color-background)] border-b border-[var(--color-border)] flex items-center justify-center gap-1 px-2 h-8">
                  {columnCards.slice(0, currentFocusIndex).map((c, idx) => (
                    <Button
                      key={c.id}
                      onClick={() => scrollToCardIndex(columnIndex, idx)}
                      variant="outline"
                      size="icon"
                      className="w-6 h-6 text-[10px] font-bold hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]"
                      title={`Go to card ${idx + 1}`}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                </div>
              )}

              {/* Active card */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {currentCard ? (
                  <div
                    id={`card-${currentCard.id}`}
                    className="h-full"
                    onMouseEnter={() => setColumnFocus(columnIndex, currentCard.id)}
                  >
                    <SwappableCard key={currentCard.id} id={currentCard.id} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
                    No cards in this column
                  </div>
                )}
              </div>

              {/* Column navigation footer */}
              <div className="flex-none bg-[var(--color-background)] border-t border-[var(--color-border)] h-8">
                {columnCards.length > 0 ? (
                  <div className="h-full flex items-center justify-between px-3">
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => scrollToCardIndex(columnIndex, Math.max(0, currentFocusIndex - 1))}
                        disabled={currentFocusIndex === 0}
                        variant="ghost" size="sm"
                        className="h-auto px-2 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        ↑ Prev
                      </Button>
                      <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-mono">
                        {currentFocusIndex + 1}/{columnCards.length}
                      </span>
                      <Button
                        onClick={() => scrollToCardIndex(columnIndex, Math.min(columnCards.length - 1, currentFocusIndex + 1))}
                        disabled={currentFocusIndex === columnCards.length - 1}
                        variant="ghost" size="sm"
                        className="h-auto px-2 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        Next ↓
                      </Button>
                    </div>

                    {/* Spawn tools inside footer when cards are present */}
                    {activeWorkspaceId && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => handleSpawnCard(columnIndex)}
                          variant="outline"
                          className="h-5 px-2 bg-indigo-950/20 border-indigo-900/50 hover:bg-indigo-900/40 text-[8px] font-bold text-indigo-400 uppercase rounded-sm flex items-center gap-0.5"
                        >
                          <Plus size={8} /> Card
                        </Button>
                        <Button
                          onClick={() => handleRemoveColumn(columnIndex)}
                          variant="outline"
                          className="h-5 px-2 bg-red-950/20 border-red-900/50 hover:bg-red-900/40 text-[8px] font-bold text-red-400 uppercase rounded-sm"
                          title="Remove Column"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center gap-1.5">
                    {activeWorkspaceId ? (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleSpawnCard(columnIndex)}
                          variant="outline"
                          className="h-6 px-3 bg-indigo-950/30 border-indigo-900/50 hover:bg-indigo-900/50 text-[9px] font-bold text-indigo-400 uppercase rounded-sm flex items-center gap-1"
                        >
                          <Plus size={10} /> Add Card
                        </Button>
                        <Button
                          onClick={() => handleRemoveColumn(columnIndex)}
                          variant="outline"
                          className="h-6 px-3 bg-red-950/30 border-red-900/50 hover:bg-red-900/50 text-[9px] font-bold text-red-400 uppercase rounded-sm"
                        >
                          Remove Column
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">Select workspace to spawn tools</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Column Button Card */}
        {activeWorkspaceId && (
          <div 
            onClick={handleAddColumn}
            className="flex-1 max-w-[240px] min-w-[150px] flex flex-col justify-center items-center p-6 border border-dashed border-zinc-800 rounded-lg hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer group transition-all shrink-0 self-stretch min-h-[300px]"
          >
            <Plus size={24} className="text-zinc-600 group-hover:text-indigo-400 mb-2 transition-colors animate-pulse" />
            <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">Add Column</span>
          </div>
        )}
      </div>
    </div>
  );
}
