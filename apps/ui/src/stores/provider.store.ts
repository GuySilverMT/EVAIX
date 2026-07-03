import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  color?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  color?: string;
  apiKey?: string;
  baseUrl?: string;
  models: ModelConfig[];
}

export interface RoleConfig {
  id: string;
  name: string;
  color?: string;
}

interface ProviderState {
  routingLogic: string;
  setRoutingLogic: (logic: string) => void;
  
  providers: ProviderConfig[];
  roles: RoleConfig[];
  activeProviderId: string | null;
  activeModelId: string | null;
  activeRoleId: string | null;
  
  // Actions
  addProvider: (provider: ProviderConfig) => void;
  removeProvider: (id: string) => void;
  toggleProvider: (id: string) => void;
  toggleModel: (providerId: string, modelId: string) => void;
  setActiveProvider: (id: string | null) => void;
  setActiveModel: (id: string | null) => void;
  setActiveRole: (role: string | null) => void;
  setRoles: (roles: RoleConfig[]) => void;
}

const DEFAULT_ROLES: RoleConfig[] = [
  { id: 'Junior Coder', name: 'Junior Coder', color: '#e056d5' },
  { id: 'System Architect', name: 'System Architect', color: '#3b82f6' },
  { id: 'UI Designer', name: 'UI Designer', color: '#10b981' },
  { id: 'Code Reviewer', name: 'Code Reviewer', color: '#f59e0b' },
];

/**
 * provider.store.ts — Dynamic Provider & Model Registry for EVAIX AvexBar.
 * Starts with EXACTLY 0 providers configured (framework paradigm).
 */
export const useProviderStore = create<ProviderState>()(
  persist(
    (set) => ({
      routingLogic: 'Round Robin',
      setRoutingLogic: (logic) => set({ routingLogic: logic }),
      
      providers: [],
      roles: DEFAULT_ROLES,
      activeProviderId: null,
      activeModelId: null,
      activeRoleId: 'Junior Coder',

      addProvider: (provider) => set((state) => ({
        providers: [...state.providers, { ...provider, color: provider.color || '#16c522' }],
        activeProviderId: state.activeProviderId || provider.id,
        activeModelId: state.activeModelId || (provider.models[0]?.id ?? null)
      })),

      removeProvider: (id) => set((state) => ({
        providers: state.providers.filter(p => p.id !== id),
        activeProviderId: state.activeProviderId === id ? null : state.activeProviderId
      })),

      toggleProvider: (id) => set((state) => ({
        providers: state.providers.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
      })),

      toggleModel: (providerId, modelId) => set((state) => ({
        providers: state.providers.map(p => {
          if (p.id !== providerId) return p;
          return {
            ...p,
            models: p.models.map(m => m.id === modelId ? { ...m, enabled: !m.enabled } : m)
          };
        })
      })),

      setActiveProvider: (id) => set({ activeProviderId: id }),
      setActiveModel: (id) => set({ activeModelId: id }),
      setActiveRole: (role) => set({ activeRoleId: role }),
      setRoles: (roles) => set({ roles }),
    }),
    {
      name: 'evaix-provider-storage'
    }
  )
);
