/**
 * Provider Workflow — Phase 3
 *
 * 2-column layout:
 *   Left:  Provider Registry / Financial Arbitrage Dashboard (ProviderManagementGrid)
 *   Right: A free SwappableCard (column 1) — user can switch it to browser mode,
 *          terminal, AI chat, or anything else via the card's own controls.
 *          The card's URL bar is available for dragging billing URLs from the browser
 *          onto a Provider card row.
 */
import { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { UniversalCardWrapper } from '../../components/work-order/UniversalCardWrapper.js';
import { ProviderManagementGrid } from '../providers/ProviderManagementGrid.js';
import { SwappableCard } from '../../components/work-order/SwappableCard.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

// Stable card id for the right panel — lives for the duration of the workflow session.
const BILLING_CARD_ID = 'provider-workflow-billing-card';

export default function ProviderWorkflow() {
  const { addCard, removeCard, cards, activeScreenspaceId } = useWorkspaceStore();

  // Ensure the billing card exists in the store while this workflow is mounted.
  useEffect(() => {
    const exists = cards.some(c => c.id === BILLING_CARD_ID);
    if (!exists) {
      addCard({
        id: BILLING_CARD_ID,
        roleId: '',
        column: 1,
        screenspaceId: activeScreenspaceId,
        title: 'Billing Browser',
        type: 'browser',
      });
    }
    // Clean up when leaving the workflow so it doesn't pollute the free grid.
    return () => {
      removeCard(BILLING_CARD_ID);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full w-full flex overflow-hidden bg-zinc-950">

      {/* LEFT: Provider Registry */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
        <UniversalCardWrapper
          title="Provider & Billing Arbitrage"
          icon={ShieldCheck}
          aiContext="provider_workflow"
          settings={
            <div className="text-xs text-zinc-400 space-y-2">
              <p>Configure providers, set budgets, and manage billing risk levels.</p>
              <p className="text-zinc-500">
                Use the card on the right to navigate to a billing dashboard —
                copy the URL and paste it into the Provider's Billing URL field.
              </p>
            </div>
          }
        >
          <ProviderManagementGrid workflowMode />
        </UniversalCardWrapper>
      </div>

      {/* RIGHT: Free SwappableCard — user controls mode (browser, terminal, AI, etc.) */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <SwappableCard id={BILLING_CARD_ID} />
      </div>

    </div>
  );
}
