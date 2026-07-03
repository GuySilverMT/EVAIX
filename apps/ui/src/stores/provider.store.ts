import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ModelConfig {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: ModelConfig[];
}

interface ProviderState {
  routingLogic: string;
  setRoutingLogic: (logic: string) => void;
  
  providers: ProviderConfig[];
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
}

/**
 * provider.store.ts — Dynamic Provider & Model Registry for EVAIX AvexBar.
 * Starts with EXACTLY 0 providers configured (framework paradigm).
 */
export const useProviderStore = create<ProviderState>()(
  persist(
    (set) => ({
      routingLogic: 'Round Robin',
      setRoutingLogic: (logic) => set({ routingLogic: logic }),
      
      // Starts clean: 0 providers configured
      providers: [],
      activeProviderId: null,
      activeModelId: null,
      activeRoleId: null,

      addProvider: (provider) => set((state) => ({
        providers: [...state.providers, provider],
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
    }),
    {
      name: 'evaix-provider-storage'
    }
  )
);
