import { ProviderFactory } from '../utils/ProviderFactory.js';
import { type BaseLLMProvider, type LLMModel } from '../utils/BaseLLMProvider.js';
import { IProviderManager } from '../interfaces/IProviderManager.js';
import { IProviderRepository } from '../interfaces/IProviderRepository.js';
import { ProviderRepository } from '../repositories/ProviderRepository.js';
import { type ProviderConfig } from '@prisma/client';
import { OLLAMA_DEFAULT_HOST, OLLAMA_PROVIDER_ID, OPENROUTER_API_URL, GROQ_API_URL, NVIDIA_API_URL, DEFAULT_FETCH_TIMEOUT_MS } from '../config/constants.js';

const MS_PER_SECOND = 1000;

export class ProviderManager implements IProviderManager {
  private providers: Map<string, BaseLLMProvider> = new Map();
  /*private*/ unhealthyProviders: Map<string, number> = new Map(); // providerId -> cooldownEndTime
  // NEW: Store metadata for logging and filtering
  /*private*/ providerMetadata: Map<string, { name: string; type: string; providerClass: string }> = new Map();

  private repository: IProviderRepository;

  constructor(repository?: IProviderRepository) {
    this.repository = repository || new ProviderRepository();
  }

  public markUnhealthy(providerId: string, cooldownSeconds: number) {
    this.unhealthyProviders.set(providerId, Date.now() + cooldownSeconds * MS_PER_SECOND);
    console.warn(`[ProviderManager] Marked ${providerId} as unhealthy. Cooldown for ${cooldownSeconds}s.`);
  }

  public isHealthy(providerId: string): boolean {
    const cooldownEndTime = this.unhealthyProviders.get(providerId);
    if (!cooldownEndTime) {
      return true;
    }
    if (Date.now() > cooldownEndTime) {
      this.unhealthyProviders.delete(providerId);
      console.log(`[ProviderManager] ${providerId} is healthy again.`);
      return true;
    }
    return false;
  }

  async initialize() {
    // 1. AUTO-BOOTSTRAP FROM ENV (The "Free Labor" Fix)
    // This checks your .env file and inserts them into the DB if missing
    await this.bootstrapFromEnv();

    // 2. Load from DB
    try {
      const configs: ProviderConfig[] = await this.repository.getEnabledProviderConfigs();

      this.providers.clear();
      this.providerMetadata.clear(); // Clear metadata

      // Environment variable mappings for direct access
      const envMappings: Record<string, string> = {
        'google': 'GOOGLE_GENERATIVE_AI_API_KEY',
        'mistral': 'MISTRAL_API_KEY',
        'openrouter': 'OPENROUTER_API_KEY',
        'groq': 'GROQ_API_KEY',
        'nvidia': 'NVIDIA_API_KEY',
        'cerebras': 'CEREBRAS_API_KEY', // [FIX] Added missing mapping
        'xai': 'XAI_API_KEY',
        'ollama': 'OLLAMA_API_KEY' // Usually empty for local Ollama
      };

      for (const config of configs) {
        try {
          // Try to use environment variable first (avoids decryption issues)
          let apiKey = '';
          const envVar = envMappings[config.type];

          if (config.type === 'ollama') {
            // Ollama is local and doesn't need an API key
            apiKey = process.env.OLLAMA_API_KEY || '';
          } else if (envVar && process.env[envVar]?.trim()) {
            // Use environment variable directly
            apiKey = process.env[envVar]?.trim() || '';
            console.log(`[ProviderManager] Using ${envVar} from environment for ${config.name}`);
          } else {
            // NEW: Fallback via convention for any other provider ID
            const conventionKey = `${config.id.toUpperCase()}_API_KEY`;
            if (process.env[conventionKey]) {
              apiKey = process.env[conventionKey] || '';
              console.log(`[ProviderManager] Using ${conventionKey} from environment for ${config.name}`);
            } else {
              console.warn(`[ProviderManager] ⚠️ No API Key found for ${config.name}. Please set ${conventionKey} in .env`);
            }
          }

          // Fix for Ollama: If baseURL is missing in DB, default to local.
          // This prevents "Ollama requires a baseURL" initialization errors.
          let baseURL = config.baseUrl || undefined;
          if (config.type === 'ollama' && !baseURL) {
            baseURL = process.env.OLLAMA_HOST || OLLAMA_DEFAULT_HOST;
          }

          if (config.type !== 'ollama' && !apiKey) {
            console.warn(`[ProviderManager] ⚠️ Skipping ${config.name} - No API Key found. Please set ${envMappings[config.type] || (config.type.toUpperCase() + '_API_KEY')} in .env`);
            continue;
          }

          const provider = ProviderFactory.createProvider(config.type, {
            id: config.id,
            apiKey,
            baseURL, // Keep as baseURL here because the Factory expects baseURL for its config
          });
          this.providers.set(config.id, provider);

          // STORE METADATA HERE
          this.providerMetadata.set(config.id, {
            name: config.name,
            type: config.type,
            providerClass: config.providerClass
          });

          console.log(`[ProviderManager] ✅ Online: ${config.name} (${config.type})`);
        } catch (error) {
          console.error(`[ProviderManager] ❌ Failed to init ${config.name}:`, error);
        }
      }

      // 3. Auto-detect Ollama (Local)
      await this.detectLocalOllama();

    } catch (error) {
      console.error('[ProviderManager] Critical Error loading providers:', error);
    }
  }

