/**
 * Voice Output Controller
 * 
 * Sends text for TTS processing through chosen backend
 * Routes output to audio player and supports streaming
 */

import { getVoiceEngineRegistry, TTSEngine } from './engineRegistry.js';

export interface TTSRequest {
  id: string;
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  engineId?: string;
  metadata?: Record<string, any>;
}

export interface TTSResult {
  id: string;
  requestId: string;
  audioData?: Buffer;
  audioUrl?: string;
  engineId: string;
  timestamp: Date;
  processingTimeMs: number;
  metadata?: Record<string, any>;
}

/**
 * Handles text-to-speech output through various TTS engines
 */
export class OutputController {
  private processingQueue: TTSRequest[] = [];
  private isProcessing = false;
  private callbacks: Map<string, (result: TTSResult) => void> = new Map();
  private streamCallbacks: Map<string, (chunk: Buffer) => void> = new Map();
  
  /**
   * Process a TTS request
   */
  async processOutput(request: TTSRequest): Promise<TTSResult> {
    const startTime = Date.now();
    const registry = getVoiceEngineRegistry();
    
    // Get the engine to use
    let engine: TTSEngine | null;
    if (request.engineId) {
      engine = registry.getEngine<TTSEngine>(request.engineId);
    } else {
      engine = registry.getActiveEngine<TTSEngine>('TTS');
    }
    
    if (!engine) {
      throw new Error('No TTS engine available');
    }
    
    // Ensure engine is initialized
    if (!engine.isReady()) {
      await engine.initialize();
    }
    
    // Build options from request
    const options = {
      voice: request.voice,
      language: request.language,
      speed: request.speed,
      pitch: request.pitch,
      ...request.metadata,
    };
    
    // Synthesize audio
    const audioData = await engine.synthesize(request.text, options);
    
    const result: TTSResult = {
      id: `tts_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      requestId: request.id,
      audioData,
      engineId: engine.config.id,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
    
    // Trigger callback if registered
    const callback = this.callbacks.get(request.id);
    if (callback) {
      callback(result);
      this.callbacks.delete(request.id);
    }
    
    return result;
  }
  
  /**
   * Process a TTS request with streaming
   */
  async processOutputStream(
    request: TTSRequest,
    onChunk: (chunk: Buffer) => void,
    onComplete?: (result: TTSResult) => void
  ): Promise<void> {
    const startTime = Date.now();
    const registry = getVoiceEngineRegistry();
    
    // Get the engine to use
    let engine: TTSEngine | null;
    if (request.engineId) {
      engine = registry.getEngine<TTSEngine>(request.engineId);
    } else {
      engine = registry.getActiveEngine<TTSEngine>('TTS');
    }
    
    if (!engine) {
      throw new Error('No TTS engine available');
    }
    
    if (!engine.synthesizeStream) {
      throw new Error('Engine does not support streaming');
    }
    
    // Ensure engine is initialized
    if (!engine.isReady()) {
      await engine.initialize();
    }
    
    // Build options from request
    const options = {
      voice: request.voice,
      language: request.language,
      speed: request.speed,
      pitch: request.pitch,
      ...request.metadata,
    };
    
    // Stream audio chunks
    const chunks: Buffer[] = [];
    for await (const chunk of engine.synthesizeStream(request.text, options)) {
      chunks.push(chunk);
      onChunk(chunk);
    }
    
    // Build complete result
    const result: TTSResult = {
      id: `tts_stream_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      requestId: request.id,
      audioData: Buffer.concat(chunks),
      engineId: engine.config.id,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
    
    if (onComplete) {
      onComplete(result);
    }
  }
  
  /**
   * Queue a TTS request for processing
   */
  async queueOutput(request: TTSRequest, callback?: (result: TTSResult) => void): Promise<string> {
    if (callback) {
      this.callbacks.set(request.id, callback);
    }
    
    this.processingQueue.push(request);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return request.id;
  }
  
  /**
   * Process queued TTS requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const request = this.processingQueue.shift();
      if (request) {
        try {
          await this.processOutput(request);
        } catch (error) {
          console.error(`Error processing TTS request ${request.id}:`, error);
          
          // Call error callback if exists
          const callback = this.callbacks.get(request.id);
          if (callback) {
            // Create error result
            const errorResult: TTSResult = {
              id: `error_${Date.now()}`,
              requestId: request.id,
              engineId: 'error',
              timestamp: new Date(),
              processingTimeMs: 0,
            };
            callback(errorResult);
            this.callbacks.delete(request.id);
          }
        }
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Synthesize text to speech
   */
  async synthesize(
    text: string,
    options?: {
      voice?: string;
      language?: string;
      speed?: number;
      pitch?: number;
      engineId?: string;
    }
  ): Promise<TTSResult> {
    const request: TTSRequest = {
      id: `tts_req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      text,
      ...options,
    };
    
    return this.processOutput(request);
  }
  
  /**
   * Synthesize with streaming
   */
  async synthesizeStream(
    text: string,
    onChunk: (chunk: Buffer) => void,
    options?: {
      voice?: string;
      language?: string;
      speed?: number;
      pitch?: number;
      engineId?: string;
    }
  ): Promise<void> {
    const request: TTSRequest = {
      id: `tts_stream_req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      text,
      ...options,
    };
    
    return this.processOutputStream(request, onChunk);
  }
  
  /**
   * Get queue status
   */
  getQueueStatus(): { length: number; isProcessing: boolean } {
    return {
      length: this.processingQueue.length,
      isProcessing: this.isProcessing,
    };
  }
  
  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.processingQueue = [];
    this.callbacks.clear();
    this.streamCallbacks.clear();
  }
}

// Singleton instance
let controllerInstance: OutputController | null = null;

/**
 * Get the global output controller instance
 */
export function getOutputController(): OutputController {
  if (!controllerInstance) {
    controllerInstance = new OutputController();
  }
  return controllerInstance;
}

/**
 * Reset the controller (useful for testing)
 */
export function resetOutputController(): void {
  controllerInstance = null;
}
