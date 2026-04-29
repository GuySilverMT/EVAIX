import type { SandboxTool } from '../types.js';

export const uiArchitectTools: SandboxTool[] = [
  {
    name: 'ui_architect_tree_inspect',
    description: 'Read-only access to the current UI state. Use this to discover the structure, node IDs, and available components before making changes.',
    inputSchema: {
      type: 'object',
      properties: {
        nodePath: { type: 'string', description: 'Optional path or ID to inspect. If omitted, returns the root of the active UI tree.' }
      },
    },
    handler: async (args: unknown) => {
        const typedArgs = args as Record<string, any>;
        return [{
            type: 'text',
            text: JSON.stringify({
                status: 'success',
                ui_action: {
                    tool: 'nebula',
                    action: 'tree_inspect',
                    ...typedArgs
                },
                message: "UI tree inspection requested."
            }, null, 2)
        }];
    },
  },
  {
    name: 'ui_architect_node_mutate',
    description: 'Surgically update existing UI components. Use this for changing properties, styles, or moving/deleting nodes. Requires knowing the nodeId.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { 
            type: 'string', 
            enum: ['updateNode', 'moveNode', 'deleteNode', 'setTheme'],
            description: 'The operation to perform on the node.'
        },
        nodeId: {
            type: 'string',
            description: 'The ID of the node to manipulate.'
        },
        update: {
            type: 'object',
            description: 'The properties to update (required for updateNode).'
        },
        targetParentId: {
            type: 'string',
            description: 'The new parent ID (required for moveNode).'
        },
        index: {
            type: 'number',
            description: 'The index to insert/move the node to (required for moveNode).'
        },
        theme: {
            type: 'object',
            description: 'The theme configuration (required for setTheme).',
            properties: {
                primary: { type: 'string' },
                radius: { type: 'number' },
                font: { type: 'string' }
            }
        }
      },
      required: ['action']
    },
    handler: async (args: unknown) => {
        const typedArgs = args as Record<string, any>;
        return {
            status: 'success',
            ui_action: {
                tool: 'nebula',
                ...typedArgs
            },
            message: `UI Mutation '${typedArgs.action}' queued.`
        };
    },
  },
  {
    name: 'ui_factory_layout_generate',
    description: 'Complex structural changes or new page generation. Use this to add new nodes or ingest raw JSX layouts.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { 
            type: 'string', 
            enum: ['addNode', 'ingest'],
            description: 'The operation to perform.'
        },
        parentId: { 
            type: 'string',
            description: 'The ID of the parent node.'
        },
        node: {
            type: 'object',
            description: 'The node definition (required for addNode).',
            properties: {
                type: { type: 'string', enum: ['Box', 'Text', 'Button', 'Card', 'Image', 'Input', 'Icon'] },
                props: { type: 'object' },
                style: { type: 'object' },
                layout: { type: 'object' },
                bindings: { 
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            propName: { type: 'string' },
                            sourcePath: { type: 'string' }
                        }
                    }
                },
                actions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            trigger: { type: 'string', enum: ['onClick', 'onSubmit'] },
                            type: { type: 'string', enum: ['navigate', 'mutation', 'toast'] },
                            payload: { type: 'object' }
                        }
                    }
                },
                meta: { type: 'object' }
            }
        },
        rawJsx: {
          type: 'string',
          description: 'The raw JSX string to ingest (required for ingest).'
        }
      },
      required: ['action']
    },
    handler: async (args: unknown) => {
        const typedArgs = args as Record<string, any>;
        return {
            status: 'success',
            ui_action: {
                tool: 'nebula',
                ...typedArgs
            },
            message: `UI Factory generation '${typedArgs.action}' started.`
        };
    },
  }
];
