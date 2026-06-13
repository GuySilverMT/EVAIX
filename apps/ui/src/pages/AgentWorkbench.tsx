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
  const { data: getWorkspaceData } = trpc.workspace.get.useQuery({ id: id || '' }, { enabled: !!id });
  const { data: currentWorkspaceData } = trpc.workspace.getCurrent.useQuery(undefined, { enabled: !id });
  const workspaceData = id ? getWorkspaceData : currentWorkspaceData;

  const {
    setCards, addCard,
    activeWorkspace, activeScreenspaceId, loadWorkspace, initializeFromWorkspace,
    activeWorkflow,
    setActiveWorkspaceId, setProjectType, projectType, activeWorkspaceId, cards
  } = useWorkspaceStore();

  const [lastLoadedWorkspaceId, setLastLoadedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceData && workspaceData.id !== lastLoadedWorkspaceId) {
        setActiveWorkspaceId(workspaceData.id);
        setProjectType(workspaceData.projectType);
        initializeFromWorkspace(workspaceData.projectType);
        setLastLoadedWorkspaceId(workspaceData.id);
    }
  }, [workspaceData, lastLoadedWorkspaceId, setActiveWorkspaceId, setProjectType, initializeFromWorkspace]);

  const { loadProject, currentTree } = useBuilderStore();

  useEffect(() => {
    loadProject(layoutData);
  }, [loadProject]);

  const treeNodes = currentTree?.nodes;
  const rootNode = currentTree ? currentTree.nodes[currentTree.rootId] : null;

  // Extract columns (cells) from the loaded layout
  const builderColumns = useMemo(() => {
    if (!rootNode || !treeNodes) return [];
    const childrenIds = Array.isArray(rootNode.children) ? rootNode.children : [];
    return childrenIds.map(id => treeNodes[id as string]).filter(node => node?.role === 'cell' || node?.type === 'Box' || node?.type === 'Flex');
  }, [rootNode, treeNodes]);

  const columns = builderColumns.length || 1;

  // Extract cards mapping (pull from workspace store cards)
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

  useEffect(() => {
    if (!activeWorkspace) loadWorkspace('default');
  }, [activeWorkspace, loadWorkspace]);

  const [focusedCardIndex, setFocusedCardIndex] = useState<{ [key: number]: number }>({});
  const { setColumnFocus } = useColumnFocus(columns);
  const prevColumnsRef = useRef(columns);

  // Redistribute cards when column count changes
  useEffect(() => {
    if (prevColumnsRef.current !== columns && Array.isArray(cards)) {
      setCards(cards.map((card, index) => ({ ...card, column: index % columns })));
      prevColumnsRef.current = columns;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

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
    <div className={cn('h-full w-full flex flex-col overflow-hidden relative', className)}>
      <div className="flex-1 flex overflow-hidden bg-zinc-950">
        {Array.from({ length: columns }).map((_, columnIndex) => {
          const columnCards = cardsByColumn[columnIndex] || [];
          const currentFocusIndex = focusedCardIndex[columnIndex] || 0;
          const currentCard = columnCards[currentFocusIndex];

          return (
            <div
              key={columnIndex}
              className="flex-1 flex flex-col overflow-hidden bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] last:border-r-0"
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
                      <div className="flex items-center gap-1">
                        {projectType === 'CODE' && (
                          <Button
                            onClick={() => handleSpawnTool(columnIndex, 'builder')}
                            variant="outline"
                            className="h-5 px-1.5 bg-indigo-950/20 border-indigo-900/50 hover:bg-indigo-900/40 text-[8px] font-bold text-indigo-400 uppercase rounded-sm"
                          >
                            + Builder
                          </Button>
                        )}
                        {(projectType === 'CODE' || projectType === 'DEPLOY') && (
                          <Button
                            onClick={() => handleSpawnTool(columnIndex, 'terminal')}
                            variant="outline"
                            className="h-5 px-1.5 bg-rose-950/20 border-rose-900/50 hover:bg-rose-900/40 text-[8px] font-bold text-rose-400 uppercase rounded-sm"
                          >
                            + Terminal
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSpawnTool(columnIndex, 'editor')}
                          variant="outline"
                          className="h-5 px-1.5 bg-cyan-950/20 border-cyan-900/50 hover:bg-cyan-900/40 text-[8px] font-bold text-cyan-400 uppercase rounded-sm"
                        >
                          + Editor
                        </Button>
                        <Button
                          onClick={() => handleSpawnTool(columnIndex, 'databrowser')}
                          variant="outline"
                          className="h-5 px-1.5 bg-emerald-950/20 border-emerald-900/50 hover:bg-emerald-900/40 text-[8px] font-bold text-emerald-400 uppercase rounded-sm"
                        >
                          + Data
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center gap-1.5">
                    {activeWorkspaceId ? (
                      <>
                        {projectType === 'CODE' && (
                          <Button
                            onClick={() => handleSpawnTool(columnIndex, 'builder')}
                            variant="outline"
                            className="h-6 px-2.5 bg-indigo-950/30 border-indigo-900/50 hover:bg-indigo-900/50 text-[9px] font-bold text-indigo-400 uppercase rounded-sm"
                          >
                            + Spawn BadBuilder
                          </Button>
                        )}
                        {(projectType === 'CODE' || projectType === 'DEPLOY') && (
                          <Button
                            onClick={() => handleSpawnTool(columnIndex, 'terminal')}
                            variant="outline"
                            className="h-6 px-2.5 bg-rose-950/30 border-rose-900/50 hover:bg-rose-900/50 text-[9px] font-bold text-rose-400 uppercase rounded-sm"
                          >
                            + Spawn Terminal
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSpawnTool(columnIndex, 'editor')}
                          variant="outline"
                          className="h-6 px-2.5 bg-cyan-950/30 border-cyan-900/50 hover:bg-cyan-900/50 text-[9px] font-bold text-cyan-400 uppercase rounded-sm"
                        >
                          + Spawn SmartEditor
                        </Button>
                        <Button
                          onClick={() => handleSpawnTool(columnIndex, 'databrowser')}
                          variant="outline"
                          className="h-6 px-2.5 bg-emerald-950/30 border-emerald-900/50 hover:bg-emerald-900/50 text-[9px] font-bold text-emerald-400 uppercase rounded-sm"
                        >
                          + Spawn DataBrowser
                        </Button>
                      </>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">Select workspace to spawn tools</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
