import type { RoleFormState } from './types/role.js';

export const DEFAULT_MODEL_CONFIG = {
  maxContext: 128000,
  defaultMaxTokens: 2048,
  defaultTemperature: 0.7,
};

export const DEFAULT_ROLE_FORM_DATA: RoleFormState = {
  name: '',
  basePrompt: '',
  category: '',
  minContext: 0,
  maxContext: DEFAULT_MODEL_CONFIG.maxContext,
  needsVision: false,
  needsReasoning: false,
  needsCoding: false,
  needsTools: false,
  needsJson: false,
  needsUncensored: false,
  needsImageGeneration: false,
  tools: [],
  defaultTemperature: DEFAULT_MODEL_CONFIG.defaultTemperature,
  defaultMaxTokens: DEFAULT_MODEL_CONFIG.defaultMaxTokens,
  defaultTopP: 1.0,
  defaultFrequencyPenalty: 0.0,
  defaultPresencePenalty: 0.0,
  defaultStop: [],
  defaultSeed: undefined,
  defaultResponseFormat: 'text',
  terminalRestrictions: { mode: 'blacklist', commands: ['rm', 'sudo', 'dd', 'mkfs', 'shutdown', 'reboot'] },
  criteria: {},
  orchestrationConfig: { requiresCheck: false, judgeRoleId: undefined, minPassScore: 80 },
  memoryConfig: { useProjectMemory: false, readOnly: false },
  dna: {
    identity: {
      personaName: '',
      style: 'PROFESSIONAL_CONCISE',
      thinkingProcess: 'SOLO',
      reflectionEnabled: false,
      systemPromptDraft: ''
    },
    cortex: {
      executionMode: 'HYBRID_AUTO',
      capabilities: [], // Non-exclusive checkboxes
      preferences: {
        reasoning: false,
        tts: false,
        multimodal: false,
        uncensored: false,
        imageGen: false,
      },
      contextRange: { min: 4096, max: 128000 }
    },
    governance: {
      rules: [],
      assessmentStrategy: ['LINT_ONLY'], // Non-exclusive checkboxes - default to LINT_ONLY
      enforcementLevel: 'LOW',
      attachedFiles: []
    },
    context: {
      strategy: ['EXPLORATORY'], // Non-exclusive checkboxes - default to EXPLORATORY
      permissions: ['ALL'],
      attachedFiles: []
    },
    tools: {
      customTools: []
    },
    behavior: {
      silenceConfirmation: false
    }
  }


};
