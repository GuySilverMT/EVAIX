import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CardData {
  id: string;
  roleId: string;
  column: number;
  screenspaceId: number;
  title?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface Screenspace {
  id: number;
  name: string;
  cardIds: string[];
}

export interface WorkspaceState {
  columns: number;
  setColumns: (columns: number) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Cards State (Application Wide)
  cards: CardData[];
  setCards: (cards: CardData[]) => void;
  addCard: (card: CardData) => void;
  removeCard: (id: string) => void;
  updateCard: (id: string, updates: Partial<CardData>) => void;
  
  // Workspace Loading
  activeWorkspace: string | null;
  loadWorkspace: (id: string) => void;

  // AI Context (Application Wide)
  aiContext: {
    scope: string; // 'Global', 'Workspace', 'Card:ID'
    isLimiting: boolean;
    injectedState: boolean;
    contextBuffer: string[]; // [NEW]
  };
  setAiContext: (context: Partial<WorkspaceState['aiContext']>) => void;
  appendContextBuffer: (markdown: string) => void; // [NEW]

  // Screenspaces
  activeScreenspaceId: number;
  screenspaces: Screenspace[];
  switchScreenspace: (id: number) => void;

  // Zero-Trust Control Plane
  showControlPlane: boolean;
  toggleControlPlane: () => void;

  // [NEW] Workflow system — drives AgentWorkbench column layout
  activeWorkflow: string | null; // e.g. 'provider' | 'org' | 'datacenter' | 'settings' | 'voice'
  setActiveWorkflow: (workflow: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      columns: 3,
      // Clamp to 2–4; workflows may lock this value
      setColumns: (columns) => set({ columns: Math.max(2, Math.min(4, columns)) }),
      showSidebar: false,
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      setSidebarOpen: (open) => set({ showSidebar: open }),
      
      showControlPlane: false,
      toggleControlPlane: () => set((state) => ({ showControlPlane: !state.showControlPlane })),
      cards: [
        { id: '1', roleId: '', column: 0, screenspaceId: 1 },
        { id: '2', roleId: '', column: 0, screenspaceId: 1 },
        { id: '3', roleId: '', column: 1, screenspaceId: 1 },
        { id: '4', roleId: '', column: 1, screenspaceId: 1 },
        { id: '5', roleId: '', column: 2, screenspaceId: 1 },
        { id: '6', roleId: '', column: 2, screenspaceId: 1 },
        // Refactor screenspace
        { id: 'r1', roleId: '', column: 0, screenspaceId: 2 },
        { id: 'r2', roleId: '', column: 1, screenspaceId: 2 },
        { id: 'r3', roleId: '', column: 2, screenspaceId: 2 },
        // Logs screenspace
        { id: 'l1', roleId: '', column: 0, screenspaceId: 3 },
        { id: 'l2', roleId: '', column: 1, screenspaceId: 3 },
        { id: 'l3', roleId: '', column: 2, screenspaceId: 3 },
      ],
      setCards: (cards) => set({ cards }),
      addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
      removeCard: (id) => set((state) => ({ cards: state.cards.filter(c => c.id !== id) })),
      updateCard: (id, updates) => set((state) => ({
        cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c)
      })),

      activeWorkspace: null,
      loadWorkspace: (id: string) => set({ activeWorkspace: id }),

      aiContext: {
        scope: 'Global',
        isLimiting: false,
        injectedState: false,
        contextBuffer: []
      },
      setAiContext: (ctx) => set((state) => ({ aiContext: { ...state.aiContext, ...ctx } })),
      appendContextBuffer: (markdown) => set((state) => ({ 
        aiContext: { 
          ...state.aiContext, 
          contextBuffer: [...state.aiContext.contextBuffer, markdown] 
        } 
      })),

      activeScreenspaceId: 1,
      screenspaces: [
        { id: 1, name: 'Main', cardIds: [] },
        { id: 2, name: 'Refactor', cardIds: [] },
        { id: 3, name: 'Logs', cardIds: [] },
      ],
      switchScreenspace: (id) => set({ activeScreenspaceId: id }),

      activeWorkflow: null,
      setActiveWorkflow: (workflow) => set({ activeWorkflow: workflow }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        columns: state.columns,
        cards: state.cards,
        activeScreenspaceId: state.activeScreenspaceId,
        // Do NOT persist activeWorkflow — always start fresh
      }),
    }
  )
);
