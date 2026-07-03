import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { injectCssVariables } from '../../design-system/cssVariables.js';
import AgentWorkbench from '../../pages/AgentWorkbench.js';
import ControlPlane from '../../pages/ControlPlane.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

const WORKFLOW_COLUMNS: Record<string, number> = {
  provider: 2, org: 2, datacenter: 2, settings: 1, voice: 2,
};

/**
 * @file EvaixShell.tsx
 * @description The master layout container for the EVAIX Agentic Spatial Window Manager on Fedora.
 * Eradicates traditional desktop concepts by serving as a 3D grid wrapper for agentic web tools.
 */
export function EvaixShell() {
  useEffect(() => {
    injectCssVariables();
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--colors-background)] text-[var(--colors-text)] font-sans">
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <Routes>
          {/* Project dashboard home */}
          <Route path="/" element={<Navigate to="/workbench" replace />} />

          {/* Primary workbench */}
          <Route path="/workspace/:id" element={<AgentWorkbench />} />
          <Route path="/workbench"     element={<AgentWorkbench />} />

          {/* Legacy URL convenience routes — activate correct workflow */}
          <Route path="/datacenter"        element={<WorkflowRedirect workflow="datacenter" />} />
          <Route path="/settings"          element={<WorkflowRedirect workflow="settings" />} />
          <Route path="/org-structure"     element={<WorkflowRedirect workflow="org" />} />
          <Route path="/voice-playground"  element={<WorkflowRedirect workflow="voice" />} />

          {/* Standalone admin tool — kept separate */}
          <Route path="/control-plane" element={<ControlPlane />} />

          {/* Deleted pages — hard redirect to home */}
          <Route path="/basetool"             element={<Navigate to="/" replace />} />
          <Route path="/visualizer"           element={<Navigate to="/" replace />} />
          <Route path="/code-visualizer"      element={<Navigate to="/" replace />} />
          <Route path="/orchestration-canvas" element={<Navigate to="/" replace />} />

          {/* Fallback */}
          <Route path="*" element={<AgentWorkbench />} />
        </Routes>
      </main>
    </div>
  );
}

/**
 * WorkflowRedirect — sets activeWorkflow in the store then renders AgentWorkbench.
 * Enables deep-linking to a workflow via URL while preserving single-page architecture.
 */
function WorkflowRedirect({ workflow }: { workflow: string }) {
  const setActiveWorkflow = useWorkspaceStore(s => s.setActiveWorkflow);
  const setColumns = useWorkspaceStore(s => s.setColumns);

  useEffect(() => {
    setActiveWorkflow(workflow);
    setColumns(WORKFLOW_COLUMNS[workflow] ?? 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  return <AgentWorkbench />;
}

// Backward compatibility export
export const CooperativeShell = EvaixShell;
