# SpeechLab Integration Guide

## Overview

SpeechLab is a modular voice processing framework that can be integrated into the Voice Playground system. This guide provides instructions for forking and integrating SpeechLab into the DoMoreAI project.

## Prerequisites

- Node.js 18+ and pnpm
- Git
- Access to the SpeechLab repository

## Integration Steps

### 1. Fork SpeechLab Repository

```bash
# Fork the SpeechLab repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/speechlab.git
cd speechlab
```

### 2. Review SpeechLab Architecture

SpeechLab typically includes:
- **Engine Registry** - Similar to our VoiceEngineRegistry
- **STT Engines** - Whisper, Vosk, Google Speech API wrappers
- **TTS Engines** - Coqui TTS, Google TTS, Amazon Polly wrappers
- **Audio Processing** - Utilities for audio format conversion, resampling
- **Streaming Support** - Real-time audio processing capabilities

### 3. Map SpeechLab Concepts to Voice Playground

| SpeechLab Component | Voice Playground Equivalent |
|---------------------|----------------------------|
| Engine Registry | `services/voice/engineRegistry.ts` |
| STT Engines | Implementations of `STTEngine` interface |
| TTS Engines | Implementations of `TTSEngine` interface |
| Audio Utils | Can be added to `services/voice/audioUtils.ts` |
| Config System | Integrated with Prisma `VoiceEngine` model |

### 4. Create Engine Adapters

Create adapter classes that wrap SpeechLab engines to match our interfaces:

```typescript
// apps/api/src/services/voice/adapters/WhisperAdapter.ts
import { STTEngine, EngineConfig } from '../engineRegistry.js';
import { WhisperEngine } from 'speechlab'; // Example import

export class WhisperAdapter implements STTEngine {
  config: EngineConfig;
  private engine: WhisperEngine;
  private ready: boolean = false;

  constructor(config: EngineConfig) {
    this.config = config;
    this.engine = new WhisperEngine(config.config);
  }

  async initialize(): Promise<void> {
    await this.engine.load();
    this.ready = true;
  }

  async shutdown(): Promise<void> {
    await this.engine.unload();
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    const result = await this.engine.transcribe(audioBuffer);
    return result.text;
  }

  async *transcribeStream(audioStream: ReadableStream): AsyncGenerator<string> {
    for await (const chunk of this.engine.transcribeStream(audioStream)) {
      yield chunk.text;
    }
  }
}
```

### 5. Install SpeechLab Dependencies

Add SpeechLab to your project:

```bash
# Option 1: Install from npm (if published)
cd apps/api
npm install speechlab

# Option 2: Install from local clone
cd apps/api
npm install /path/to/speechlab

# Option 3: Add as workspace package
# Add to pnpm-workspace.yaml:
# packages:
#   - 'apps/*'
#   - 'packages/*'
#   - 'speechlab'
```

### 6. Register Adapted Engines

Update the engine initialization in `apps/api/src/services/voice/engines.ts`:

```typescript
import { getVoiceEngineRegistry } from './engineRegistry.js';
import { WhisperAdapter } from './adapters/WhisperAdapter.js';
import { CoquiTTSAdapter } from './adapters/CoquiTTSAdapter.js';
import { VoskAdapter } from './adapters/VoskAdapter.js';

export async function initializeRealEngines() {
  const registry = getVoiceEngineRegistry();

  // Whisper STT
  if (process.env.ENABLE_WHISPER === 'true') {
    const whisperConfig = {
      id: 'whisper-large-v3',
      name: 'Whisper Large V3',
      type: 'STT' as const,
      provider: 'whisper',
      isEnabled: true,
      config: {
        modelPath: process.env.WHISPER_MODEL_PATH || './models/whisper-large-v3',
        language: 'en',
        task: 'transcribe',
      },
    };
    
    const whisper = new WhisperAdapter(whisperConfig);
    await registry.registerEngine(whisper);
    await registry.initializeEngine(whisperConfig.id);
  }

  // Vosk STT
  if (process.env.ENABLE_VOSK === 'true') {
    const voskConfig = {
      id: 'vosk-en-us',
      name: 'Vosk English',
      type: 'STT' as const,
      provider: 'vosk',
      isEnabled: true,
      config: {
        modelPath: process.env.VOSK_MODEL_PATH || './models/vosk-model-en-us',
        sampleRate: 16000,
      },
    };
    
    const vosk = new VoskAdapter(voskConfig);
    await registry.registerEngine(vosk);
    await registry.initializeEngine(voskConfig.id);
  }

  // Coqui TTS
  if (process.env.ENABLE_COQUI === 'true') {
    const coquiConfig = {
      id: 'coqui-tts',
      name: 'Coqui TTS',
      type: 'TTS' as const,
      provider: 'coqui',
      isEnabled: true,
      config: {
        modelPath: process.env.COQUI_MODEL_PATH || './models/coqui',
        speakerId: 'p256',
        speed: 1.0,
      },
    };
    
    const coqui = new CoquiTTSAdapter(coquiConfig);
    await registry.registerEngine(coqui);
    await registry.initializeEngine(coquiConfig.id);
  }

  console.log('✅ Real voice engines initialized');
}
```

