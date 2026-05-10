export interface Tool {
  id: string;
  name: string;
  description: string;
  instruction: string; // Tool Prompt
  schema: string;
  isEnabled: boolean;
  serverId?: string;
  implementation?: string;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  providerLabel?: string;
  contextWindow?: number;
  modalities?: string[]; // [NEW] e.g. ["TEXT", "VISION"]
  isFreeTier?: boolean;  // [NEW]
  specs?: {
    contextWindow?: number;
    maxOutput?: number;
    hasVision?: boolean;
    hasReasoning?: boolean;
    hasImageGen?: boolean;
    hasEmbedding?: boolean;
    hasOCR?: boolean;
    hasTTS?: boolean;
    hasReward?: boolean;
    hasModeration?: boolean;
    hasCoding?: boolean;
    isLibrarian?: boolean;
    isMedical?: boolean;
    isWeather?: boolean;
    isScience?: boolean;
    isMultimodal?: boolean;
    uncensored?: boolean;
    supportsFunctionCalling?: boolean;
    supportsJsonMode?: boolean;
    hasAudioInput?: boolean;
    hasAudioOutput?: boolean;
    primaryTask?: string; // [NEW] e.g. "chat", "embedding"
  };
  embeddingModel?: { dimensions: number; maxContext: number };
  chatModel?: { contextWindow: number; supportsTools?: boolean; supportsJson?: boolean };
  visionModel?: { maxResolution?: string; supportsVideo?: boolean };
  audioModel?: { voices?: string[]; sampleRates?: number[] };
  imageModel?: { resolutions?: string[]; styles?: string[] };
  complianceModel?: { categories?: string[] };
  rewardModel?: { scoreType?: string };
}

export interface RoleDNA {
  identity: {
    personaName: string;
    style: string; // [FLEXIBLE] e.g. 'PROFESSIONAL_CONCISE', 'SOCRATIC', 'FRIENDLY_HELPFUL'
    systemPromptDraft: string;
    thinkingProcess: string; // [FLEXIBLE] e.g. 'SOLO', 'CHAIN_OF_THOUGHT', 'CRITIC_LOOP'
    reflectionEnabled: boolean;
  };
  cortex: {
    executionMode?: 'JSON_STRICT' | 'CODE_INTERPRETER' | 'HYBRID_AUTO';
    capabilities: string[]; // Non-exclusive: vision, reasoning, tts, embedding, coding
    preferences?: {
      reasoning?: boolean;
      tts?: boolean;
      multimodal?: boolean;
      uncensored?: boolean;
      imageGen?: boolean;
    };
    contextRange: { min: number; max: number };
    tools?: string[];
  };


  governance: {
    rules: string[];
    assessmentStrategy: string[]; // Non-exclusive: LINT_ONLY, VISUAL_CHECK, STRICT_TEST_PASS, JUDGE, LIBRARIAN
    enforcementLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    attachedFiles?: string[];
  };
  context: {
    strategy: string[]; // Non-exclusive: EXPLORATORY, VECTOR_SEARCH, LOCUS_FOCUS
    permissions: string[];
    attachedFiles?: string[];
  };
  tools: {
    customTools: string[];
  };
  behavior?: {
    silenceConfirmation?: boolean;
  };
}


export interface Role {
  id: string;
  name: string;
  basePrompt: string;
  description?: string;
  categoryId?: string;
  categoryString?: string;
  // Category object is purely optional for display
  category?: { id: string; name: string };

  // Flattened tools for UI (references by name or ID)
  tools?: string[];

  // Metadata Configuration
  minContext?: number;
  maxContext?: number;
  needsVision?: boolean;
  needsReasoning?: boolean;
  needsCoding?: boolean;
  needsTools?: boolean;
  needsJson?: boolean;
  needsUncensored?: boolean;
  needsImageGeneration?: boolean;

  defaultTemperature?: number;
  defaultMaxTokens?: number;
  defaultTopP?: number;
  defaultFrequencyPenalty?: number;
  defaultPresencePenalty?: number;
  defaultStop?: string[];
  defaultSeed?: number;
  defaultResponseFormat?: 'text' | 'json_object';

  terminalRestrictions?: {
    mode: 'whitelist' | 'blacklist' | 'unrestricted';
    commands: string[];
  };

  criteria?: Record<string, unknown>;
  orchestrationConfig?: {
    requiresCheck: boolean;
    judgeRoleId?: string;
    minPassScore: number;
  };
  memoryConfig?: {
    useProjectMemory: boolean;
    readOnly: boolean;
  };

  // DNA Concept
  dna?: RoleDNA;

  currentModel?: string; // Resolved model name
  scope?: string;
  metadata?: Record<string, unknown>;
}


export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string;
  children: CategoryNode[];
  roles: Role[];
}

export interface RoleFormState {
  name: string;
  basePrompt: string;
  category: string;
  minContext: number;
  maxContext: number;
  needsVision: boolean;
  needsReasoning: boolean;
  needsCoding: boolean;
  needsTools: boolean;
  needsJson: boolean;
  needsUncensored: boolean;
  needsImageGeneration: boolean;
  tools: string[];
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultTopP: number;
  defaultFrequencyPenalty: number;
  defaultPresencePenalty: number;
  defaultStop: string[];
  defaultSeed?: number;
  defaultResponseFormat: 'text' | 'json_object';
  terminalRestrictions: { mode: 'whitelist' | 'blacklist' | 'unrestricted'; commands: string[] };
  criteria: Record<string, unknown>;
  orchestrationConfig: { requiresCheck: boolean; judgeRoleId?: string; minPassScore: number };
  memoryConfig: { useProjectMemory: boolean; readOnly: boolean };

  // DNA Overlay
  dna: RoleDNA;
}