  private async bootstrapFromEnv() {
    const mappings = [
      { env: 'GOOGLE_GENERATIVE_AI_API_KEY', type: 'google', label: 'Google AI Studio (Env)' },
      { env: 'MISTRAL_API_KEY', type: 'mistral', label: 'Mistral API (Env)' },
      { env: 'OPENROUTER_API_KEY', type: 'openrouter', label: 'OpenRouter (Env)', url: OPENROUTER_API_URL },
      { env: 'GROQ_API_KEY', type: 'groq', label: 'Groq (Env)', url: GROQ_API_URL },
      { env: 'NVIDIA_API_KEY', type: 'nvidia', label: 'NVIDIA (Env)', url: NVIDIA_API_URL },
      { env: 'CEREBRAS_API_KEY', type: 'cerebras', label: 'Cerebras (Env)', url: 'https://api.cerebras.ai/v1' },
      { env: 'XAI_API_KEY', type: 'xai', label: 'xAI (Env)', url: 'https://api.x.ai/v1' }
    ];

    for (const map of mappings) {
      const key = process.env[map.env];
      if (key) {
        // Check if already exists to avoid duplicates
        const existing = await this.repository.findProviderConfigByName(map.label);

        if (!existing) {
          console.log(`[ProviderManager] 🚀 Bootstrapping ${map.label} from .env...`);
          // Create a stable, human-readable ID instead of a random UUID.
          // e.g., "OpenRouter (Env)" -> "openrouter-env"
          const stableId = map.type;

          const now = new Date();
          await this.repository.createProviderConfig({
            id: stableId,
            name: map.label,
            type: map.type,
            // apiKey: encrypt(key), // REMOVED: Keys are now in env only
            baseUrl: map.url || '',
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    }
  }

  getProvider(id: string): BaseLLMProvider | undefined {
    // Allow lookup by "type" as well if ID fails (e.g. "google")
    if (this.providers.has(id)) return this.providers.get(id);

    // Fallback: Find first provider of this type
    for (const [_, p] of this.providers) {
      if (p.id === id || p.id.includes(id)) return p;
    }
    return undefined;
  }

  hasProvider(partialId: string): boolean {
    return Array.from(this.providers.keys()).some(k => k.includes(partialId));
  }

  async getAllModels(): Promise<LLMModel[]> {
    const allModels: LLMModel[] = [];
    for (const provider of this.providers.values()) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch {
        console.error(`Failed to fetch models from provider ${provider.id}`);
      }
    }
    return allModels;
  }

  /**
   * Syncs all discovered models to the Drizzle tables.
   * Splits data between Registry (lookup) and Provider Tables (details).
   */
  async syncModelsToRegistry() {
    const { RegistrySyncService } = await import('./RegistrySyncService.js');
    await RegistrySyncService.syncModels(this.providers, this.providerMetadata);
  }

  /**
   * Auto-detects a local Ollama instance and registers it as a provider.
   * This allows "zero-config" usage of local models.
   */
  private async detectLocalOllama() {
    const ollamaHost = process.env.OLLAMA_HOST || OLLAMA_DEFAULT_HOST;
    const providerId = OLLAMA_PROVIDER_ID;

    // If already configured in DB, skip auto-detection to respect user config
    if (this.providers.has(providerId)) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);
    try {
      // A simple fetch to the root endpoint is enough to see if Ollama is running.
      const response = await fetch(ollamaHost, { signal: controller.signal });
      const text = await response.text();

      if (response.ok && text.includes('Ollama is running')) {
        console.log(`[ProviderManager] ✅ Auto-detected local Ollama at ${ollamaHost}.`);

        // Ensure the provider config exists in the database.
        const existing = await this.repository.findProviderConfigById(providerId);
        if (!existing) {
          const now = new Date();
          await this.repository.createProviderConfig({
            id: providerId,
            name: 'Ollama (Local)',
            type: 'ollama',
            // apiKey: encrypt(''), // REMOVED
            baseUrl: ollamaHost,
            isEnabled: true,
            createdAt: now,
            updatedAt: now
          });
          console.log('[ProviderManager] Registered local Ollama provider in DB.');
        }

        // Add the provider to the active list. The main sync loop will handle fetching its models.
        const provider = ProviderFactory.createProvider('ollama', { id: providerId, baseURL: ollamaHost });
        this.providers.set(providerId, provider);
      }
    } catch {
      // Silent failure - Ollama just isn't running
      // console.debug(`[ProviderManager] Local Ollama not detected at ${ollamaHost}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // --- STATIC FACADE ---
  // Uses the default repository implementation for backward compatibility
  private static instance = new ProviderManager();

  public static getInstance() {
    return this.instance;
  }

  public static markUnhealthy(providerId: string, cooldownSeconds: number) {
    this.instance.markUnhealthy(providerId, cooldownSeconds);
  }

  public static isHealthy(providerId: string): boolean {
    return this.instance.isHealthy(providerId);
  }

  static async initialize() {
    await this.instance.initialize();
  }

  static getProvider(id: string) {
    return this.instance.getProvider(id);
  }

  static hasProvider(partialId: string) {
    return this.instance.hasProvider(partialId);
  }

  static getProviders() {
    return this.instance.providers;
  }

  static async syncModelsToRegistry() {
    await this.instance.syncModelsToRegistry();
  }

  static async getAllModels() {
    return this.instance.getAllModels();
  }

  static getProviderMetadata() {
    return this.instance.providerMetadata;
  }

  static getProviderIds() {
    return Array.from(this.instance.providers.keys());
  }


}
