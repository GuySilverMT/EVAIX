/**
 * jsonDataStore.ts - Centralized JSON data loading for migrated repositories
 * Replaces Prisma database calls with filesystem reads from .evaix/ and other data directories
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_CACHE = new Map<string, any>();

// Determine project root based on process.cwd()
function getProjectRoot(): string {
  return process.cwd();
}

function getCachePath(key: string): string {
  return `data:${key}`;
}

async function loadJsonFile(filePath: string): Promise<any> {
  const cacheKey = getCachePath(filePath);
  
  if (DATA_CACHE.has(cacheKey)) {
    return DATA_CACHE.get(cacheKey);
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    DATA_CACHE.set(cacheKey, data);
    return data;
  } catch (error) {
    console.warn(`Failed to load JSON file ${filePath}:`, error);
    return null;
  }
}

export const jsonDataStore = {
  /**
   * Load model registry from latest_models/model_registry.json
   */
  async getModelRegistry() {
    const root = getProjectRoot();
    const path = join(root, 'latest_models', 'model_registry.json');
    return loadJsonFile(path) || [];
  },

  /**
   * Load intent registry from .evaix/voice/intent_registry.json
   */
  async getIntentRegistry() {
    const root = getProjectRoot();
    const path = join(root, 'apps/api/.evaix/voice/intent_registry.json');
    return loadJsonFile(path) || [];
  },

  /**
   * Get a single model by provider and model ID
   */
  async getModel(providerId: string, modelId: string) {
    const models = await this.getModelRegistry();
    return models.find(
      (m: any) => m.provider_id === providerId && m.model_id === modelId
    ) || null;
  },

  /**
   * Get all models for a provider
   */
  async getModelsByProvider(providerId: string) {
    const models = await this.getModelRegistry();
    return models.filter((m: any) => m.provider_id === providerId);
  },

  /**
   * Invalidate cache (useful for testing or manual cache invalidation)
   */
  invalidateCache() {
    DATA_CACHE.clear();
  },

  /**
   * Load file index from .evaix/fileIndex.json (to replace SQL FileIndex table)
   */
  async getFileIndex() {
    const root = getProjectRoot();
    const path = join(root, 'apps/api/.evaix/fileIndex.json');
    try {
      return await loadJsonFile(path);
    } catch {
      return { files: [] };
    }
  },

  /**
   * Save file index to .evaix/fileIndex.json
   */
  async saveFileIndex(data: any) {
    const root = getProjectRoot();
    const dir = join(root, 'apps/api/.evaix');
    const path = join(dir, 'fileIndex.json');
    
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
      // Invalidate cache for this file
      DATA_CACHE.delete(getCachePath(path));
    } catch (error) {
      console.error('Failed to save file index:', error);
      throw error;
    }
  },

  /**
   * Load provider configs (or initialize empty if not present)
   */
  async getProviderConfigs() {
    const root = getProjectRoot();
    const path = join(root, 'apps/api/.evaix/providers.json');
    try {
      return await loadJsonFile(path);
    } catch {
      return { providers: [] };
    }
  },

  /**
   * Save provider configs
   */
  async saveProviderConfigs(data: any) {
    const root = getProjectRoot();
    const dir = join(root, 'apps/api/.evaix');
    const path = join(dir, 'providers.json');
    
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
      DATA_CACHE.delete(getCachePath(path));
    } catch (error) {
      console.error('Failed to save provider configs:', error);
      throw error;
    }
  },
};
