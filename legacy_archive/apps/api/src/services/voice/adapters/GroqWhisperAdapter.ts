import Groq from 'groq-sdk';
import { STTEngine, EngineConfig } from '../engineRegistry.js';

/**
 * Groq Whisper STT Adapter
 * Uses Groq's ultra-fast Whisper API for speech-to-text
 */

export class GroqWhisperAdapter implements STTEngine {
  config: EngineConfig;
  private client: Groq | null = null;
  private modelName: string;

  constructor(config: EngineConfig) {
    this.config = config;
    // Extract model name from config (e.g., "whisper-large-v3-turbo")
    this.modelName = (config.config as any).model || 'whisper-large-v3-turbo';
  }

  async initialize(): Promise<void> {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  GROQ_API_KEY not set. Groq Whisper will not work.');
      return;
    }

    this.client = new Groq({
      apiKey,
    });

    console.log(`✅ Groq Whisper initialized: ${this.modelName}`);
  }

  async shutdown(): Promise<void> {
    this.client = null;
    console.log(`🔌 Groq Whisper shutdown: ${this.modelName}`);
  }

  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Transcribe audio using Groq Whisper
   * @param audioBuffer - Audio data as Buffer
   * @param options - Optional transcription options
   * @returns Transcribed text
   */
  async transcribe(
    audioBuffer: Buffer,
    options?: {
      language?: string;
      prompt?: string;
      temperature?: number;
    }
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Groq Whisper not initialized. Call initialize() first.');
    }

    try {
      // Convert buffer to File object
      const audioFile = new File([new Uint8Array(audioBuffer)], 'audio.webm', {
        type: 'audio/webm',
      });

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: this.modelName,
        language: options?.language || 'en',
        prompt: options?.prompt,
        temperature: options?.temperature || 0,
        response_format: 'json',
      });

      return transcription.text;
    } catch (error) {
      console.error('Groq Whisper transcription error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio with streaming support
   * Note: Groq doesn't support streaming for Whisper, so this provides a generator that emits the full result
   */
  async *transcribeStream(audioStream: ReadableStream<any>): AsyncGenerator<string> {
    // Collecting stream data to Buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const audioBuffer = Buffer.concat(chunks);
    const text = await this.transcribe(audioBuffer);
    yield text;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca', 'nl',
      'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms', 'cs', 'ro',
      'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml', 'cy',
      'sk', 'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk', 'br', 'eu',
      'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw', 'gl', 'mr', 'pa', 'si', 'km',
      'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be', 'tg', 'sd', 'gu', 'am', 'yi', 'lo',
      'uz', 'fo', 'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg',
      'as', 'tt', 'haw', 'ln', 'ha', 'ba', 'jw', 'su'
    ];
  }
}
