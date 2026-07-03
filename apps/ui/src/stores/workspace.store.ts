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

  // Aliases/compatibility properties for initial bootstrap / client code
  activeCards: CardData[];
  setCardContent: (id: string, componentId: string) => void;
  
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
  spawnApp: (appId: string, props?: Record<string, unknown>, targetColumn?: number) => void;
  executeAgent: (contextStrategy?: string) => void;

  // [NEW] Column Focus State
  focusedCardIds: Record<number, string>;
  setFocusedCardId: (colIndex: number, cardId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      columns: 2,
      setColumns: (columns) => set({ columns: Math.max(1, Math.min(4, columns)) }),
      showSidebar: false,
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      setSidebarOpen: (open) => set({ showSidebar: open }),
      
      showControlPlane: false,
      toggleControlPlane: () => set((state) => ({ showControlPlane: !state.showControlPlane })),
      cards: [
        {
          id: 'card-1',
          roleId: '',
          column: 0,
          columnId: 0,
          rowIndex: 0,
          screenspaceId: 1,
          displayId: 1,
          appId: 'litellm-ui',
          title: 'LITELLM-UI',
          props: { initialUrl: 'http://127.0.0.1:4001/ui' }
        },
        {
          id: 'card-2',
          roleId: '',
          column: 1,
          columnId: 1,
          rowIndex: 0,
          screenspaceId: 1,
          displayId: 1,
          appId: 'openwebui',
          title: 'OPENWEBUI',
          props: { initialUrl: 'http://localhost:8080' }
        }
      ],
      activeCards: [
        {
          id: 'card-1',
          roleId: '',
          column: 0,
          columnId: 0,
          rowIndex: 0,
          screenspaceId: 1,
          displayId: 1,
          appId: 'litellm-ui',
          title: 'LITELLM-UI',
          props: { initialUrl: 'http://127.0.0.1:4001/ui' }
        },
        {
          id: 'card-2',
          roleId: '',
          column: 1,
          columnId: 1,
          rowIndex: 0,
          screenspaceId: 1,
          displayId: 1,
          appId: 'openwebui',
          title: 'OPENWEBUI',
          props: { initialUrl: 'http://localhost:8080' }
        }
      ],
      focusedCardIds: {
        0: 'card-1',
        1: 'card-2'
      },
      setFocusedCardId: (colIndex, cardId) => set((state) => ({
        focusedCardIds: { ...state.focusedCardIds, [colIndex]: cardId }
      })),
      setCards: (cards) => set({ cards, activeCards: cards }),
      addCard: (card) => set((state) => {
        const nextCards = [...state.cards, card];
        const targetCol = card.columnId ?? card.column ?? 0;
        return { 
          cards: nextCards, 
          activeCards: nextCards,
          focusedCardIds: { ...state.focusedCardIds, [targetCol]: card.id }
        };
      }),
      removeCard: (id) => set((state) => {
        const nextCards = state.cards.filter(c => c.id !== id);
        return { cards: nextCards, activeCards: nextCards };
      }),
      updateCard: (id, updates) => set((state) => {
        const nextCards = state.cards.map(c => c.id === id ? { ...c, ...updates } : c);
        return { cards: nextCards, activeCards: nextCards };
      }),
      setCardContent: (id, componentId) => set((state) => {
        const nextCards = state.cards.map(c => 
          c.id === id ? { 
            ...c, 
            appId: componentId, 
            activeTool: componentId, 
            metadata: { ...c.metadata, viewMode: componentId } 
          } : c
        );
        return { cards: nextCards, activeCards: nextCards };
      }),

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
            const maxDisplay = state.screenspaces.length > 0 ? state.screenspaces.length - 1 : 0;
            targetDisplay = currentDisplay > 0 ? currentDisplay - 1 : maxDisplay;
            targetCol = Math.max(0, state.columns - 1);
          } else if (direction === 'right' && targetCol >= state.columns) {
            const maxDisplay = state.screenspaces.length > 0 ? state.screenspaces.length - 1 : 0;
            targetDisplay = currentDisplay < maxDisplay ? currentDisplay + 1 : 0;
            targetCol = 0;
          }

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

          return { 
            cards: updatedCards, 
            activeCards: updatedCards,
            focusedCardIds: { ...state.focusedCardIds, [targetCol]: cardId }
          };
        }

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

        return { cards: updatedCards, activeCards: updatedCards };
      }),

      spawnApp: (appId, props, targetColumn) => set((state) => {
        const nextCol = targetColumn !== undefined ? targetColumn : (state.cards.length % state.columns);
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
        const nextCards = [...state.cards, newCard];
        return { 
          cards: nextCards, 
          activeCards: nextCards,
          focusedCardIds: { ...state.focusedCardIds, [nextCol]: newCard.id }
        };
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

        const nextCards = [...state.cards, clonedCard];
        return { cards: nextCards, activeCards: nextCards };
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
        
        const nextCards = [...state.cards, newPanel];
        return {
          cards: nextCards,
          activeCards: nextCards
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
        return { cards: initialCards, activeCards: initialCards };
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
      version: 2, // [NEW] Bump version to forcefully invalidate broken cache
      partialize: (state) => ({
        columns: state.columns,
        cards: state.cards,
        activeCards: state.cards,
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
