import React, { useEffect, useState, useMemo, useRef, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useHotkeys } from '../hooks/useHotkeys.js';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { useWorkspaceStore, type CardData } from '../stores/workspace.store.js';
import { useBuilderStore } from '../stores/builder.store.js';
import layoutData from '../../../badbuilder/agentworkbench.layout.json';
import { useColumnFocus } from '../hooks/useColumnFocus.js';
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

  return (
    <div className={cn('h-full w-full flex overflow-hidden relative bg-[var(--color-background)]', className)}>
      {/* LEFT COLUMN: Workspace & Tools Panel */}
      <div className="w-[300px] border-r border-zinc-800 flex-shrink-0 flex flex-col bg-zinc-950 overflow-hidden">
          <ProjectManagerPanel />
      </div>

      {/* RIGHT COLUMN: Execution Window & Open WebUI Chat Split */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950 flex flex-row">
        <div className="flex-1 relative overflow-hidden">
          <DockLayout
            ref={dockLayoutRef}
            defaultLayout={dockLayoutData}
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, border: 'none' }}
          />
        </div>
        <div className="w-[360px] h-full flex-shrink-0 border-l border-zinc-800">
          <OpenWebUIDenseChat />
        </div>
      </div>
    </div>
  );
}