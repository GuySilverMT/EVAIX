import React, { useState } from "react";
import {
  useWorkspaceStore,
  type CardData,
} from "../../../stores/workspace.store.js";
import { AppCard } from "../../work-order/AppCard.js";
import { AppRegistry } from "../../../registry/ComponentRegistry.js";

const APP_IDS = Object.keys(AppRegistry);

/**
 * @file TheGrid.tsx
 * @description The spatial window matrix renderer.
 * Implements the 3-Tier Progressive Architecture:
 * 1. Top Tab Strip (Inactive Cards)
 * 2. Viewport (Focused Card)
 * 3. Bottom Spawner (+ New App)
 */

export interface TheGridProps {
  displayId?: number;
}

export const TheGrid: React.FC<TheGridProps> = ({ displayId = 0 }) => {
  const activeCardsStore = useWorkspaceStore(
    (s) => s.activeCards || s.cards || [],
  );
  const totalColumns = useWorkspaceStore((s) => s.columns) || 2;
  const focusedCardIds = useWorkspaceStore((s) => s.focusedCardIds);
  const setFocusedCardId = useWorkspaceStore((s) => s.setFocusedCardId);
  const spawnApp = useWorkspaceStore((s) => s.spawnApp);
  const [pickerColIndex, setPickerColIndex] = useState<number | null>(null);
  // Filter cards by displayId / screenspaceId
  // ⚡ Bolt Optimization: Memoize the active cards filtering array.
  // Impact: Prevents O(N) filtering operations on every render, especially when
  // unrelated ephemeral state (like pickerColIndex) changes.
  const activeCards = React.useMemo(() => {
    return activeCardsStore.filter(
      (c) => (c.displayId ?? c.screenspaceId ?? 0) === displayId,
    );
  }, [activeCardsStore, displayId]);

  // ⚡ Bolt Optimization: Memoize the columns grouping map.
  // Impact: Avoids array allocations and O(N) grouping calculations during every
  // render cycle, drastically reducing React reconciliation time in layout resizing and
  // interactions for grid rendering.
  const columnsMap = React.useMemo(() => {
    const map: Record<number, CardData[]> = {};

    for (let colIdx = 0; colIdx < totalColumns; colIdx++) {
      map[colIdx] = [];
    }

    activeCards.forEach((card) => {
      // Group cards by their assigned column
      const colIdx = card.column ?? 0;
      if (map[colIdx]) {
        map[colIdx].push(card);
      } else {
        map[colIdx] = [card];
      }
    });

    return map;
  }, [activeCards, totalColumns]);

  return (
    <div className="flex flex-row flex-1 w-full h-full gap-[1px] bg-[var(--colors-divider)] overflow-hidden">
      {Array.from({ length: totalColumns }).map((_, colIndex) => {
        const colCards = columnsMap[colIndex] || [];

        // Determine the focused card for this column
        const storedFocusedId = focusedCardIds[colIndex];
        const focusedCard =
          colCards.find((c) => c.id === storedFocusedId) || colCards[0];
        const inactiveCards = colCards.filter((c) => c.id !== focusedCard?.id);

        return (
          <div
            key={`column-${colIndex}`}
            className="flex flex-col flex-1 h-full bg-[var(--colors-background)] overflow-hidden relative"
          >
            {/* TIER 1: TOP TAB STRIP */}
            {inactiveCards.length > 0 && (
              <div className="flex w-full h-7 shrink-0 bg-[#18181b] border-b border-[#3f3f46] overflow-x-auto hide-scrollbar">
                {inactiveCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setFocusedCardId(colIndex, card.id)}
                    className="flex-1 min-w-[100px] border-r border-[#3f3f46] px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:bg-[#27272a] hover:text-zinc-200 truncate flex items-center transition-colors cursor-pointer"
                    title={card.appId?.toUpperCase() || "APP"}
                  >
                    {card.appId?.toUpperCase() || "APP"}
                  </button>
                ))}
              </div>
            )}

            {/* TIER 2: VIEWPORT (Focused App) */}
            <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-black relative">
              {focusedCard ? (
                <AppCard
                  id={focusedCard.id}
                  isFocused={true}
                  isCondensed={false}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-700 font-mono text-sm">
                  NO ACTIVE TILE
                </div>
              )}
            </div>

            {/* TIER 3: BOTTOM SPAWNER */}
            <div className="relative shrink-0">
              {pickerColIndex === colIndex && (
                <div className="absolute bottom-6 left-0 right-0 z-40 bg-zinc-950 border border-[#3f3f46] flex flex-col max-h-40 overflow-y-auto">
                  {APP_IDS.map((appId) => (
                    <button
                      key={appId}
                      onClick={() => {
                        spawnApp(appId, undefined, colIndex);
                        setPickerColIndex(null);
                      }}
                      className="h-6 px-2 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border-b border-[#27272a] last:border-b-0 cursor-pointer"
                    >
                      {appId}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() =>
                  setPickerColIndex(
                    pickerColIndex === colIndex ? null : colIndex,
                  )
                }
                className="h-6 w-full bg-zinc-950 border-t border-[#3f3f46] hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                <span className="material-icons text-[12px]">add</span>
                <span>New Tile</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
