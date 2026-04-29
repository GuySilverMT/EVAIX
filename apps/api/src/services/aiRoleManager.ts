/**
 * AI Role Manager Service
 * 
 * Manages AI roles/personalities for voice interaction
 * Each role modifies LLM prompts/context/response style
 */

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
  metadata?: Record<string, any>;
}

export interface RoleContext {
  role: AIRole;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  sessionMetadata?: Record<string, any>;
}

/**
 * Manages AI roles and personalities for voice interactions
 */
export class AIRoleManager {
  private roles: Map<string, AIRole> = new Map();
  private activeRoleId: string | null = null;
  
  /**
   * Register a new role
   */
  registerRole(role: AIRole): void {
    if (this.roles.has(role.id)) {
      throw new Error(`Role with id ${role.id} already exists`);
    }
    
    this.roles.set(role.id, role);
    
    // Set as active if it's the first role
    if (!this.activeRoleId) {
      this.activeRoleId = role.id;
    }
  }
  
  /**
   * Update an existing role
   */
  updateRole(roleId: string, updates: Partial<AIRole>): AIRole {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }
    
    const updatedRole = { ...role, ...updates, id: roleId };
    this.roles.set(roleId, updatedRole);
    
    return updatedRole;
  }
  
  /**
   * Delete a role
   */
  deleteRole(roleId: string): void {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role ${roleId} not found`);
    }
    
    this.roles.delete(roleId);
    
    // Clear active if this was the active role
    if (this.activeRoleId === roleId) {
      // Set to first available role or null
      const firstRole = Array.from(this.roles.values())[0];
      this.activeRoleId = firstRole ? firstRole.id : null;
    }
  }
  
  /**
   * Get a role by ID
   */
  getRole(roleId: string): AIRole | null {
    return this.roles.get(roleId) || null;
  }
  
  /**
   * Get all roles
   */
  getAllRoles(): AIRole[] {
    return Array.from(this.roles.values());
  }
  
  /**
   * Get active roles
   */
  getActiveRoles(): AIRole[] {
    return Array.from(this.roles.values()).filter(role => role.isActive);
  }
  
  /**
   * Set active role
   */
  setActiveRole(roleId: string): void {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }
    
    this.activeRoleId = roleId;
  }
  
  /**
   * Get the active role
   */
  getActiveRole(): AIRole | null {
    if (!this.activeRoleId) {
      return null;
    }
    
    return this.roles.get(this.activeRoleId) || null;
  }
  
  /**
   * Build LLM context with role personality
   */
  buildLLMContext(
    userInput: string,
    roleId?: string,
    conversationHistory?: RoleContext['conversationHistory']
  ): {
    systemPrompt: string;
    messages: Array<{ role: string; content: string }>;
    settings: any;
  } {
    // Get role
    const role = roleId ? this.getRole(roleId) : this.getActiveRole();
    
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
    const settings = {
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
  formatResponse(response: string, roleId?: string): string {
    const role = roleId ? this.getRole(roleId) : this.getActiveRole();
    
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
  getVoiceSettings(roleId?: string): AIRole['voiceSettings'] | undefined {
    const role = roleId ? this.getRole(roleId) : this.getActiveRole();
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
    
    // Register default roles - REMOVED: Rely on database instead
    /*
    managerInstance.registerRole({
      id: 'friendly_helper',
      name: 'Friendly Helper',
      ...
    });
    */

  }
  
  return managerInstance;
}

/**
 * Reset the manager (useful for testing)
 */
export function resetAIRoleManager(): void {
  managerInstance = null;
}
