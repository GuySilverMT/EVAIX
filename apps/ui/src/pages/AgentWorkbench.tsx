import { useWorkspaceStore } from '../stores/workspace.store.js';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { Button } from '../components/ui/button.js';
import { Plus } from 'lucide-react';
import { useColumnFocus } from '../hooks/useColumnFocus.js';
import { useHotkeys } from '../hooks/useHotkeys.js';
import { trpc } from '../utils/trpc.js';
import { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { cn } from '../lib/utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// Lazy-load workflow components to keep the initial bundle lean
// ─────────────────────────────────────────────────────────────────────────────
const ProviderWorkflow  = lazy(() => import('../features/workflows/ProviderWorkflow.jsx'));
const OrgWorkflow       = lazy(() => import('../features/workflows/OrgWorkflow.jsx'));
const DatacenterWorkflow = lazy(() => import('../features/workflows/DatacenterWorkflow.jsx'));
const SettingsWorkflow  = lazy(() => import('../features/workflows/SettingsWorkflow.jsx'));
const VoiceWorkflow     = lazy(() => import('../features/workflows/VoiceWorkflow.jsx'));

// ─────────────────────────────────────────────────────────────────────────────
// Headless scaffold — reusable layout primitive
// ─────────────────────────────────────────────────────────────────────────────
export const AgentWorkbenchScaffold = ({
  header,
  content,
}: {
  header?: React.ReactNode;
  content?: React.ReactNode;
}) => (
  <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950">
    {header && <div className="h-16 border-b border-zinc-800 shrink-0">{header}</div>}
    <main className="flex-1 overflow-hidden relative">{content}</main>
  </div>
);

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
  const {
    columns, cards, setCards, addCard,
    activeWorkspace, activeScreenspaceId, loadWorkspace,
    activeWorkflow,
  } = useWorkspaceStore();

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

  const filteredCards = useMemo(() => {
    const spaceId = activeScreenspaceId || 1;
    return cards.filter(c => (c.screenspaceId || 1) === spaceId);
  }, [cards, activeScreenspaceId]);

  const cardsByColumn = useMemo(() => {
    const buckets: { [key: number]: typeof cards } = {};
    for (let i = 0; i < columns; i++) buckets[i] = [];
    filteredCards.forEach(card => {
      if (buckets[card.column]) buckets[card.column].push(card);
    });
    return buckets;
  }, [filteredCards, columns]);

  const handleSpawnCard = (columnIndex: number) => {
    if (availableRoles.length === 0) {
      alert('Create at least one role in the Org Workflow before spawning a card.');
      return;
    }
    addCard({ id: String(Date.now()), roleId: availableRoles[0].id, column: columnIndex, screenspaceId: activeScreenspaceId });
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
                    <Button
                      onClick={() => scrollToCardIndex(columnIndex, Math.max(0, currentFocusIndex - 1))}
                      disabled={currentFocusIndex === 0}
                      variant="ghost" size="sm"
                      className="h-auto px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      ↑ Prev
                    </Button>
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                      {currentFocusIndex + 1}/{columnCards.length}
                    </span>
                    <Button
                      onClick={() => scrollToCardIndex(columnIndex, Math.min(columnCards.length - 1, currentFocusIndex + 1))}
                      disabled={currentFocusIndex === columnCards.length - 1}
                      variant="ghost" size="sm"
                      className="h-auto px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      Next ↓
                    </Button>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Button
                      onClick={() => handleSpawnCard(columnIndex)}
                      variant="outline" size="sm"
                      className="h-7 bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 text-[10px] font-bold uppercase tracking-wider"
                    >
                      <Plus size={12} className="mr-1" /> Spawn Card
                    </Button>
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
