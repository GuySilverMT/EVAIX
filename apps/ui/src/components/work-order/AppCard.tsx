import { memo } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { FocusStrip } from '../core/FocusStrip.js';
import { StackStrip } from '../core/StackStrip.js';
import { getRegisteredApp } from '../../registry/ComponentRegistry.js';

/**
 * @file AppCard.tsx
 * @description The "Agentic Wrapper" for any content node. 
 * Orchestrates WebNode or other components dynamically based on AppRegistry.
 */

export interface AppCardProps {
  id: string;
  isFocused?: boolean;
  isCondensed?: boolean;
}

export const AppCard = memo(({ id, isFocused = true, isCondensed = false }: AppCardProps) => {
  const card = useWorkspaceStore(s => s.cards.find(c => c.id === id));
  
  if (!card) return null;

  const viewMode = (card.appId || card.activeTool || card.metadata?.viewMode || 'litellm-ui') as string;
  
  if (isCondensed) {
    return <StackStrip title={viewMode.toUpperCase()} />;
  }

  const appDef = getRegisteredApp(viewMode);
  const RegisteredComponent = appDef?.component || (() => (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
      <span className="text-xs font-semibold text-zinc-400 mb-1">Unregistered Node</span>
      <span className="text-[10px] text-zinc-500 font-mono">Component Missing: "{viewMode}"</span>
    </div>
  ));

  return (
    <div className="flex h-full w-full rounded-none border-0 bg-[var(--colors-background)] overflow-hidden relative flex-col">
      {isFocused && <FocusStrip cardId={id} title={viewMode.toUpperCase()} />}
      
      <div className="flex-1 flex overflow-hidden relative w-full h-full min-h-0 min-w-0">
        <RegisteredComponent
          key={viewMode}
          cardId={id}
          id={id}
          {...card.props}
          {...appDef?.props}
          hideWrapper={!appDef?.showBrowserBar}
        />
      </div>
    </div>
  );
});
