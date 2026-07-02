import React, { useEffect, useState, useMemo, useRef, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useHotkeys } from '../hooks/useHotkeys.js';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { useWorkspaceStore, type CardData } from '../stores/workspace.store.js';
import { useBuilderStore } from '../stores/builder.store.js';
import layoutData from '../../../badbuilder/agentworkbench.layout.json';
import { useColumnFocus } from '../hooks/useColumnFocus.js';
import { PropertyPanel } from '../components/nebula/system/PropertyPanel.js';
import { AgentSettings } from '../components/settings/AgentSettings.js';
import DockLayout from 'rc-dock';
import type { LayoutData, TabData, PanelData } from 'rc-dock';
import 'rc-dock/dist/rc-dock.css';
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
import { TopWorkbenchBar } from '../components/cooperative/TopWorkbenchBar.js';
import { ChatCard } from '../components/apps/ChatCard.js';
import { DocsCard } from '../components/apps/DocsCard.js';
import { ProjectManagerCard } from '../components/apps/ProjectManagerCard.js';
import { ProjectManagerPanel } from '../components/work-order/ProjectManagerPanel.js';
import { OpenWebUIDenseChat } from '../components/cooperative/OpenWebUIDenseChat.js';


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
    setCards, addCard, addPanel,
    activeWorkspace, loadWorkspace,
    activeWorkflow,
    setActiveWorkspaceId, setProjectType, setProjectName, projectType, activeWorkspaceId, cards,
    columns, setColumns
  } = useWorkspaceStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const dockLayoutRef = useRef<DockLayout>(null);

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
  }, [vfsReadQuery.data?.content, setProjectType, setProjectName, setColumns, setCards]);

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
    const buckets: Record<number, CardData[]> = {};
    for (let i = 0; i < columns; i++) buckets[i] = [];

    if (Array.isArray(cards)) {
        cards.forEach(card => {
            if (typeof card.column === 'number' && card.column < columns) {
                buckets[card.column].push(card);
            }
        });
    }
    return buckets;
  }, [columns, cards]);

  const { data: roles } = trpc.roles.list.useQuery();
  const availableRoles = Array.isArray(roles) ? roles : [];

  const handleAddColumn = () => {
    const newColIndex = columns;
    setColumns(columns + 1);
    addPanel(`col-${newColIndex + 1}`);
  };

  const handleRemoveColumn = (colIndexToRemove: number) => {
    const remainingCards = cards.filter(c => c.column !== colIndexToRemove);
    const shiftedCards = remainingCards.map(c => {
      if (c.column > colIndexToRemove) {
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
      metadata: { viewMode }
    });
    toast.success(`Spawned ${viewMode} tool`);
  };

  const handleSpawnCard = (columnIndex: number) => {
    addPanel(`col-${columnIndex + 1}`);
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
  const dockLayoutData: LayoutData = useMemo(() => {
    const panels: PanelData[] = [];
    for (let i = 0; i < columns; i++) {
      const columnCards = cardsByColumn[i] || [];
      const tabs: TabData[] = columnCards.map((card, idx) => ({
        id: `card-${card.id}`,
        title: `Card ${idx + 1}`,
        content: <SwappableCard key={card.id} id={card.id} />
      }));
      if (tabs.length === 0) {
          tabs.push({
              id: `empty-${i}`,
              title: `Empty ${i + 1}`,
              content: (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
                      <div>No cards in this column</div>
                      {activeWorkspaceId && (
                         <Button
                          onClick={() => handleSpawnCard(i)}
                          variant="outline"
                          className="h-6 px-3 bg-indigo-950/30 border-indigo-900/50 hover:bg-indigo-900/50 text-[9px] font-bold text-indigo-400 uppercase rounded-sm flex items-center gap-1"
                        >
                          <Plus size={10} /> Add Card
                        </Button>
                      )}
                  </div>
              )
          });
      }

      panels.push({
        id: `panel-${i}`,
        tabs
      });
    }

    return {
      dockbox: {
        mode: 'horizontal',
        children: panels
      }
    };
  }, [columns, cardsByColumn, handleSpawnCard, activeWorkspaceId]);


  useEffect(() => {
    if (dockLayoutRef.current) {
        dockLayoutRef.current.loadLayout(dockLayoutData);
    }
  }, [dockLayoutData]);

  const activeSystemApp = useWorkspaceStore(s => s.activeSystemApp);
  const setActiveSystemApp = useWorkspaceStore(s => s.setActiveSystemApp);

  // Vertical Stacking Accordion State (active card per column)
  const [activeColumnCards, setActiveColumnCards] = useState<Record<number, string>>({});

  useEffect(() => {
    setActiveColumnCards((prev) => {
      const next = { ...prev };
      for (let i = 0; i < columns; i++) {
        const colCards = cardsByColumn[i] || [];
        if (colCards.length > 0 && (!next[i] || !colCards.some(c => c.id === next[i]))) {
          next[i] = colCards[colCards.length - 1].id;
        }
      }
      return next;
    });
  }, [columns, cardsByColumn]);

  return (
    <div className={cn('h-full w-full flex flex-col overflow-hidden relative bg-[#121212]', className)}>
      {/* TOP WORKBENCH BAR */}
      <TopWorkbenchBar />

      {/* COOPERATIVE 2-COLUMN GRID */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          width: '100%',
          height: 'calc(100vh - 48px)',
          gap: '4px',
          padding: '4px',
          backgroundColor: '#121212'
        }}
      >
        {Array.from({ length: 2 }).map((_, colIndex) => {
          const colCards = cardsByColumn[colIndex] || [];
          const activeCardId = activeColumnCards[colIndex] || (colCards[colCards.length - 1]?.id ?? '');
          const focusedCard = colCards.find(c => c.id === activeCardId) || colCards[0];
          const otherCards = colCards.filter(c => c.id !== focusedCard?.id);

          // Condition A: 1 Card
          // Condition B: 2 Cards -> 1 strip above focused card
          // Condition C: 3+ Cards -> Tab bar (for 3rd+ cards) + 1 strip directly above focused card
          const mostRecentBackgroundedCard = otherCards.length > 0 ? otherCards[otherCards.length - 1] : null;
          const tabCards = otherCards.length > 1 ? otherCards.slice(0, otherCards.length - 1) : [];

          return (
            <div 
              key={`col-${colIndex}`} 
              className="flex flex-col h-full bg-[#18181a] border border-[#2a2a2d] rounded overflow-hidden"
            >
              {/* CONDITION C: Tab Bar (For 3rd, 4th, 5th+ cards in column) */}
              {colCards.length >= 3 && tabCards.length > 0 && (
                <div className="h-6 bg-[#121212] border-b border-[#2a2a2d] px-2 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
                  {tabCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => setActiveColumnCards(p => ({ ...p, [colIndex]: card.id }))}
                      className="px-2 py-0.5 bg-[#18181a] hover:bg-[#252528] border border-[#2a2a2d] text-[9px] font-mono text-zinc-400 hover:text-zinc-200 rounded whitespace-nowrap"
                    >
                      📁 {card.activeTool || card.id.slice(0, 8)}
                    </button>
                  ))}
                </div>
              )}

              {/* CONDITION B & C: Condensed Strip (Sitting directly ABOVE Focused Card's App Menu Bar) */}
              {colCards.length >= 2 && mostRecentBackgroundedCard && (
                <SwappableCard 
                  id={mostRecentBackgroundedCard.id} 
                  isFocused={false} 
                  isCondensed={true}
                  onFocus={() => setActiveColumnCards(p => ({ ...p, [colIndex]: mostRecentBackgroundedCard.id }))}
                />
              )}

              {/* CONDITION A, B, C: Focused Card View */}
              <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
                {focusedCard ? (
                  <SwappableCard 
                    id={focusedCard.id} 
                    isFocused={true} 
                    isCondensed={false}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-900 m-2 rounded-lg text-zinc-600">
                    <span className="text-[10px] font-mono uppercase tracking-wider">Empty Column Grid Zone</span>
                    <button 
                      onClick={() => handleSpawnCard(colIndex)}
                      className="px-3 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-800 rounded text-xs font-bold font-mono flex items-center gap-1"
                    >
                      <Plus size={12} /> Spawn App Card
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SYSTEM APP OVERLAY CONTAINER */}
      {activeSystemApp && (
        <div className="absolute right-0 top-0 bottom-0 w-[500px] max-w-full border-l border-zinc-800 bg-zinc-950 z-[100] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="h-10 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-200 font-mono">
                System App: {activeSystemApp}
              </span>
            </div>
            <button 
              onClick={() => setActiveSystemApp(null)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Close System App"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2 bg-zinc-950">
            {activeSystemApp === 'project-manager' && <ProjectManagerCard />}
            {activeSystemApp === 'properties' && <PropertyPanel />}
            {activeSystemApp === 'settings' && (
              <Suspense fallback={<div className="p-4 text-xs text-zinc-500 font-mono">Loading Settings...</div>}>
                <SettingsWorkflow />
              </Suspense>
            )}
            {activeSystemApp === 'provider' && (
              <Suspense fallback={<div className="p-4 text-xs text-zinc-500 font-mono">Loading Provider...</div>}>
                <ProviderWorkflow />
              </Suspense>
            )}
            {activeSystemApp === 'accounts' && (
              <div className="p-4 text-xs text-zinc-300">
                <h3 className="font-bold text-sm mb-2 text-emerald-400">Account Profile</h3>
                <p className="text-zinc-500 mb-4">EVAIX Cooperative Session & User Identity Management</p>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-2 font-mono">
                  <div>User ID: sys-user-01</div>
                  <div>Role: Cooperative Lead</div>
                  <div>Status: Authenticated</div>
                </div>
              </div>
            )}
            {activeSystemApp === 'models' && (
              <div className="p-4">
                <AgentSettings cardId="system" onSave={() => setActiveSystemApp(null)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}