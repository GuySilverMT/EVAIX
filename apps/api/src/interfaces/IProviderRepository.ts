import { type ProviderConfig, Prisma } from '@prisma/client';

export interface IProviderRepository {
  findProviderConfigByName(name: string): Promise<ProviderConfig | null>;
  findProviderConfigById(id: string): Promise<ProviderConfig | null>;
  createProviderConfig(values: Prisma.ProviderConfigCreateInput): Promise<void>;
  getEnabledProviderConfigs(): Promise<ProviderConfig[]>;
  upsertModel(data: Prisma.ModelUpsertArgs): Promise<void>;
}
