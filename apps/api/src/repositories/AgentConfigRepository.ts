/**
 * AgentConfigRepository - JSON-based agent and model configuration storage
 * Replaces Prisma role and model lookups with file-based reads from model registry
 */

import type { Role, Model, ModelCapabilities } from '../prisma-types.js';
import type { ModelDef } from '../interfaces/IAgentConfigRepository.js';
import { jsonDataStore } from '../utils/jsonDataStore.js';

export class AgentConfigRepository {
  static async getRole(roleId: string): Promise<Role | null> {
    // Roles would typically be stored in a separate roles.json or .evaix/roles.json
    // For now, return null as this needs integration with your role management system
    console.warn(`[AgentConfigRepository] getRole(${roleId}) - not yet implemented for JSON storage`);
    return null;
  }

  static async getEffectiveRole(roleId: string): Promise<Role | null> {
    const role = await this.getRole(roleId);
    if (!role) return null;
    return role;
  }

  static async getModel(providerId: string, modelId: string): Promise<Model | null> {
    try {
      const model = await jsonDataStore.getModel(providerId, modelId);
      if (!model) return null;

      // Map the model registry format to Model interface
      return {
        id: model.id,
        providerId: model.provider_id,
        name: model.model_id,
        costPer1k: model.cost_per_1k ?? 0,
        providerData: model.provider_data || {},
        capabilities: {
          id: `cap_${model.id}`,
          modelId: model.id,
          contextWindow: model.specs?.contextWindow || model.provider_data?.contextWindow || 4096,
          hasVision: model.specs?.isMultimodal || false,
          specs: model.specs || {},
        } as ModelCapabilities,
      } as Model;
    } catch (error) {
      console.error('Error getting model:', error);
      return null;
    }
  }

  static async createModel(modelDef: ModelDef): Promise<Model> {
    // In the new JSON-first system, models are typically loaded from model_registry.json
    // This would need integration with a model registry update mechanism
    console.warn('[AgentConfigRepository] createModel — model registry is read-only from file');
    
    const name = modelDef.name || modelDef.id;
    return {
      id: `${modelDef.providerId}:${name}`,
      providerId: modelDef.providerId,
      name,
      costPer1k: modelDef.costPer1k ?? 0,
      providerData: modelDef.providerData || {},
      capabilities: {
        id: `cap_${modelDef.providerId}_${name}`,
        modelId: `${modelDef.providerId}:${name}`,
        contextWindow: modelDef.contextWindow ?? 4096,
        hasVision: modelDef.hasVision ?? false,
        specs: {
          hasReasoning: modelDef.hasReasoning ?? false,
          hasCoding: modelDef.hasCoding ?? false,
          lastUpdated: new Date().toISOString(),
        },
      } as ModelCapabilities,
    } as Model;
  }
}