### 7. Update Server Initialization

Modify `apps/api/src/index.ts` to initialize real engines:

```typescript
// Initialize voice engines
try {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_REAL_ENGINES === 'true') {
    await initializeRealEngines();
  } else {
    initializeMockEngines();
  }
  console.log('✅ Voice engines initialized');
} catch (err) {
  console.warn('⚠️ Failed to initialize voice engines:', err);
}
```

### 8. Environment Configuration

Add voice engine configuration to `.env`:

```bash
# Voice Engines
ENABLE_WHISPER=true
WHISPER_MODEL_PATH=/path/to/models/whisper-large-v3

ENABLE_VOSK=true
VOSK_MODEL_PATH=/path/to/models/vosk-model-en-us

ENABLE_COQUI=true
COQUI_MODEL_PATH=/path/to/models/coqui

ENABLE_GOOGLE_SPEECH=false
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

ENABLE_PICOVOICE=false
PICOVOICE_ACCESS_KEY=your_access_key
```

### 9. Model Downloads

Download required models:

```bash
# Whisper models
mkdir -p models/whisper
cd models/whisper
# Download from: https://github.com/openai/whisper
wget https://openaipublic.azureedge.net/main/whisper/models/large-v3.pt

# Vosk models
mkdir -p models/vosk
cd models/vosk
# Download from: https://alphacephei.com/vosk/models
wget https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
unzip vosk-model-en-us-0.22.zip

# Coqui TTS models
mkdir -p models/coqui
cd models/coqui
# Download from: https://github.com/coqui-ai/TTS
# Or use TTS CLI: tts --list_models
```

### 10. Testing Integration

Test each engine individually:

```typescript
// Test Whisper
const whisper = registry.getEngine('whisper-large-v3');
await whisper.initialize();
const audioBuffer = await fs.readFile('./test-audio.wav');
const transcription = await whisper.transcribe(audioBuffer);
console.log('Whisper:', transcription);

// Test Coqui
const coqui = registry.getEngine('coqui-tts');
await coqui.initialize();
const audio = await coqui.synthesize('Hello world');
await fs.writeFile('./output.wav', audio);
```

### 11. Error Handling

Implement robust error handling for engine failures:

```typescript
try {
  await registry.initializeEngine('whisper-large-v3');
} catch (error) {
  console.error('Failed to initialize Whisper:', error);
  // Fall back to mock or alternative engine
  await registry.setActiveEngine('STT', 'mock-stt');
}
```

### 12. Performance Optimization

- **Model Caching**: Keep models loaded in memory
- **GPU Acceleration**: Enable GPU for Whisper/Coqui if available
- **Batch Processing**: Process multiple requests together
- **Streaming**: Use streaming APIs for real-time processing

### 13. Monitoring

Add monitoring for voice engines:

```typescript
// Track engine performance
const metrics = {
  transcriptionTime: 0,
  synthesisTime: 0,
  errors: 0,
};

// Log engine status
setInterval(() => {
  const engines = registry.listAllEngines();
  engines.forEach(engine => {
    console.log(`[${engine.id}] Ready: ${registry.getEngine(engine.id)?.isReady()}`);
  });
}, 60000); // Every minute
```

## Best Practices

1. **Graceful Degradation**: Always have fallback engines
2. **Model Management**: Store models outside the repository
3. **Configuration**: Use environment variables for sensitive data
4. **Testing**: Test each engine thoroughly before deployment
5. **Documentation**: Document any SpeechLab-specific configurations
6. **Updates**: Keep SpeechLab fork synchronized with upstream

## Troubleshooting

### Model Loading Issues
- Verify model paths in environment variables
- Check file permissions
- Ensure sufficient disk space

### Performance Issues
- Enable GPU acceleration if available
- Reduce model size (use smaller Whisper models)
- Implement request queuing to prevent overload

### Memory Issues
- Limit concurrent requests
- Implement model unloading after inactivity
- Monitor memory usage

## References

- [SpeechLab Repository](https://github.com/your-fork/speechlab)
- [Whisper Documentation](https://github.com/openai/whisper)
- [Vosk Documentation](https://alphacephei.com/vosk/)
- [Coqui TTS Documentation](https://github.com/coqui-ai/TTS)
- [Voice Playground Documentation](./VOICE_PLAYGROUND.md)

## Contributing

When adding new engines from SpeechLab:

1. Create an adapter in `apps/api/src/services/voice/adapters/`
2. Add configuration to environment variables
3. Document the integration in this guide
4. Add tests for the new engine
5. Update the Voice Playground UI to show the new engine

## Support

For issues related to:
- **SpeechLab**: Check the SpeechLab repository issues
- **Voice Playground**: Check this repository's issues
- **Engine Integration**: Create an issue in this repository

## License

This integration guide is part of the DoMoreAI project. Refer to the main LICENSE file for details.
