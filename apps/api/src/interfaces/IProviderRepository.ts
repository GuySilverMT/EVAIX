import type { Role, RoleTool, Tool, Model, ModelCapabilities, ProviderConfig, AgentConfig, FileIndex, Job, RoleVariant } from '../prisma-types.js';

export interface IProviderRepository {
  findProviderConfigByName(name: string): Promise<ProviderConfig | null>;
  findProviderConfigById(id: string): Promise<ProviderConfig | null>;
  createProviderConfig(values: any): Promise<void>;
  getEnabledProviderConfigs(): Promise<ProviderConfig[]>;
  upsertModel(data: any): Promise<void>;
}
