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

  const [columnWidths, setColumnWidths] = useState<number[]>([]);
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
        if (config.projectType) setProjectType(config.projectType);
        if (config.name) setProjectName(config.name);
        if (typeof config.columns === 'number') setColumns(config.columns);
        if (Array.isArray(config.cards)) setCards(config.cards);
      } catch (e) {
        console.error("Failed to parse project.json from VFS", e);
      }
    }
  }, [vfsReadQuery.data?.content, setProjectType, setProjectName, setColumns, setCards]);

  // Debounced Save project state to project.json
  const vfsWriteMutation = trpc.vfs.write.useMutation();
  const serializedState = useMemo(() => {
    if (!activeWorkspaceId || !projectType) return null;
    return {
      name: useWorkspaceStore.getState().projectName || 'Unnamed Project',
      projectType,
      columns,
      cards: cards.map(c => ({
        id: c.id,
        roleId: c.roleId,
        column: c.column,
        screenspaceId: c.screenspaceId,
        title: c.title,
        type: c.type,
        metadata: c.metadata
      }))
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

  useEffect(() => {
    if (!activeWorkspace) loadWorkspace('default');
  }, [activeWorkspace, loadWorkspace]);

  const [focusedCardIndex, setFocusedCardIndex] = useState<{ [key: number]: number }>({});
  const { setColumnFocus } = useColumnFocus(columns);
  const prevColumnsRef = useRef(columns);

  // Initialize or reset column widths when columns count changes
  useEffect(() => {
    setColumnWidths(new Array(columns).fill(100 / columns));
  }, [columns]);

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
      <div ref={containerRef} className="flex-1 flex overflow-hidden bg-zinc-950">
        {Array.from({ length: columns }).map((_, columnIndex) => {
          const columnCards = cardsByColumn[columnIndex] || [];
          const currentFocusIndex = focusedCardIndex[columnIndex] || 0;
          const currentCard = columnCards[currentFocusIndex];
          const width = columnWidths[columnIndex] ?? (100 / columns);

          return (
            <React.Fragment key={columnIndex}>
              <div
                className="flex-1 flex flex-col overflow-hidden bg-[var(--color-background-secondary)]"
                style={{ width: `${width}%`, flexGrow: 0, flexShrink: 0 }}
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
                          <Button
                            onClick={() => handleSpawnCard(columnIndex)}
                            variant="outline"
                            className="h-5 px-2 bg-indigo-950/20 border-indigo-900/50 hover:bg-indigo-900/40 text-[8px] font-bold text-indigo-400 uppercase rounded-sm flex items-center gap-0.5"
                          >
                            <Plus size={8} /> Card
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center gap-1.5">
                      {activeWorkspaceId ? (
                        <Button
                          onClick={() => handleSpawnCard(columnIndex)}
                          variant="outline"
                          className="h-6 px-3 bg-indigo-950/30 border-indigo-900/50 hover:bg-indigo-900/50 text-[9px] font-bold text-indigo-400 uppercase rounded-sm flex items-center gap-1"
                        >
                          <Plus size={10} /> Add Card
                        </Button>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">Select workspace to spawn tools</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {columnIndex < columns - 1 && (
                <div
                  className="w-[3px] hover:w-[5px] bg-zinc-800/80 hover:bg-indigo-500 cursor-col-resize transition-all h-full z-30 shrink-0 self-stretch"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const initialWidths = [...columnWidths];
                    const container = containerRef.current;
                    if (!container) return;
                    const containerWidth = container.getBoundingClientRect().width;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const deltaX = moveEvent.clientX - startX;
                      const deltaPercent = (deltaX / containerWidth) * 100;
                      const newWidths = [...initialWidths];
                      const totalTwo = (newWidths[columnIndex] || 0) + (newWidths[columnIndex + 1] || 0);
                      const minWidth = 15; // minimum width in percent
                      const targetWidth = Math.max(minWidth, Math.min(totalTwo - minWidth, (newWidths[columnIndex] || 0) + deltaPercent));
                      
                      newWidths[columnIndex] = targetWidth;
                      newWidths[columnIndex + 1] = totalTwo - targetWidth;
                      setColumnWidths(newWidths);
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
