import { prisma } from "../db.js";
import { RoleFactoryService } from "../services/RoleFactoryService.js";
import type { SandboxTool } from "../types.js";

interface RoleVariantEventArgs {
  roleId?: string;
  intent: {
    name: string;
    description: string;
    domain: string;
    complexity: "LOW" | "MEDIUM" | "HIGH";
    capabilities?: string[];
  };
}

interface RoleConfigPatchArgs {
  roleId: string;
  updates: {
    basePrompt?: string;
    tools?: string[];
  };
}

export const roleArchitectTools: SandboxTool[] = [
  {
    name: "role_registry_list",
    description:
      "List available personas and roles in the system. Use for discovery.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          basePrompt: true,
          tools: { include: { tool: true } },
        },
        orderBy: { name: "asc" },
      });

      const formatted = roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        tools: r.tools.map((rt) => rt.tool.name),
      }));

      return [
        {
          type: "text",
          text: JSON.stringify(formatted, null, 2),
        },
      ];
    },
  },
  {
    name: "role_variant_evolve",
    description:
      "Evolve a new Role Variant (DNA) using the Role Factory. High complexity operation that generates a complete personality and toolset.",
    inputSchema: {
      type: "object",
      properties: {
        roleId: {
          type: "string",
          description:
            "Optional ID of existing role to evolve. If omitted, a new Base Role is created.",
        },
        intent: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            domain: {
              type: "string",
              description: 'e.g. "Frontend", "Backend", "Creative"',
            },
            complexity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            capabilities: { type: "array", items: { type: "string" } },
          },
          required: ["name", "description", "domain", "complexity"],
        },
      },
      required: ["intent"],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as RoleVariantEventArgs;

      let roleId = typedArgs.roleId;
      if (!roleId) {
        const role = await prisma.role.create({
          data: {
            name: typedArgs.intent.name,
            description: typedArgs.intent.description,
            basePrompt: "You are a specialized agent.",
          },
        });
        roleId = role.id;
      }

      const factory = new RoleFactoryService();
      const variant = await factory.createRoleVariant(roleId, typedArgs.intent);

      return [
        {
          type: "text",
          text: `✅ Role Variant Evolved Successfully!
ID: ${variant.id}
Role: ${typedArgs.intent.name} (${roleId})
Identity: ${JSON.stringify((variant.identityConfig as any)?.personaName)}
Status: Ready for deployment.`,
        },
      ];
    },
  },
  {
    name: "upsert_role",
    description:
      "Create or update an AI role in the system. Use this to hire or train new agents.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Optional ID for updating an existing role.",
        },
        name: {
          type: "string",
          description: 'Name of the role (e.g. "Security Auditor")',
        },
        description: { type: "string" },
        basePrompt: {
          type: "string",
          description: "The detailed system prompt for the role.",
        },
        categoryName: { type: "string", default: "Uncategorized" },
        tools: {
          type: "array",
          items: { type: "string" },
          description: "List of tool names this role can use.",
        },
        needsVision: { type: "boolean" },
        needsCoding: { type: "boolean" },
        needsReasoning: { type: "boolean" },
        needsTools: { type: "boolean" },
        minContext: { type: "number" },
        maxContext: { type: "number" },
      },
      required: ["name", "basePrompt"],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as any;
      const factory = new RoleFactoryService();

      // Ensure category exists
      let category = await prisma.roleCategory.findUnique({
        where: { name: typedArgs.categoryName || "Uncategorized" },
      });
      if (!category) {
        category = await prisma.roleCategory.create({
          data: { name: typedArgs.categoryName || "Uncategorized" },
        });
      }

      const role = await prisma.role.upsert({
        where: { id: typedArgs.id || "new-role-" + Date.now() },
        update: {
          name: typedArgs.name,
          description: typedArgs.description,
          basePrompt: typedArgs.basePrompt,
          categoryId: category.id,
          metadata: {
            needsVision: typedArgs.needsVision,
            needsCoding: typedArgs.needsCoding,
            needsReasoning: typedArgs.needsReasoning,
            needsTools: typedArgs.needsTools,
            minContext: typedArgs.minContext,
            maxContext: typedArgs.maxContext,
          },
        },
        create: {
          name: typedArgs.name,
          description: typedArgs.description || "",
          basePrompt: typedArgs.basePrompt,
          categoryId: category.id,
          metadata: {
            needsVision: typedArgs.needsVision,
            needsCoding: typedArgs.needsCoding,
            needsReasoning: typedArgs.needsReasoning,
            needsTools: typedArgs.needsTools,
            minContext: typedArgs.minContext,
            maxContext: typedArgs.maxContext,
          },
        },
      });

      // Sync Tools
      if (typedArgs.tools) {
        await prisma.roleTool.deleteMany({ where: { roleId: role.id } });
        if (typedArgs.tools.length > 0) {
          const foundTools = await prisma.tool.findMany({
            where: { name: { in: typedArgs.tools } },
            select: { id: true },
          });

          if (foundTools.length > 0) {
            await prisma.roleTool.createMany({
              data: foundTools.map((tool) => ({
                roleId: role.id,
                toolId: tool.id,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      return [
        {
          type: "text",
          text: `✅ Role "${role.name}" (${role.id}) has been upserted successfully.`,
        },
      ];
    },
  },
  {
    name: "list_available_tools",
    description:
      "List all tools currently registered in the system that can be assigned to roles.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const tools = await prisma.tool.findMany({
        select: { name: true, description: true },
      });
      return [
        {
          type: "text",
          text: JSON.stringify(tools, null, 2),
        },
      ];
    },
  },
];

export async function canUseRoleArchitectTools(
  roleId: string,
): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { tools: { include: { tool: true } } },
  });

  return role?.tools.some((rt) => rt.tool.name === "role_architect") || false;
}
