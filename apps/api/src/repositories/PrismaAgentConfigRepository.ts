import { IAgentConfigRepository, RoleWithTools } from "../interfaces/IAgentConfigRepository.js";
import { prisma } from "../db.js";
import { Role, Model, Prisma } from "@prisma/client";
import type { ModelDef } from "../interfaces/IAgentConfigRepository.js";

export class PrismaAgentConfigRepository implements IAgentConfigRepository {
  async getRole(roleId: string): Promise<RoleWithTools | null> {
    const include = { tools: { include: { tool: true } } };
    const byId = await prisma.role.findUnique({ where: { id: roleId }, include });
    if (byId) return byId as unknown as RoleWithTools;

    const byName = await prisma.role.findFirst({
        where: { name: roleId },
        include
    });
    return byName as unknown as RoleWithTools;
  }

  async getEffectiveRole(roleId: string): Promise<RoleWithTools | null> {
    const role = await this.getRole(roleId);
    if (!role) return null;
    return role; // Returning Role, caller handles metadata parsing if needed
  }

  async getModel(providerId: string, modelId: string): Promise<Model | null> {
    return prisma.model.findFirst({
      where: { providerId, name: modelId }
    });
  }

  async createModel(modelDef: ModelDef): Promise<Model> {
    const name = modelDef.name || modelDef.id;
    return prisma.model.create({
      data: {
        id: `${modelDef.providerId}:${name}`,
        provider: { connect: { id: modelDef.providerId } },
        name,
        costPer1k: modelDef.costPer1k ?? 0,
        // isFree: modelDef.isFree ?? false,
        providerData: (modelDef.providerData ?? {}) as Prisma.InputJsonValue,
        capabilities: {
          create: {
            contextWindow: modelDef.contextWindow ?? 4096,
            hasVision: modelDef.hasVision ?? false,
            specs: {
              hasReasoning: modelDef.hasReasoning ?? false,
              hasCoding: modelDef.hasCoding ?? false,
              lastUpdated: new Date().toISOString()
            } as Prisma.InputJsonValue
          }
        }
      }
    });
  }



  async createRole(data: Prisma.RoleCreateInput): Promise<Role> {
      return prisma.role.create({ data });
  }
}
