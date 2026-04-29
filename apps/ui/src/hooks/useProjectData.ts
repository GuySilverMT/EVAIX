
import { useState, useEffect } from 'react';
import type { NebulaTree } from '@repo/nebula';

// Mock data definition
export interface ProjectData {
  id: string;
  name: string;
  tree: NebulaTree; 
}

const MOCK_PROJECTS: Record<string, ProjectData> = {
  'crm': {
    id: 'crm',
    name: 'CRM System',
    tree: {
      rootId: 'root',
      nodes: {
        root: {
          id: 'root',
          type: 'Box',
          props: { className: 'p-4' },
          children: ['welcome']
        },
        welcome: {
          id: 'welcome',
          type: 'Component',
          componentName: 'Card',
          props: { title: 'CRM Dashboard', description: 'Manage your customers from this central interface.' },
          children: []
        }
      },
      imports: [],
      exports: [],
      version: 1
    }
  },
  'new-app': {
    id: 'new-app',
    name: 'New Application',
    tree: {
        rootId: 'root',
        nodes: {
          root: {
            id: 'root',
            type: 'Box',
            props: { className: 'h-full flex items-center justify-center p-12' },
            children: ['welcome']
          },
          welcome: {
            id: 'welcome',
            type: 'Component',
            componentName: 'Button',
            props: { label: 'Click to start building', variant: 'primary' },
            children: []
          }
        },
        imports: [],
        exports: [],
        version: 1
    }
  }
};

export const useProjectData = (projectId?: string) => {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const project = MOCK_PROJECTS[projectId];
      if (project) {
        setData(project);
      } else {
        // Fallback or empty state for unknown projects
         setData({
            id: projectId,
            name: `Project ${projectId}`,
            tree: {
                rootId: 'root',
                nodes: {
                    'root': { id: 'root', type: 'Box', props: {}, children: [] }
                },
                imports: [],
                exports: [],
                version: 1
            }
         });
      }
      setLoading(false);
    }, 500);
  }, [projectId]);

  const save = async (newTree: NebulaTree) => {
    console.log(`Saving project ${projectId} with tree:`, newTree);
    if (data) {
        setData({ ...data, tree: newTree });
    }
    // Implement actual save logic here (e.g. API call)
    await Promise.resolve();
  };

  return { data, loading, save };
};
