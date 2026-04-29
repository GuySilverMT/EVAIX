/**
 * Keyword Listener Service
 * 
 * Handles always-on hotword detection
 * Can be used with Picovoice, Vosk, or other keyword spotting engines
 */

import { getVoiceEngineRegistry, KeywordListenerEngine } from './engineRegistry.js';

export interface KeywordDetectionEvent {
  id: string;
  keyword: string;
  confidence?: number;
  timestamp: Date;
  engineId: string;
  audioContext?: Buffer;
}

export type KeywordCallback = (event: KeywordDetectionEvent) => void;

/**
 * Manages keyword detection and always-on listening
 */
export class KeywordListenerService {
  private listeners: Map<string, KeywordCallback[]> = new Map();
  private isListening = false;
  private activeEngineId: string | null = null;
  
  /**
   * Start listening for keywords
   */
  async startListening(engineId?: string): Promise<void> {
    if (this.isListening) {
      console.warn('Keyword listener already running');
      return;
    }
    
    const registry = getVoiceEngineRegistry();
    
    // Get the engine to use
    let engine: KeywordListenerEngine | null;
    if (engineId) {
      engine = registry.getEngine<KeywordListenerEngine>(engineId);
    } else {
      engine = registry.getActiveEngine<KeywordListenerEngine>('KEYWORD_LISTENER');
    }
    
    if (!engine) {
      throw new Error('No keyword listener engine available');
    }
    
    // Ensure engine is initialized
    if (!engine.isReady()) {
      await engine.initialize();
    }
    
    // Start listening
    await engine.startListening((keyword: string) => {
      this.handleKeywordDetection(keyword, engine!.config.id);
    });
    
    this.isListening = true;
    this.activeEngineId = engine.config.id;
  }
  
  /**
   * Stop listening for keywords
   */
  async stopListening(): Promise<void> {
    if (!this.isListening || !this.activeEngineId) {
      return;
    }
    
    const registry = getVoiceEngineRegistry();
    const engine = registry.getEngine<KeywordListenerEngine>(this.activeEngineId);
    
    if (engine) {
      await engine.stopListening();
    }
    
    this.isListening = false;
    this.activeEngineId = null;
  }
  
  /**
   * Register a keyword and callback
   */
  registerKeyword(keyword: string, callback: KeywordCallback): void {
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    if (!this.listeners.has(normalizedKeyword)) {
      this.listeners.set(normalizedKeyword, []);
      
      // Add keyword to active engine if listening
      if (this.isListening && this.activeEngineId) {
        const registry = getVoiceEngineRegistry();
        const engine = registry.getEngine<KeywordListenerEngine>(this.activeEngineId);
        if (engine) {
          engine.addKeyword(normalizedKeyword);
        }
      }
    }
    
    this.listeners.get(normalizedKeyword)!.push(callback);
  }
  
  /**
   * Unregister a keyword callback
   */
  unregisterKeyword(keyword: string, callback?: KeywordCallback): void {
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    if (!this.listeners.has(normalizedKeyword)) {
      return;
    }
    
    if (callback) {
      // Remove specific callback
      const callbacks = this.listeners.get(normalizedKeyword)!;
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      
      // If no more callbacks, remove keyword
      if (callbacks.length === 0) {
        this.listeners.delete(normalizedKeyword);
        
        // Remove keyword from active engine if listening
        if (this.isListening && this.activeEngineId) {
          const registry = getVoiceEngineRegistry();
          const engine = registry.getEngine<KeywordListenerEngine>(this.activeEngineId);
          if (engine) {
            engine.removeKeyword(normalizedKeyword);
          }
        }
      }
    } else {
      // Remove all callbacks for this keyword
      this.listeners.delete(normalizedKeyword);
      
      // Remove keyword from active engine if listening
      if (this.isListening && this.activeEngineId) {
        const registry = getVoiceEngineRegistry();
        const engine = registry.getEngine<KeywordListenerEngine>(this.activeEngineId);
        if (engine) {
          engine.removeKeyword(normalizedKeyword);
        }
      }
    }
  }
  
  /**
   * Handle keyword detection
   */
  private handleKeywordDetection(keyword: string, engineId: string): void {
    const normalizedKeyword = keyword.toLowerCase().trim();
    const callbacks = this.listeners.get(normalizedKeyword);
    
    if (!callbacks || callbacks.length === 0) {
      return;
    }
    
    const event: KeywordDetectionEvent = {
      id: `keyword_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      keyword: normalizedKeyword,
      timestamp: new Date(),
      engineId,
    };
    
    // Call all registered callbacks
    for (const callback of callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in keyword callback for "${keyword}":`, error);
      }
    }
  }
  
  /**
   * Get all registered keywords
   */
  getRegisteredKeywords(): string[] {
    return Array.from(this.listeners.keys());
  }
  
  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }
  
  /**
   * Get active engine ID
   */
  getActiveEngineId(): string | null {
    return this.activeEngineId;
  }
}

// Singleton instance
let serviceInstance: KeywordListenerService | null = null;

/**
 * Get the global keyword listener service instance
 */
export function getKeywordListenerService(): KeywordListenerService {
  if (!serviceInstance) {
    serviceInstance = new KeywordListenerService();
  }
  return serviceInstance;
}

/**
 * Reset the service (useful for testing)
 */
export function resetKeywordListenerService(): void {
  serviceInstance = null;
}
