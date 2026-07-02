/**
 * Intent Registry Manager for EVAIX VFS
 * 
 * Handles flat-file persistence and dynamic command registration in .evaix/voice/intent_registry.json
 * Zero-database architecture following EVAIX brutalist system specifications.
 */

import fs from 'fs/promises';
import path from 'path';
import { IntentDefinition, IntentRegistry } from './IntentRegistrySchema.js';

export class IntentRegistryManager {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir || process.cwd());
  }

  /**
   * Resolve root .evaix/voice path
   */
  public getVoiceStorageDir(): string {
    return path.join(this.baseDir, '.evaix', 'voice');
  }

  /**
   * Resolve .evaix/voice/intent_registry.json path
   */
  public getRegistryFilePath(): string {
    return path.join(this.getVoiceStorageDir(), 'intent_registry.json');
  }

  /**
   * Resolve .evaix/voice/scripts directory path
   */
  public getScriptsDir(): string {
    return path.join(this.getVoiceStorageDir(), 'scripts');
  }

  /**
   * Ensures .evaix/voice and .evaix/voice/scripts directories exist
   */
  public async ensureStorage(): Promise<void> {
    const voiceDir = this.getVoiceStorageDir();
    const scriptsDir = this.getScriptsDir();
    
    await fs.mkdir(voiceDir, { recursive: true });
    await fs.mkdir(scriptsDir, { recursive: true });

    const registryPath = this.getRegistryFilePath();
    try {
      await fs.access(registryPath);
    } catch {
      await this.initializeDefaultRegistry();
    }
  }

  /**
   * Load current intent_registry.json from VFS
   */
  public async loadRegistry(): Promise<IntentRegistry> {
    await this.ensureStorage();
    const registryPath = this.getRegistryFilePath();
    
    try {
      const rawData = await fs.readFile(registryPath, 'utf-8');
      const parsed = JSON.parse(rawData) as IntentRegistry;
      return parsed;
    } catch (err) {
      console.warn(`[IntentRegistryManager] Failed to read ${registryPath}, re-initializing default registry.`);
      return await this.initializeDefaultRegistry();
    }
  }

  /**
   * Persist intent_registry.json to VFS
   */
  public async saveRegistry(registry: IntentRegistry): Promise<void> {
    await this.ensureStorage();
    registry.lastUpdated = new Date().toISOString();
    const registryPath = this.getRegistryFilePath();
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
  }

  /**
   * Register or update an intent definition in the registry
   */
  public async registerIntent(intent: IntentDefinition): Promise<IntentRegistry> {
    const registry = await this.loadRegistry();
    
    const existingIndex = registry.intents.findIndex(i => i.id === intent.id);
    if (existingIndex >= 0) {
      registry.intents[existingIndex] = intent;
    } else {
      registry.intents.push(intent);
    }

    await this.saveRegistry(registry);
    return registry;
  }

  /**
   * Automatically generate 3-5 natural language synonym variations of a command
   */
  public generateSynonymTriggers(baseCommand: string): string[] {
    const normalized = baseCommand.toLowerCase().trim();
    const variations = new Set<string>();

    variations.add(normalized);

    // Natural speech prefixes
    const conversationalPrefixes = [
      "let's ",
      "please ",
      "can you ",
      "i want to ",
      "start ",
      "run ",
      "execute "
    ];

    for (const prefix of conversationalPrefixes) {
      if (!normalized.startsWith(prefix.trim())) {
        variations.add(`${prefix}${normalized}`);
      }
    }

    // Common verb substitution rules
    if (normalized.startsWith("create ")) {
      variations.add(normalized.replace("create ", "make "));
      variations.add(normalized.replace("create ", "generate "));
      variations.add(normalized.replace("create ", "build "));
    } else if (normalized.startsWith("write ")) {
      variations.add(normalized.replace("write ", "generate "));
      variations.add(normalized.replace("write ", "code "));
      variations.add(normalized.replace("write ", "create "));
    } else if (normalized.startsWith("chat ")) {
      variations.add(normalized.replace("chat ", "talk "));
      variations.add(normalized.replace("chat ", "speak "));
    } else if (normalized.startsWith("run ")) {
      variations.add(normalized.replace("run ", "execute "));
      variations.add(normalized.replace("run ", "launch "));
    }

    // Return 3-5 unique natural language variations
    return Array.from(variations).slice(0, 5);
  }

  /**
   * Auto-generates 3-5 trigger variations when building a new script and appends to registry
   */
  public async autoGenerateAndRegister(params: {
    id: string;
    path: string;
    baseCommand: string;
    accepts_args?: boolean;
    description?: string;
    customTriggers?: string[];
  }): Promise<IntentDefinition> {
    const triggers = params.customTriggers && params.customTriggers.length > 0
      ? params.customTriggers
      : this.generateSynonymTriggers(params.baseCommand);

    const intent: IntentDefinition = {
      id: params.id,
      path: params.path,
      triggers,
      accepts_args: params.accepts_args ?? true,
      description: params.description || `Auto-generated intent for ${params.baseCommand}`
    };

    await this.registerIntent(intent);
    return intent;
  }

  /**
   * Initialize default intent registry and seed default executable scripts
   */
  public async initializeDefaultRegistry(): Promise<IntentRegistry> {
    const voiceDir = this.getVoiceStorageDir();
    const scriptsDir = this.getScriptsDir();
    await fs.mkdir(voiceDir, { recursive: true });
    await fs.mkdir(scriptsDir, { recursive: true });

    // Seed default bash script files
    const defaultScripts = [
      {
        filename: 'chat.sh',
        content: `#!/bin/bash\n# EVAIX Chat Handler\necho "[VOICE_INTENT:CHAT] Received args: $@"\n`
      },
      {
        filename: 'create_script.sh',
        content: `#!/bin/bash\n# EVAIX Script Generation Handler\necho "[VOICE_INTENT:CREATE_SCRIPT] Generating script for task: $@"\n`
      },
      {
        filename: 'system_status.sh',
        content: `#!/bin/bash\n# EVAIX System Status Handler\necho "[VOICE_INTENT:SYSTEM_STATUS] System operational at $(date)"\n`
      }
    ];

    for (const s of defaultScripts) {
      const scriptPath = path.join(scriptsDir, s.filename);
      try {
        await fs.writeFile(scriptPath, s.content, { mode: 0o755 });
      } catch (err) {
        // file creation fallback
      }
    }

    const defaultRegistry: IntentRegistry = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      intents: [
        {
          id: 'chat',
          path: 'chat.sh',
          triggers: ["let's chat", "start chat", "open chat", "chat with me", "talk to me", "chat"],
          accepts_args: true,
          description: 'Start or continue a chat session with EVAIX'
        },
        {
          id: 'create_script',
          path: 'create_script.sh',
          triggers: ["write a python script", "create script", "generate script", "write script", "build python script"],
          accepts_args: true,
          description: 'Generate or write code script based on instruction'
        },
        {
          id: 'system_status',
          path: 'system_status.sh',
          triggers: ["check system status", "system status", "status check", "show status"],
          accepts_args: false,
          description: 'Query EVAIX system status and metrics'
        }
      ]
    };

    const registryPath = this.getRegistryFilePath();
    await fs.writeFile(registryPath, JSON.stringify(defaultRegistry, null, 2), 'utf-8');
    return defaultRegistry;
  }
}
