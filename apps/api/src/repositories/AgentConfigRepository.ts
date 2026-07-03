import type { Role, RoleTool, Tool, Model, ModelCapabilities, ProviderConfig, AgentConfig, FileIndex, Job, RoleVariant } from '../prisma-types.js';
import { prisma } from '../db.js';
import type { ModelDef } from '../interfaces/IAgentConfigRepository.js';

export class AgentConfigRepository {
  static async getRole(roleId: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id: roleId } });
  }

  static async getEffectiveRole(roleId: string): Promise<Role | null> {
    const role = await this.getRole(roleId);
    if (!role) return null;
    return role;
  }

  static async getModel(providerId: string, modelId: string): Promise<Model | null> {
    return prisma.model.findUnique({
      where: { providerId_name: { providerId, name: modelId } }
    });
  }

  static async createModel(modelDef: ModelDef): Promise<Model> {
    const name = modelDef.name || modelDef.id;
    return prisma.model.create({
      data: {
        id: `${modelDef.providerId}:${name}`,
        provider: { connect: { id: modelDef.providerId } },
        name,
        // Pack transient/spec fields into the specs JSON
        costPer1k: modelDef.costPer1k ?? 0,
        // isFree: modelDef.isFree ?? false,
        providerData: (modelDef.providerData ?? {}) as unknown as unknown,
        capabilities: {
          create: {
            contextWindow: modelDef.contextWindow ?? 4096,
            hasVision: modelDef.hasVision ?? false,
            specs: {
              hasReasoning: modelDef.hasReasoning ?? false,
              hasCoding: modelDef.hasCoding ?? false,
              lastUpdated: new Date().toISOString()
            }
          }
        }
      }
    });
  }


}
