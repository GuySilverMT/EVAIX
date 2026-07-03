/**
 * ProviderRepository - JSON-based provider configuration storage
 * Replaces Prisma database implementation with file-based JSON reads/writes
 */

import type { ProviderConfig, Model } from '../prisma-types.js';
import { IProviderRepository } from "../interfaces/IProviderRepository.js";
import { jsonDataStore } from '../utils/jsonDataStore.js';

export class ProviderRepository implements IProviderRepository {
  async findProviderConfigByName(name: string): Promise<ProviderConfig | null> {
    try {
      const configs = await jsonDataStore.getProviderConfigs();
      const provider = configs.providers?.find((p: ProviderConfig) => p.name === name);
      return provider || null;
    } catch (error) {
      console.error('Error finding provider config by name:', error);
      return null;
    }
  }

  async findProviderConfigById(id: string): Promise<ProviderConfig | null> {
    try {
      const configs = await jsonDataStore.getProviderConfigs();
      const provider = configs.providers?.find((p: ProviderConfig) => p.id === id);
      return provider || null;
    } catch (error) {
      console.error('Error finding provider config by id:', error);
      return null;
    }
  }

  async createProviderConfig(values: Partial<ProviderConfig>): Promise<void> {
    try {
      const configs = await jsonDataStore.getProviderConfigs();
      const providers = configs.providers || [];
      
      const newProvider: ProviderConfig = {
        id: values.id || `provider_${Date.now()}`,
        name: values.name || 'Unknown',
        isEnabled: values.isEnabled !== false,
        ...values,
      };
      
      providers.push(newProvider);
      await jsonDataStore.saveProviderConfigs({ providers });
    } catch (error) {
      console.error('Error creating provider config:', error);
      throw error;
    }
  }

  async getEnabledProviderConfigs(): Promise<ProviderConfig[]> {
    try {
      const configs = await jsonDataStore.getProviderConfigs();
      return configs.providers?.filter((p: ProviderConfig) => p.isEnabled === true) || [];
    } catch (error) {
      console.error('Error getting enabled provider configs:', error);
      return [];
    }
  }

  async upsertModel(data: any): Promise<void> {
    // This is typically used for syncing model registry data
    // In the new approach, model registry is loaded from model_registry.json
    console.debug('[ProviderRepository] upsertModel — model registry is read-only from file');
  }
}
