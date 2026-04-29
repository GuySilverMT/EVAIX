/**
 * Datacenter Workflow — Phase 5
 *
 * 2-column layout:
 *   Left:  DatabaseBrowser in a UniversalCardWrapper (with Create New Table + SuperAiButton)
 *   Right: DbNodeCanvas schema graph view
 */
import { Database, Network } from 'lucide-react';
import { UniversalCardWrapper } from '../../components/work-order/UniversalCardWrapper.js';
import { DatabaseBrowser } from '../../components/DatabaseBrowser.js';
import { DbNodeCanvas } from '../../components/DbNodeCanvas.js';

export default function DatacenterWorkflow() {
  return (
    <div className="h-full w-full flex overflow-hidden bg-zinc-950">

      {/* LEFT: Database browser with table management */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
        <UniversalCardWrapper
          title="Tables & Data"
          icon={Database}
          aiContext="datacenter_tables"
          settings={
            <div className="text-xs text-zinc-400 space-y-2">
              <p>Browse, create, and manage database tables. The SuperAiButton can auto-generate schemas from a description.</p>
              <p className="text-zinc-500">Provider saves automatically create a <code className="text-indigo-400">ProviderModel</code> entries.</p>
            </div>
          }
        >
          <DatabaseBrowser showCreateTable />
        </UniversalCardWrapper>
      </div>

      {/* RIGHT: Schema graph */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <UniversalCardWrapper
          title="Schema Graph"
          icon={Network}
          aiContext="datacenter_schema"
          settings={
            <div className="text-xs text-zinc-400">
              <p>Visual schema graph. Column headers are shown on each node.</p>
            </div>
          }
        >
          <DbNodeCanvas schemaMode showColumnHeaders />
        </UniversalCardWrapper>
      </div>

    </div>
  );
}
