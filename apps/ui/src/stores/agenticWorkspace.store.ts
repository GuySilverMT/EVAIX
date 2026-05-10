import { create } from 'zustand';

export interface AgenticNodePayload {
  id: string;          // Maps to the SDUI component ID
  type: string;        // 'browser', 'tiptap', 'db-table'
  title: string;
  isIncluded: boolean; // HUMAN CURATION: Does the user want this in the prompt?

  // PULL (UI -> AI): Lazy evaluation of the card's state
  getContext: () => Promise<{ format: 'markdown' | 'json'; content: string }>;

  // PUSH (AI -> UI): How this specific card handles AI-suggested mutations
  applyMutation?: (mutationAction: any) => Promise<boolean>;
}

interface WorkspaceState {
  nodes: Record<string, AgenticNodePayload>;
  registerNode: (payload: AgenticNodePayload) => void;
  unregisterNode: (id: string) => void;
  toggleContextInclusion: (id: string) => void;
  buildAggregatedContext: (targetRoleId?: string) => Promise<string>;
}

export const useAgenticWorkspaceStore = create<WorkspaceState>((set, get) => ({
  nodes: {},
  registerNode: (payload) => set((state) => ({
    nodes: { ...state.nodes, [payload.id]: payload }
  })),
  unregisterNode: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.nodes;
    return { nodes: rest };
  }),
  toggleContextInclusion: (id) => set((state) => {
    const node = state.nodes[id];
    if (!node) return state;
    return {
      nodes: {
        ...state.nodes,
        [id]: { ...node, isIncluded: !node.isIncluded }
      }
    };
  }),
  buildAggregatedContext: async (targetRoleId) => {
    const { nodes } = get();
    const includedNodes = Object.values(nodes).filter(node => node.isIncluded);

    let contextParts = [];
    for (const node of includedNodes) {
      const ctx = await node.getContext();
      contextParts.push(`\n--- Card Context: ${node.title} (${node.type}) ---\n`);
      if (ctx.format === 'json') {
          contextParts.push("```json\n" + ctx.content + "\n```");
      } else {
          contextParts.push(ctx.content);
      }
    }

    return contextParts.join("\n");
  }
}));
