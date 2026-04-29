/**
 * AI Role Manager Service
 * 
 * Manages AI roles/personalities for voice interaction
 * Each role modifies LLM prompts/context/response style
 */

import { prisma } from '../db.js';
import { Prisma } from '@prisma/client';

export interface AIRole {
  id: string;
  name: string;
  description: string;
  personality: string; // 'friendly_helper' | 'formal_assistant' | 'experimental_agent' | etc
  systemPrompt: string;
  contextModifiers?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stopSequences?: string[];
  };
  responseStyle?: {
    verbosity?: 'concise' | 'normal' | 'detailed';
    tone?: 'casual' | 'professional' | 'technical';
    formatting?: 'plain' | 'markdown' | 'structured';
  };
  voiceSettings?: {
    preferredVoice?: string;
    speed?: number;
    pitch?: number;
  };
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface RoleContext {
  role: AIRole;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  sessionMetadata?: Record<string, unknown>;
}

/**
 * Maps a Prisma Role + active RoleVariant to an AIRole
 */
function mapDBRoleToAIRole(dbRole: any): AIRole {
  const activeVariant = dbRole.variants?.[0]; // Assuming we fetch with { where: { isActive: true }, take: 1 }

  // Fallback defaults if no active variant
  let cortexConfig: Record<string, any> = {};
  let identityConfig: Record<string, any> = {};
  let behaviorConfig: Record<string, any> = {};
  let voiceSettings: Record<string, any> = {};
  let isActive = true;

  if (activeVariant) {
    cortexConfig = (activeVariant.cortexConfig as Record<string, any>) || {};
    identityConfig = (activeVariant.identityConfig as Record<string, any>) || {};
    behaviorConfig = (activeVariant.behaviorConfig as Record<string, any>) || {};
    voiceSettings = (activeVariant.voiceSettings as Record<string, any>) || {};
    isActive = activeVariant.isActive;
  }

  return {
    id: dbRole.id,
    name: dbRole.name,
    description: dbRole.description || '',
    personality: identityConfig.personaName || 'assistant',
    systemPrompt: identityConfig.systemPromptDraft || dbRole.basePrompt,
    contextModifiers: {
      temperature: cortexConfig.temperature,
      topP: cortexConfig.topP,
      maxTokens: cortexConfig.maxOutputTokens,
      stopSequences: cortexConfig.stopSequences,
    },
    responseStyle: {
      verbosity: behaviorConfig.verbosity,
      tone: behaviorConfig.tone,
      formatting: behaviorConfig.formatting,
    },
    voiceSettings: {
      preferredVoice: voiceSettings.preferredVoice,
      speed: voiceSettings.speed,
      pitch: voiceSettings.pitch,
    },
    isActive: isActive,
    metadata: dbRole.metadata as Record<string, unknown>,
  };
}

/**
 * Manages AI roles and personalities for voice interactions
 */
export class AIRoleManager {
  
  /**
   * Register a new role
   */
  async registerRole(role: AIRole): Promise<void> {
    const existing = await prisma.role.findFirst({
        where: { OR: [{ id: role.id }, { name: role.name }] }
    });

    if (existing) {
        throw new Error(`Role with id ${role.id} or name ${role.name} already exists`);
    }

    const createdRole = await prisma.role.create({
        data: {
            id: role.id,
            name: role.name,
            description: role.description,
            basePrompt: role.systemPrompt,
            metadata: (role.metadata as Prisma.JsonObject) || {},
        }
    });

    await prisma.roleVariant.create({
        data: {
            roleId: createdRole.id,
            isActive: role.isActive,
            identityConfig: {
                personaName: role.personality,
                systemPromptDraft: role.systemPrompt
            },
            cortexConfig: {
                temperature: role.contextModifiers?.temperature,
                topP: role.contextModifiers?.topP,
                maxOutputTokens: role.contextModifiers?.maxTokens,
                stopSequences: role.contextModifiers?.stopSequences,
            },
            behaviorConfig: {
                verbosity: role.responseStyle?.verbosity,
                tone: role.responseStyle?.tone,
                formatting: role.responseStyle?.formatting,
            },
            voiceSettings: role.voiceSettings || {}
        }
    });
  }
  
