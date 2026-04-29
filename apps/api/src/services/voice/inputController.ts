/**
 * Voice Input Controller
 * 
 * Routes input events (mic, file, android, hotword) to selected STT/ASR engine
 * Handles multiple input sources and manages processing pipeline
 */

import { getVoiceEngineRegistry, STTEngine } from './engineRegistry.js';

export type InputSource = 'microphone' | 'file' | 'android' | 'keyword_trigger' | 'google_voice_keyboard';

export interface InputEvent {
  id: string;
  source: InputSource;
  timestamp: Date;
  audioData?: Buffer;
  audioStream?: ReadableStream;
  metadata?: Record<string, any>;
}

export interface TranscriptionResult {
  id: string;
  inputEventId: string;
  text: string;
  confidence?: number;
  engineId: string;
  timestamp: Date;
  processingTimeMs: number;
}

/**
 * Handles voice input from multiple sources and routes to STT engines
 */
export class InputController {
  private processingQueue: InputEvent[] = [];
  private isProcessing = false;
  private callbacks: Map<string, (result: TranscriptionResult) => void> = new Map();
  
  /**
   * Process an input event through the selected STT engine
   */
  async processInput(event: InputEvent, engineId?: string): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const registry = getVoiceEngineRegistry();
    
    // Get the engine to use
    let engine: STTEngine | null;
    if (engineId) {
      engine = registry.getEngine<STTEngine>(engineId);
    } else {
      engine = registry.getActiveEngine<STTEngine>('STT');
    }
    
    if (!engine) {
      throw new Error('No STT engine available');
    }
    
    // Ensure engine is initialized
    if (!engine.isReady()) {
      await engine.initialize();
    }
    
    // Process based on input type
    let transcription: string;
    
    if (event.audioData) {
      // Process audio buffer
      transcription = await engine.transcribe(event.audioData);
    } else if (event.audioStream && engine.transcribeStream) {
      // Process audio stream
      const chunks: string[] = [];
      for await (const chunk of engine.transcribeStream(event.audioStream)) {
        chunks.push(chunk);
      }
      transcription = chunks.join(' ');
    } else {
      throw new Error('Invalid input event: no audio data or stream provided');
    }
    
    const result: TranscriptionResult = {
      id: `transcription_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      inputEventId: event.id,
      text: transcription,
      engineId: engine.config.id,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
    
    // Trigger callback if registered
    const callback = this.callbacks.get(event.id);
    if (callback) {
      callback(result);
      this.callbacks.delete(event.id);
    }
    
    return result;
  }
  
  /**
   * Queue an input event for processing
   */
  async queueInput(event: InputEvent, callback?: (result: TranscriptionResult) => void): Promise<string> {
    if (callback) {
      this.callbacks.set(event.id, callback);
    }
    
    this.processingQueue.push(event);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return event.id;
  }
  
  /**
   * Process queued input events
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const event = this.processingQueue.shift();
      if (event) {
        try {
          await this.processInput(event);
        } catch (error) {
          console.error(`Error processing input event ${event.id}:`, error);
          
          // Call error callback if exists
          const callback = this.callbacks.get(event.id);
          if (callback) {
            // Create error result
            const errorResult: TranscriptionResult = {
              id: `error_${Date.now()}`,
              inputEventId: event.id,
              text: '',
              engineId: 'error',
              timestamp: new Date(),
              processingTimeMs: 0,
            };
            callback(errorResult);
            this.callbacks.delete(event.id);
          }
        }
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Process microphone input
   */
  async processMicrophoneInput(audioData: Buffer, metadata?: Record<string, any>): Promise<TranscriptionResult> {
    const event: InputEvent = {
      id: `mic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      source: 'microphone',
      timestamp: new Date(),
      audioData,
      metadata,
    };
    
    return this.processInput(event);
  }
  
  /**
   * Process file input
   */
  async processFileInput(audioData: Buffer, filename: string, metadata?: Record<string, any>): Promise<TranscriptionResult> {
    const event: InputEvent = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      source: 'file',
      timestamp: new Date(),
      audioData,
      metadata: { ...metadata, filename },
    };
    
    return this.processInput(event);
  }
  
  /**
   * Process Android input
   */
  async processAndroidInput(audioData: Buffer, deviceId: string, metadata?: Record<string, any>): Promise<TranscriptionResult> {
    const event: InputEvent = {
      id: `android_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      source: 'android',
      timestamp: new Date(),
      audioData,
      metadata: { ...metadata, deviceId },
    };
    
    return this.processInput(event);
  }
  
  /**
   * Process keyword trigger
   */
  async processKeywordTrigger(keyword: string, audioData?: Buffer, metadata?: Record<string, any>): Promise<TranscriptionResult> {
    const event: InputEvent = {
      id: `keyword_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      source: 'keyword_trigger',
      timestamp: new Date(),
      audioData,
      metadata: { ...metadata, keyword },
    };
    
    return this.processInput(event);
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
  }
}

// Singleton instance
let controllerInstance: InputController | null = null;

/**
 * Get the global input controller instance
 */
export function getInputController(): InputController {
  if (!controllerInstance) {
    controllerInstance = new InputController();
  }
  return controllerInstance;
}

/**
 * Reset the controller (useful for testing)
 */
export function resetInputController(): void {
  controllerInstance = null;
}
