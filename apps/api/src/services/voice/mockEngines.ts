/**
 * Mock STT Engine
 * 
 * Simple mock implementation for testing and demonstration
 */

import { STTEngine, EngineConfig } from './engineRegistry.js';

export class MockSTTEngine implements STTEngine {
  config: EngineConfig;
  private ready: boolean = false;

  constructor(id: string = 'mock-stt', name: string = 'Mock STT Engine') {
    this.config = {
      id,
      name,
      type: 'STT',
      provider: 'mock',
      isEnabled: true,
      config: {},
      metadata: {
        description: 'Mock STT engine for testing',
        version: '1.0.0',
        capabilities: ['transcribe'],
      },
    };
  }

  async initialize(): Promise<void> {
    console.log(`[MockSTTEngine] Initializing ${this.config.name}`);
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.ready = true;
    console.log(`[MockSTTEngine] Initialized successfully`);
  }

  async shutdown(): Promise<void> {
    console.log(`[MockSTTEngine] Shutting down ${this.config.name}`);
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    if (!this.ready) {
      throw new Error('Engine not initialized');
    }

    console.log(`[MockSTTEngine] Transcribing ${audioBuffer.length} bytes`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock transcription based on audio length
    const words = [
      'Hello', 'world', 'this', 'is', 'a', 'test',
      'speech', 'recognition', 'system', 'working',
      'perfectly', 'fine', 'thank', 'you',
    ];

    const wordCount = Math.max(1, Math.floor(audioBuffer.length / 1000));
    const selectedWords = [];
    for (let i = 0; i < Math.min(wordCount, words.length); i++) {
      selectedWords.push(words[i]);
    }

    return selectedWords.join(' ') + '.';
  }

  async *transcribeStream(audioStream: ReadableStream): AsyncGenerator<string> {
    if (!this.ready) {
      throw new Error('Engine not initialized');
    }

    console.log(`[MockSTTEngine] Transcribing stream`);

    // Mock streaming transcription
    const chunks = ['Hello', ' world', ', this is', ' a streaming', ' transcription.'];
    
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 300));
      yield chunk;
    }
  }
}

/**
 * Mock TTS Engine
 * 
 * Simple mock implementation for testing and demonstration
 */

import { TTSEngine } from './engineRegistry.js';

export class MockTTSEngine implements TTSEngine {
  config: EngineConfig;
  private ready: boolean = false;

  constructor(id: string = 'mock-tts', name: string = 'Mock TTS Engine') {
    this.config = {
      id,
      name,
      type: 'TTS',
      provider: 'mock',
      isEnabled: true,
      config: {},
      metadata: {
        description: 'Mock TTS engine for testing',
        version: '1.0.0',
        capabilities: ['synthesize', 'synthesizeStream'],
      },
    };
  }

  async initialize(): Promise<void> {
    console.log(`[MockTTSEngine] Initializing ${this.config.name}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    this.ready = true;
    console.log(`[MockTTSEngine] Initialized successfully`);
  }

  async shutdown(): Promise<void> {
    console.log(`[MockTTSEngine] Shutting down ${this.config.name}`);
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  async synthesize(text: string, options?: any): Promise<Buffer> {
    if (!this.ready) {
      throw new Error('Engine not initialized');
    }

    console.log(`[MockTTSEngine] Synthesizing: "${text}"`);
    console.log(`[MockTTSEngine] Options:`, options);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock audio data (sine wave)
    const sampleRate = 16000;
    const duration = Math.max(1, text.length / 10); // ~10 chars per second
    const samples = Math.floor(sampleRate * duration);
    const buffer = Buffer.alloc(samples * 2); // 16-bit samples

    for (let i = 0; i < samples; i++) {
      const value = Math.floor(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 32767);
      buffer.writeInt16LE(value, i * 2);
    }

    return buffer;
  }

  async *synthesizeStream(text: string, options?: any): AsyncGenerator<Buffer> {
    if (!this.ready) {
      throw new Error('Engine not initialized');
    }

    console.log(`[MockTTSEngine] Synthesizing stream: "${text}"`);

    // Mock streaming synthesis - split into chunks
    const words = text.split(' ');
    const chunkSize = Math.ceil(words.length / 5);

    for (let i = 0; i < words.length; i += chunkSize) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const chunk = words.slice(i, i + chunkSize).join(' ');
      const audioChunk = await this.synthesize(chunk, options);
      
      yield audioChunk;
    }
  }
}

/**
 * Mock Keyword Listener Engine
 */

import { KeywordListenerEngine } from './engineRegistry.js';

export class MockKeywordListenerEngine implements KeywordListenerEngine {
  config: EngineConfig;
  private ready: boolean = false;
  private listening: boolean = false;
  private keywords: Set<string> = new Set();
  private callback: ((keyword: string) => void) | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(id: string = 'mock-keyword', name: string = 'Mock Keyword Listener') {
    this.config = {
      id,
      name,
      type: 'KEYWORD_LISTENER',
      provider: 'mock',
      isEnabled: true,
      config: {},
      metadata: {
        description: 'Mock keyword listener for testing',
        version: '1.0.0',
        capabilities: ['listen', 'detect'],
      },
    };
  }

  async initialize(): Promise<void> {
    console.log(`[MockKeywordListener] Initializing ${this.config.name}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    this.ready = true;
    console.log(`[MockKeywordListener] Initialized successfully`);
  }

  async shutdown(): Promise<void> {
    console.log(`[MockKeywordListener] Shutting down ${this.config.name}`);
    await this.stopListening();
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  async startListening(callback: (keyword: string) => void): Promise<void> {
    if (!this.ready) {
      throw new Error('Engine not initialized');
    }

    console.log(`[MockKeywordListener] Starting listener`);
    this.listening = true;
    this.callback = callback;

    // Simulate random keyword detection
    this.intervalId = setInterval(() => {
      if (this.keywords.size > 0 && this.callback && Math.random() > 0.8) {
        const keywordArray = Array.from(this.keywords);
        const randomKeyword = keywordArray[Math.floor(Math.random() * keywordArray.length)];
        console.log(`[MockKeywordListener] Detected keyword: "${randomKeyword}"`);
        this.callback(randomKeyword);
      }
    }, 5000);
  }

  async stopListening(): Promise<void> {
    console.log(`[MockKeywordListener] Stopping listener`);
    this.listening = false;
    this.callback = null;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  addKeyword(keyword: string): void {
    console.log(`[MockKeywordListener] Adding keyword: "${keyword}"`);
    this.keywords.add(keyword.toLowerCase());
  }

  removeKeyword(keyword: string): void {
    console.log(`[MockKeywordListener] Removing keyword: "${keyword}"`);
    this.keywords.delete(keyword.toLowerCase());
  }
}

/**
 * Initialize mock engines
 */
export async function initializeMockEngines() {
  const { getVoiceEngineRegistry } = await import('./engineRegistry.js');
  const registry = getVoiceEngineRegistry();

  // Register mock STT engine
  const mockSTT = new MockSTTEngine();
  await registry.registerEngine(mockSTT);

  // Register mock TTS engine
  const mockTTS = new MockTTSEngine();
  await registry.registerEngine(mockTTS);

  // Register mock keyword listener
  const mockKeyword = new MockKeywordListenerEngine();
  await registry.registerEngine(mockKeyword);

  console.log('[Mock Engines] All mock engines registered');
}
