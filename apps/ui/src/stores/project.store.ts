import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProjectNode {
  id: string;
  name: string;
  type: string; // e.g. 'code', 'writing', 'datacenter', 'custom'
  path: string;
  children?: ProjectNode[];
  metadata?: Record<string, unknown>;
}

interface ProjectState {
  projects: ProjectNode[];
  activeProjectId: string | null;
  projectTypes: string[];
  
  addProject: (project: ProjectNode) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  addProjectType: (type: string) => void;
}

/**
 * project.store.ts — Dynamic Hierarchical Project Tree Store for EVAIX ProjectNavigator.
 * Starts with EXACTLY 0 projects configured (framework paradigm).
 */
export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,
      projectTypes: ['coding', 'writing', 'research', 'general'],

      addProject: (project) => set((state) => ({
        projects: [...state.projects, project],
        activeProjectId: state.activeProjectId || project.id
      })),

      removeProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
      })),

      setActiveProject: (id) => set({ activeProjectId: id }),
      addProjectType: (type) => set((state) => ({
        projectTypes: Array.from(new Set([...state.projectTypes, type]))
      })),
    }),
    {
      name: 'evaix-project-storage'
    }
  )
);
