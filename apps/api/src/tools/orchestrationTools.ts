import { prisma } from '../db.js';
import type { SandboxTool } from '../types.js';

export const orchestrationTools: SandboxTool[] = [
  {
    name: 'list_roles',
    description: 'List all available AI roles (agents) that can be assigned to orchestration nodes.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      });

      return [{
        type: 'text',
        text: JSON.stringify(roles, null, 2),
      }];
    },
  },
  {
    name: 'create_orchestration_node',
    description: 'Create a new execution node in an orchestration workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        orchestrationId: { type: 'string', description: 'ID of the orchestration workflow.' },
        roleId: { type: 'string', description: 'ID of the role to assign to this node.' },
        task: { type: 'string', description: 'The specific task or prompt for this node.' },
        metadata: { type: 'object', description: 'Optional layout or execution metadata.' },
      },
      required: ['orchestrationId', 'roleId', 'task'],
    },
    handler: async (args: unknown) => {
        const typedArgs = args as any;
        const orch = await prisma.orchestration.findUnique({ where: { id: typedArgs.orchestrationId } });
        if (!orch) throw new Error(`Orchestration ${typedArgs.orchestrationId} not found.`);

        const cells = (orch.cells as any[]) || [];
        const newNode = {
            id: 'node-' + Date.now(),
            roleId: typedArgs.roleId,
            task: typedArgs.task,
            metadata: typedArgs.metadata || {},
            links: []
        };
        cells.push(newNode);

        await prisma.orchestration.update({
            where: { id: typedArgs.orchestrationId },
            data: { cells: cells as any }
        });

        return [{
            type: 'text',
            text: `✅ Node created successfully in orchestration "${orch.name}". Node ID: ${newNode.id}`
        }];
    }
  },
  {
    name: 'link_orchestration_nodes',
    description: 'Link two nodes in an orchestration workflow to define execution order (A -> B).',
    inputSchema: {
      type: 'object',
      properties: {
        orchestrationId: { type: 'string' },
        sourceNodeId: { type: 'string' },
        targetNodeId: { type: 'string' },
      },
      required: ['orchestrationId', 'sourceNodeId', 'targetNodeId'],
    },
    handler: async (args: unknown) => {
        const typedArgs = args as any;
        const orch = await prisma.orchestration.findUnique({ where: { id: typedArgs.orchestrationId } });
        if (!orch) throw new Error(`Orchestration ${typedArgs.orchestrationId} not found.`);

        const cells = (orch.cells as any[]) || [];
        const sourceNode = cells.find(c => c.id === typedArgs.sourceNodeId);
        if (!sourceNode) throw new Error(`Source node ${typedArgs.sourceNodeId} not found.`);

        if (!sourceNode.links) sourceNode.links = [];
        sourceNode.links.push(typedArgs.targetNodeId);

        await prisma.orchestration.update({
            where: { id: typedArgs.orchestrationId },
            data: { cells: cells as any }
        });

        return [{
            type: 'text',
            text: `✅ Linked ${typedArgs.sourceNodeId} to ${typedArgs.targetNodeId} in orchestration "${orch.name}".`
        }];
    }
  }
];
