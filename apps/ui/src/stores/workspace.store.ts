import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CardData {
  id: string;
  roleId: string;
  column: number;
  columnId?: number;
  rowIndex?: number;
  screenspaceId: number;
  displayId?: number;
  title?: string;
  type?: string;
  activeTool?: string | null;
  metadata?: Record<string, unknown>;
  appId?: string;
  props?: Record<string, unknown>;
}

interface Screenspace {
  id: number;
  name: string;
  cardIds: string[];
}

interface WorkspaceState {
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
  activeWorkspaceId: string | null;
  activeWorkspacePath: string | null;
  projectName: string | null;
  projectType: string | null;
  activeProject: { name: string | null; type: string | null } | null;
  activeModelId: string | null;
  recentProjects: string[];
  loadWorkspace: (id: string) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveWorkspacePath: (path: string | null) => void;
  setProjectName: (name: string | null) => void;
  setProjectType: (type: string | null) => void;
  setActiveModelId: (id: string | null) => void;
  setRecentProjects: (paths: string[]) => void;
  addRecentProject: (path: string) => void;
  initializeFromWorkspace: (projectType: string) => void;
  addPanel: (columnId: string) => void;

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

  // [NEW] System App routing (Settings, Property Panel, Accounts, Models, Provider)
  activeSystemApp: string | null;
  setActiveSystemApp: (app: string | null) => void;
  toggleSystemApp: (app: string) => void;

  // [NEW] Voice Wrapper Mode (Visual / Icon vs Command / Text)
  voiceMode: 'icon' | 'text';
  setVoiceMode: (mode: 'icon' | 'text') => void;
  toggleVoiceMode: () => void;

