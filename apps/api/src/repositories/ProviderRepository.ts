import type { Role, RoleTool, Tool, Model, ModelCapabilities, ProviderConfig, AgentConfig, FileIndex, Job, RoleVariant } from '../prisma-types.js';
import { IProviderRepository } from "../interfaces/IProviderRepository.js";
import { prisma } from "../db.js";

export class ProviderRepository implements IProviderRepository {
  async findProviderConfigByName(name: string): Promise<ProviderConfig | null> {
    return prisma.providerConfig.findFirst({
      where: { name }
    });
  }

  async findProviderConfigById(id: string): Promise<ProviderConfig | null> {
    return prisma.providerConfig.findUnique({
      where: { id }
    });
  }

  async createProviderConfig(values: any): Promise<void> {
    await prisma.providerConfig.create({
      data: values
    });
  }

  async getEnabledProviderConfigs(): Promise<ProviderConfig[]> {
    return prisma.providerConfig.findMany({
      where: { isEnabled: true }
    });
  }

  async upsertModel(data: any): Promise<void> {
    await prisma.model.upsert(data);
  }
}
