import React, { useEffect } from 'react';
import { injectCssVariables } from '../../design-system/cssVariables.js';
import { AvexBar } from './AvexBar.js';
import { TheGrid } from './primitives/TheGrid.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

/**
 * @file EvaixShell.tsx
 * @description The instance of the UI running on a single display.
 * Includes the Navbar (AvexBar) and main working area (TheGrid).
 */
export const EvaixShell: React.FC = () => {
  const cards = useWorkspaceStore(s => s.cards || []);
  const activeScreenspaceId = useWorkspaceStore(s => s.activeScreenspaceId);
  const spawnApp = useWorkspaceStore(s => s.spawnApp);

  useEffect(() => {
    injectCssVariables();
  }, []);

  useEffect(() => {
    // Initial Default: If activeCards is empty, dispatch spawnApp for defaults
    if (cards.length === 0) {
      spawnApp('litellm-ui', { initialUrl: 'http://localhost:8080' });
      spawnApp('openwebui', { initialUrl: 'http://localhost:3000' });
    }
  }, [cards.length, spawnApp]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--colors-background)] text-[var(--colors-primary)] font-[var(--typography-fontFamily)]">
      <AvexBar contextLocation="main-nav" />
      <main className="flex-1 relative overflow-hidden flex flex-col p-1">
        <TheGrid displayId={activeScreenspaceId} />
      </main>
    </div>
  );
};
