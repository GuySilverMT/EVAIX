import { prisma } from '../db.js';
import type { SandboxTool } from '../types.js';
import { SkillFinderService } from '../services/SkillFinderService.js';
import { McpToolSyncService } from '../services/McpToolSyncService.js';
import { RoleFactoryService } from '../services/RoleFactoryService.js';
import { AgentRuntime } from '../services/AgentRuntime.js';

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
  },
  {
    name: 'hire_specialist',
    description: 'JIT Skill Acquisition: Downloads an MCP skill, syncs it, and creates a dynamic role for a specific job.',
    inputSchema: {
        type: 'object',
        properties: {
            job_description: { type: 'string', description: 'The task this specialist will perform.' },
            skill_url: { type: 'string', description: 'URL to the skill zip/tarball to download.' }
        },
        required: ['job_description', 'skill_url']
    },
    handler: async (args: unknown) => {
        const typedArgs = args as { job_description: string, skill_url: string };
        const skillService = new SkillFinderService();
        const roleFactory = new RoleFactoryService();

        let installResult;
        try {
            // Await downloadAndInstallSkill
            installResult = await skillService.downloadAndInstallSkill(typedArgs.skill_url);
        } catch (err: any) {
            // Cognitive Recovery: dispatch coding-agent to fix the broken skill package
            console.error(`[Headhunter] Failed to install skill: ${err.message}`);
            const errorPayload = {
                file_path: err.path || 'unknown',
                stack_trace: err.stack || err.message,
                message: err.message
            };

            console.log(`[Headhunter] 🛠️ Dispatching cognitive recovery coding-agent...`);
            const recoveryRuntime = await AgentRuntime.create(process.cwd(), ['terminal_execute', 'read_file', 'write_file'], 'coding-agent');
            await recoveryRuntime.executeTask(
                `recovery-${Date.now()}`,
                'vfs-token-dummy',
                `Fix the broken skill installation for ${typedArgs.skill_url}. Error: ${JSON.stringify(errorPayload)}`
            );
            console.log(`[Headhunter] 🛠️ Recovery worker finished. Resuming skill installation...`);

            // Retry install after recovery attempt
            installResult = await skillService.downloadAndInstallSkill(typedArgs.skill_url);
        }

        // Await syncServer
        const syncResult = await McpToolSyncService.syncServer(installResult.slug);
        if (!syncResult.success) {
            throw new Error(`Failed to sync MCP tools from ${installResult.slug}: ${syncResult.error}`);
        }

        // Await createDynamicRole
        const role = await roleFactory.createDynamicRole(typedArgs.job_description, installResult.slug, syncResult.tools || []);

        return [{
            type: 'text',
            text: `✅ Successfully hired specialist. Role ID: ${role.id}, Name: ${role.name}`
        }];
    }
  }
];
