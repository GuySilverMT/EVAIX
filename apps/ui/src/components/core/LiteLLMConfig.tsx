import React from 'react';
import { WebNode } from '../WebNode.js';

export interface LiteLLMConfigProps {
  id?: string;
  cardId?: string;
}

/**
 * @file LiteLLMConfig.tsx
 * @description No mocks. This injects the ACTUAL LiteLLM Admin UI running 
 * on localhost:4000 directly into the AppCard via the Orchestrator Paradigm.
 */
export const LiteLLMConfig: React.FC<LiteLLMConfigProps> = ({ id, cardId }) => {
  return (
    <div className="h-full w-full bg-[var(--colors-background)] relative flex flex-col">
      {/* Inject the live LiteLLM Admin UI. 
        Because it's wrapped in a WebNode, it inherits all of EVAIX's spatial awareness 
        and can be manipulated by the AgentRuntime. 
      */}
      <WebNode 
        id={id || cardId || 'litellm-ui-instance'} 
        cardId={cardId} 
        initialUrl="http://localhost:4000/ui" 
      />
    </div>
  );
};