  /**
   * Update an existing role
   */
  async updateRole(roleId: string, updates: Partial<AIRole>): Promise<AIRole> {
    const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: { variants: { where: { isActive: true }, take: 1 } }
    });

    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    // Update Role base fields if present
    const roleData: any = {};
    if (updates.name !== undefined) roleData.name = updates.name;
    if (updates.description !== undefined) roleData.description = updates.description;
    if (updates.systemPrompt !== undefined) roleData.basePrompt = updates.systemPrompt;
    if (updates.metadata !== undefined) roleData.metadata = updates.metadata;

    if (Object.keys(roleData).length > 0) {
        await prisma.role.update({
            where: { id: roleId },
            data: roleData
        });
    }

    // Update Variant fields if we have a variant
    if (role.variants.length > 0) {
        const variantId = role.variants[0].id;
        const variantData: any = {};

        if (updates.isActive !== undefined) variantData.isActive = updates.isActive;

        if (updates.personality !== undefined || updates.systemPrompt !== undefined) {
            const idConfig = (role.variants[0].identityConfig as any) || {};
            if (updates.personality !== undefined) idConfig.personaName = updates.personality;
            if (updates.systemPrompt !== undefined) idConfig.systemPromptDraft = updates.systemPrompt;
            variantData.identityConfig = idConfig;
        }

        if (updates.contextModifiers !== undefined) {
             const cxConfig = (role.variants[0].cortexConfig as any) || {};
             if (updates.contextModifiers.temperature !== undefined) cxConfig.temperature = updates.contextModifiers.temperature;
             if (updates.contextModifiers.topP !== undefined) cxConfig.topP = updates.contextModifiers.topP;
             if (updates.contextModifiers.maxTokens !== undefined) cxConfig.maxOutputTokens = updates.contextModifiers.maxTokens;
             if (updates.contextModifiers.stopSequences !== undefined) cxConfig.stopSequences = updates.contextModifiers.stopSequences;
             variantData.cortexConfig = cxConfig;
        }

        if (updates.responseStyle !== undefined) {
            const bhConfig = (role.variants[0].behaviorConfig as any) || {};
            if (updates.responseStyle.verbosity !== undefined) bhConfig.verbosity = updates.responseStyle.verbosity;
            if (updates.responseStyle.tone !== undefined) bhConfig.tone = updates.responseStyle.tone;
            if (updates.responseStyle.formatting !== undefined) bhConfig.formatting = updates.responseStyle.formatting;
            variantData.behaviorConfig = bhConfig;
        }

        if (updates.voiceSettings !== undefined) {
             const vConfig = (role.variants[0].voiceSettings as any) || {};
             if (updates.voiceSettings.preferredVoice !== undefined) vConfig.preferredVoice = updates.voiceSettings.preferredVoice;
             if (updates.voiceSettings.speed !== undefined) vConfig.speed = updates.voiceSettings.speed;
             if (updates.voiceSettings.pitch !== undefined) vConfig.pitch = updates.voiceSettings.pitch;
             variantData.voiceSettings = vConfig;
        }

        if (Object.keys(variantData).length > 0) {
            await prisma.roleVariant.update({
                where: { id: variantId },
                data: variantData
            });
        }
    }

    const updatedRole = await prisma.role.findUnique({
         where: { id: roleId },
         include: { variants: { where: { isActive: true }, take: 1 } }
    });

    return mapDBRoleToAIRole(updatedRole);
  }
  
  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }
    
    await prisma.role.delete({ where: { id: roleId } });
  }
  
  /**
   * Get a role by ID
   */
  async getRole(roleId: string): Promise<AIRole | null> {
    const dbRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: { variants: { where: { isActive: true }, take: 1 } }
    });

    if (!dbRole) return null;
    return mapDBRoleToAIRole(dbRole);
  }
  
  /**
   * Get all roles
   */
  async getAllRoles(): Promise<AIRole[]> {
    const dbRoles = await prisma.role.findMany({
        include: { variants: { where: { isActive: true }, take: 1 } }
    });
    return dbRoles.map(mapDBRoleToAIRole);
  }
  
  /**
   * Get active roles
   */
  async getActiveRoles(): Promise<AIRole[]> {
    const dbRoles = await prisma.role.findMany({
        where: {
            variants: {
                some: { isActive: true }
            }
        },
        include: { variants: { where: { isActive: true }, take: 1 } }
    });
    return dbRoles.map(mapDBRoleToAIRole);
  }
  
  /**
   * Set active role
   */
  async setActiveRole(roleId: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }
    
    // Deactivate all roles variants
    await prisma.roleVariant.updateMany({
        data: { isActive: false }
    });

    // Activate the first variant for this role, or create one
    const variants = await prisma.roleVariant.findMany({
        where: { roleId }
    });

    if (variants.length > 0) {
        await prisma.roleVariant.update({
            where: { id: variants[0].id },
            data: { isActive: true }
        });
    } else {
         await prisma.roleVariant.create({
            data: {
                roleId: role.id,
                isActive: true
            }
        });
    }
  }
  
  /**
   * Get the active role
   */
  async getActiveRole(): Promise<AIRole | null> {
    const activeRoles = await this.getActiveRoles();
    if (activeRoles.length === 0) return null;
    return activeRoles[0]; // Assuming only one active role across the system, or just return first
  }
  
  /**
   * Build LLM context with role personality
   */
  async buildLLMContext(
    userInput: string,
    roleId?: string,
    conversationHistory?: RoleContext['conversationHistory']
  ): Promise<{
    systemPrompt: string;
    messages: Array<{ role: string; content: string }>;
    settings: Record<string, unknown>;
  }> {
    // Get role
    const role = roleId ? await this.getRole(roleId) : await this.getActiveRole();
    
    if (!role) {
      throw new Error('No role available');
    }
    
    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    
    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
    
    // Add current user input
    messages.push({
      role: 'user',
      content: userInput,
    });
    
    // Build settings with context modifiers
    const settings: Record<string, unknown> = {
      temperature: role.contextModifiers?.temperature,
      topP: role.contextModifiers?.topP,
      maxTokens: role.contextModifiers?.maxTokens,
      stopSequences: role.contextModifiers?.stopSequences,
    };
    
    return {
      systemPrompt: role.systemPrompt,
      messages,
      settings,
    };
  }
  
  /**
   * Format response according to role style
   */
  async formatResponse(response: string, roleId?: string): Promise<string> {
    const role = roleId ? await this.getRole(roleId) : await this.getActiveRole();
    
    if (!role || !role.responseStyle) {
      return response;
    }
    
    // Apply response formatting based on role preferences
    let formatted = response;
    
    // Apply verbosity adjustments
    if (role.responseStyle.verbosity === 'concise') {
      // Could implement text summarization here
      formatted = response.trim();
    }
    
    // Apply tone adjustments (this would be done in the LLM prompt ideally)
    // For now, just return the response
    
    return formatted;
  }
  
  /**
   * Get voice settings for a role
   */
  async getVoiceSettings(roleId?: string): Promise<AIRole['voiceSettings'] | undefined> {
    const role = roleId ? await this.getRole(roleId) : await this.getActiveRole();
    return role?.voiceSettings;
  }
}

// Singleton instance
let managerInstance: AIRoleManager | null = null;

/**
 * Get the global AI role manager instance
 */
export function getAIRoleManager(): AIRoleManager {
  if (!managerInstance) {
    managerInstance = new AIRoleManager();
  }
  
  return managerInstance;
}

/**
 * Reset the manager (useful for testing)
 */
export function resetAIRoleManager(): void {
  managerInstance = null;
}
