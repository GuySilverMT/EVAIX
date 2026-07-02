import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProjectScopedRole {
  id: string;
  name: string;
  systemPrompt: string;
  category?: string;
}

export interface ProjectNode {
  id: string;
  name: string;
  parentId: string | null;
  attachedDocs: string[]; // VFS file paths attached to this project node
  inheritedLayout?: {
    columns: number;
    defaultTools: string[];
  };
  projectScopedRoles: ProjectScopedRole[];
  childrenIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  projects: Record<string, ProjectNode>;
  activeProjectId: string | null;
  
  // Actions
  createProject: (name: string, parentId?: string | null) => ProjectNode;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  attachDocToProject: (projectId: string, docPath: string) => void;
  removeDocFromProject: (projectId: string, docPath: string) => void;
  addProjectScopedRole: (projectId: string, role: ProjectScopedRole) => void;
  updateProjectInheritedLayout: (projectId: string, layout: ProjectNode['inheritedLayout']) => void;
  
  // Helpers
  getProjectAncestry: (id: string) => ProjectNode[];
  getEffectiveRoles: (id: string) => ProjectScopedRole[];
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: {}, // OS directory tree starting empty
      activeProjectId: null,

      createProject: (name, parentId = null) => {
        const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const parent = parentId ? get().projects[parentId] : null;

        // Inherit parent layout & metadata if existing
        const inheritedLayout = parent?.inheritedLayout || {
          columns: 3,
          defaultTools: ['chat', 'docs', 'sheets', 'prompt']
        };

        const newProject: ProjectNode = {
          id,
          name,
          parentId,
          attachedDocs: [],
          inheritedLayout,
          projectScopedRoles: [],
          childrenIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set((state) => {
          const nextProjects = { ...state.projects, [id]: newProject };
          
          // Link to parent's childrenIds
          if (parentId && nextProjects[parentId]) {
            nextProjects[parentId] = {
              ...nextProjects[parentId],
              childrenIds: [...nextProjects[parentId].childrenIds, id],
              updatedAt: new Date().toISOString()
            };
          }

          return {
            projects: nextProjects,
            activeProjectId: state.activeProjectId || id
          };
        });

        return newProject;
      },

      deleteProject: (id) => {
        set((state) => {
          const project = state.projects[id];
          if (!project) return state;

          const nextProjects = { ...state.projects };
          delete nextProjects[id];

          // Remove reference from parent
          if (project.parentId && nextProjects[project.parentId]) {
            nextProjects[project.parentId] = {
              ...nextProjects[project.parentId],
              childrenIds: nextProjects[project.parentId].childrenIds.filter(cid => cid !== id)
            };
          }

          return {
            projects: nextProjects,
            activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
          };
        });
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      attachDocToProject: (projectId, docPath) => {
        set((state) => {
          const proj = state.projects[projectId];
          if (!proj || proj.attachedDocs.includes(docPath)) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...proj,
                attachedDocs: [...proj.attachedDocs, docPath],
                updatedAt: new Date().toISOString()
              }
            }
          };
        });
      },

      removeDocFromProject: (projectId, docPath) => {
        set((state) => {
          const proj = state.projects[projectId];
          if (!proj) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...proj,
                attachedDocs: proj.attachedDocs.filter(d => d !== docPath),
                updatedAt: new Date().toISOString()
              }
            }
          };
        });
      },

      addProjectScopedRole: (projectId, role) => {
        set((state) => {
          const proj = state.projects[projectId];
          if (!proj) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...proj,
                projectScopedRoles: [...proj.projectScopedRoles, role],
                updatedAt: new Date().toISOString()
              }
            }
          };
        });
      },

      updateProjectInheritedLayout: (projectId, layout) => {
        set((state) => {
          const proj = state.projects[projectId];
          if (!proj) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...proj,
                inheritedLayout: layout,
                updatedAt: new Date().toISOString()
              }
            }
          };
        });
      },

      getProjectAncestry: (id) => {
        const ancestry: ProjectNode[] = [];
        let currId: string | null = id;

        while (currId && get().projects[currId]) {
          const node = get().projects[currId];
          ancestry.unshift(node);
          currId = node.parentId;
        }

        return ancestry;
      },

      getEffectiveRoles: (id) => {
        const ancestry = get().getProjectAncestry(id);
        const rolesMap: Record<string, ProjectScopedRole> = {};

        ancestry.forEach(node => {
          node.projectScopedRoles.forEach(r => {
            rolesMap[r.id] = r;
          });
        });

        return Object.values(rolesMap);
      }
    }),
    {
      name: 'evaix-project-tree-storage'
    }
  )
);
