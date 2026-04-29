/**
 * Voice Engine Registry Service
 * 
 * Central registry for managing STT/TTS/KeywordListener engines
 * Supports dynamic registration and configuration from database
 */

export type EngineType = 'STT' | 'TTS' | 'BIDIRECTIONAL' | 'KEYWORD_LISTENER' | 'REMOTE_INPUT';

export interface EngineConfig {
  id: string;
  name: string;
  type: EngineType;
  provider: string; // e.g., 'whisper', 'vosk', 'google', 'coqui', 'picovoice'
  isEnabled: boolean;
  config: Record<string, any>;
  metadata?: {
    description?: string;
    version?: string;
    capabilities?: string[];
  };
}

export interface Engine {
  config: EngineConfig;
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
  isReady: () => boolean;
}

export interface STTEngine extends Engine {
  transcribe: (audioBuffer: Buffer) => Promise<string>;
  transcribeStream?: (audioStream: ReadableStream) => AsyncGenerator<string>;
}

export interface TTSEngine extends Engine {
  synthesize: (text: string, options?: any) => Promise<Buffer>;
  synthesizeStream?: (text: string, options?: any) => AsyncGenerator<Buffer>;
}

export interface KeywordListenerEngine extends Engine {
  startListening: (callback: (keyword: string) => void) => Promise<void>;
  stopListening: () => Promise<void>;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
}

export interface RemoteInputEngine extends Engine {
  connect: (endpoint: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onData: (callback: (data: any) => void) => void;
}

/**
 * VoiceEngineRegistry manages all voice processing engines
 */
export class VoiceEngineRegistry {
  private engines: Map<string, Engine> = new Map();
  private activeEngines: Map<EngineType, string> = new Map();
  
  /**
   * Register a new engine
   */
  async registerEngine(engine: Engine): Promise<void> {
    const { id, type } = engine.config;
    
    if (this.engines.has(id)) {
      throw new Error(`Engine with id ${id} already registered`);
    }
    
    this.engines.set(id, engine);
    
    // Auto-activate if it's the first engine of this type
    if (!this.activeEngines.has(type)) {
      this.setActiveEngine(type, id);
    }
  }
  
  /**
   * Unregister an engine
   */
  async unregisterEngine(engineId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error(`Engine ${engineId} not found`);
    }
    
    // Shutdown if running
    if (engine.isReady()) {
      await engine.shutdown();
    }
    
    this.engines.delete(engineId);
    
    // Clear active if this was the active engine
    this.activeEngines.forEach((activeId, type) => {
      if (activeId === engineId) {
        this.activeEngines.delete(type);
      }
    });
  }
  
  /**
   * Set the active engine for a given type
   */
  setActiveEngine(type: EngineType, engineId: string): void {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error(`Engine ${engineId} not found`);
    }
    
    if (engine.config.type !== type) {
      throw new Error(`Engine ${engineId} is not of type ${type}`);
    }
    
    this.activeEngines.set(type, engineId);
  }
  
  /**
   * Get the active engine for a given type
   */
  getActiveEngine<T extends Engine = Engine>(type: EngineType): T | null {
    const engineId = this.activeEngines.get(type);
    if (!engineId) {
      return null;
    }
    
    return this.engines.get(engineId) as T || null;
  }
  
  /**
   * Get engine by ID
   */
  getEngine<T extends Engine = Engine>(engineId: string): T | null {
    return this.engines.get(engineId) as T || null;
  }
  
  /**
   * List all engines of a given type
   */
  listEnginesByType(type: EngineType): EngineConfig[] {
    return Array.from(this.engines.values())
      .filter(engine => engine.config.type === type)
      .map(engine => engine.config);
  }
  
  /**
   * List all registered engines
   */
  listAllEngines(): EngineConfig[] {
    return Array.from(this.engines.values()).map(engine => engine.config);
  }
  
  /**
   * Initialize an engine
   */
  async initializeEngine(engineId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error(`Engine ${engineId} not found`);
    }
    
    if (!engine.isReady()) {
      await engine.initialize();
    }
  }
  
  /**
   * Shutdown an engine
   */
  async shutdownEngine(engineId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error(`Engine ${engineId} not found`);
    }
    
    if (engine.isReady()) {
      await engine.shutdown();
    }
  }
  
  /**
   * Shutdown all engines
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.engines.values())
      .filter(engine => engine.isReady())
      .map(engine => engine.shutdown());
    
    await Promise.all(shutdownPromises);
  }
}

// Singleton instance
let registryInstance: VoiceEngineRegistry | null = null;

/**
 * Get the global voice engine registry instance
 */
export function getVoiceEngineRegistry(): VoiceEngineRegistry {
  if (!registryInstance) {
    registryInstance = new VoiceEngineRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (useful for testing)
 */
export function resetVoiceEngineRegistry(): void {
  registryInstance = null;
}
