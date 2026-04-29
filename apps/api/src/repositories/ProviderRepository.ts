import { IProviderRepository } from "../interfaces/IProviderRepository.js";
import { prisma } from "../db.js";
import { type ProviderConfig, Prisma } from "@prisma/client";

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

  async createProviderConfig(values: Prisma.ProviderConfigCreateInput): Promise<void> {
    await prisma.providerConfig.create({
      data: values
    });
  }

  async getEnabledProviderConfigs(): Promise<ProviderConfig[]> {
    return prisma.providerConfig.findMany({
      where: { isEnabled: true }
    });
  }

  async upsertModel(data: Prisma.ModelUpsertArgs): Promise<void> {
    await prisma.model.upsert(data);
  }
}