  // [NEW] Strict Spatial Routing Actions (No Dragging)
  moveCard: (cardId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  cloneCard: (cardId: string, targetDirection?: 'left' | 'right') => void;
  spawnApp: (appId: string, props?: Record<string, unknown>) => void;
  executeAgent: (contextStrategy?: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      columns: 2,
      // Clamp to 1–4; workflows may lock this value
      setColumns: (columns) => set({ columns: Math.max(1, Math.min(4, columns)) }),
      showSidebar: false,
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      setSidebarOpen: (open) => set({ showSidebar: open }),
      
      showControlPlane: false,
      toggleControlPlane: () => set((state) => ({ showControlPlane: !state.showControlPlane })),
      cards: [],
      setCards: (cards) => set({ cards }),
      addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
      removeCard: (id) => set((state) => ({ cards: state.cards.filter(c => c.id !== id) })),
      updateCard: (id, updates) => set((state) => ({
        cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c)
      })),

      moveCard: (cardId, direction) => set((state) => {
        const cardIndex = state.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return state;

        const card = state.cards[cardIndex];
        const currentCol = card.columnId ?? card.column ?? 0;
        const currentDisplay = card.displayId ?? card.screenspaceId ?? 0;

        if (direction === 'left' || direction === 'right') {
          let targetCol = direction === 'left' ? currentCol - 1 : currentCol + 1;
          let targetDisplay = currentDisplay;

          if (direction === 'left' && targetCol < 0) {
            // Move to last column of previous displayId
            const maxDisplay = state.screenspaces.length > 0 ? state.screenspaces.length - 1 : 0;
            targetDisplay = currentDisplay > 0 ? currentDisplay - 1 : maxDisplay;
            targetCol = Math.max(0, state.columns - 1);
          } else if (direction === 'right' && targetCol >= state.columns) {
            // Move to first column of next displayId
            const maxDisplay = state.screenspaces.length > 0 ? state.screenspaces.length - 1 : 0;
            targetDisplay = currentDisplay < maxDisplay ? currentDisplay + 1 : 0;
            targetCol = 0;
          }

          // Get cards in target display & target column to calculate new rowIndex
          const targetColCards = state.cards.filter(c => 
            (c.displayId ?? c.screenspaceId ?? 0) === targetDisplay && 
            (c.columnId ?? c.column ?? 0) === targetCol &&
            c.id !== cardId
          );

          const updatedCards = state.cards.map(c => {
            if (c.id === cardId) {
              return {
                ...c,
                column: targetCol,
                columnId: targetCol,
                displayId: targetDisplay,
                screenspaceId: targetDisplay,
                rowIndex: targetColCards.length
              };
            }
            return c;
          });

          return { cards: updatedCards };
        }

        // 'up' | 'down' -> Swap rowIndex of card with neighbor in same column
        const colCards = state.cards
          .filter(c => 
            (c.displayId ?? c.screenspaceId ?? 0) === currentDisplay && 
            (c.columnId ?? c.column ?? 0) === currentCol
          )
          .sort((a, b) => (a.rowIndex ?? 0) - (b.rowIndex ?? 0));

        const idxInCol = colCards.findIndex(c => c.id === cardId);
        if (idxInCol === -1) return state;

        const targetIdxInCol = direction === 'up' ? idxInCol - 1 : idxInCol + 1;
        if (targetIdxInCol < 0 || targetIdxInCol >= colCards.length) return state;

        const targetCard = colCards[targetIdxInCol];
        const currentRowIndex = colCards[idxInCol].rowIndex ?? idxInCol;
        const targetRowIndex = targetCard.rowIndex ?? targetIdxInCol;

        const updatedCards = state.cards.map(c => {
          if (c.id === cardId) {
            return { ...c, rowIndex: targetRowIndex };
          }
          if (c.id === targetCard.id) {
            return { ...c, rowIndex: currentRowIndex };
          }
          return c;
        });

        return { cards: updatedCards };
      }),

      spawnApp: (appId, props) => set((state) => {
        // Auto-assign to next column based on current card count to distribute them
        const nextCol = state.cards.length % state.columns;
        const colCards = state.cards.filter(c => (c.columnId ?? c.column ?? 0) === nextCol);
        const displayId = state.activeScreenspaceId || 0;
        const newCard: CardData = {
          id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          roleId: '',
          column: nextCol,
          columnId: nextCol,
          rowIndex: colCards.length,
          screenspaceId: displayId,
          displayId: displayId,
          appId,
          props
        };
        return { cards: [...state.cards, newCard] };
      }),

      executeAgent: (contextStrategy = 'Visible Card') => set((state) => {
        const timestamp = new Date().toLocaleTimeString();
        const info = `[EXECUTE AGENT] Strategy: ${contextStrategy} | Context Scope: ${state.aiContext.scope} | Time: ${timestamp}`;
        return {
          aiContext: {
            ...state.aiContext,
            contextBuffer: [...state.aiContext.contextBuffer, info]
          }
        };
      }),

      cloneCard: (cardId, targetDirection = 'right') => set((state) => {
        const card = state.cards.find(c => c.id === cardId);
        if (!card) return state;

        const targetCol = targetDirection === 'left'
          ? Math.max(0, card.column - 1)
          : Math.min(state.columns - 1, card.column + 1);

        const newId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const clonedCard: CardData = {
          ...card,
          id: newId,
          column: targetCol,
          title: card.title ? `${card.title} (Copy)` : undefined,
          metadata: card.metadata ? { ...card.metadata } : undefined
        };

        return { cards: [...state.cards, clonedCard] };
      }),

      activeWorkspace: null,
      activeWorkspaceId: null,
      activeWorkspacePath: null,
      projectName: null,
      projectType: null,
      activeProject: { name: null, type: null },
      activeModelId: null,
      recentProjects: [],
      loadWorkspace: (id: string) => set({ activeWorkspace: id }),
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id, activeWorkspacePath: id }),
      setActiveWorkspacePath: (path) => set({ activeWorkspacePath: path }),
      setProjectName: (name) => set((state) => ({ projectName: name, activeProject: { name, type: state.projectType } })),
      setProjectType: (type) => set((state) => ({ projectType: type, activeProject: { name: state.projectName, type } })),
      setActiveModelId: (id) => set({ activeModelId: id }),
      setRecentProjects: (paths) => set({ recentProjects: paths }),
      addRecentProject: (path) => set((state) => {
        const next = state.recentProjects.filter(p => p !== path);
        return { recentProjects: [path, ...next].slice(0, 10) }; // Keep top 10
      }),
      addPanel: (columnId: string) => set((state) => {
        const projectName = state.activeProject?.name || state.projectName || 'Document';
        
        let columnIndex = 0;
        if (columnId.startsWith('col-')) {
          columnIndex = parseInt(columnId.split('-')[1], 10) - 1;
        } else {
          columnIndex = parseInt(columnId, 10);
        }
        if (isNaN(columnIndex)) columnIndex = 0;
        
        const newName = `${projectName} C${columnIndex}`;
        
        const newPanel = {
          id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          roleId: '',
          column: columnIndex,
          screenspaceId: state.activeScreenspaceId,
          activeTool: 'editor', // FORCE the default view to be the editor
          title: newName,
          metadata: { viewMode: 'editor' }
        };
        
        return {
          cards: [...state.cards, newPanel]
        };
      }),

      initializeFromWorkspace: (projectType: string) => set(() => {
        let initialCards: CardData[] = [];
        if (projectType === 'CODE') {
           initialCards = [
             { id: '1', roleId: '', column: 0, screenspaceId: 1, metadata: { viewMode: 'files' } },
             { id: '2', roleId: '', column: 1, screenspaceId: 1, metadata: { viewMode: 'editor' } },
             { id: '3', roleId: '', column: 2, screenspaceId: 1, metadata: { viewMode: 'browser' } },
           ];
        } else if (projectType === 'DEPLOY') {
           initialCards = [
             { id: '1', roleId: '', column: 0, screenspaceId: 1, metadata: { viewMode: 'terminal' } },
             { id: '2', roleId: '', column: 1, screenspaceId: 1, metadata: { viewMode: 'terminal' } },
             { id: '3', roleId: '', column: 2, screenspaceId: 1, metadata: { viewMode: 'terminal' } },
           ];
        } else {
           initialCards = [
             { id: '1', roleId: '', column: 0, screenspaceId: 1 },
             { id: '2', roleId: '', column: 1, screenspaceId: 1 },
             { id: '3', roleId: '', column: 2, screenspaceId: 1 },
           ];
        }
        return { cards: initialCards };
      }),

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

      activeSystemApp: null,
      setActiveSystemApp: (app) => set({ activeSystemApp: app }),
      toggleSystemApp: (app) => set((state) => ({
        activeSystemApp: state.activeSystemApp === app ? null : app
      })),

      voiceMode: 'icon',
      setVoiceMode: (mode) => set({ voiceMode: mode }),
      toggleVoiceMode: () => set((state) => ({
        voiceMode: state.voiceMode === 'icon' ? 'text' : 'icon'
      })),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        columns: state.columns,
        cards: state.cards,
        activeScreenspaceId: state.activeScreenspaceId,
        activeWorkspaceId: state.activeWorkspaceId,
        activeWorkspacePath: state.activeWorkspacePath,
        projectName: state.projectName,
        projectType: state.projectType,
        activeProject: state.activeProject,
        activeModelId: state.activeModelId,
        recentProjects: state.recentProjects,
        voiceMode: state.voiceMode,
      }),
    }
  )
);
