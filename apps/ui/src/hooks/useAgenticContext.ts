import { useEffect, useRef } from 'react';
import { useAgenticWorkspaceStore } from '../stores/agenticWorkspace.store.js';
import type { AgenticNodePayload } from '../stores/agenticWorkspace.store.js';

export function useAgenticContext(payload: Omit<AgenticNodePayload, 'isIncluded'> & { defaultIncluded?: boolean }) {
  const registerNode = useAgenticWorkspaceStore(state => state.registerNode);
  const unregisterNode = useAgenticWorkspaceStore(state => state.unregisterNode);

  const payloadRef = useRef(payload);

  // Update the ref whenever payload changes so we don't have stale closures
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    if (!payload.id) return;

    // Register node passing a wrapper that delegates to the latest payload in the ref
    registerNode({
      id: payload.id,
      type: payload.type,
      title: payload.title,
      isIncluded: payload.defaultIncluded ?? false,
      getContext: () => payloadRef.current.getContext(),
      applyMutation: (mutationAction) => payloadRef.current.applyMutation ? payloadRef.current.applyMutation(mutationAction) : Promise.resolve(false)
    });

    return () => unregisterNode(payload.id);
  }, [payload.id, payload.type, payload.title, registerNode, unregisterNode, payload.defaultIncluded]);
}
