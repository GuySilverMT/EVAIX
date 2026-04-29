# Voice Playground - Universal Voice Processing System

## Overview

The Voice Playground is a comprehensive voice processing and experimentation interface that integrates Speech-to-Text (STT), Text-to-Speech (TTS), keyword listening, Android device integration, and AI personality management.

## Architecture

### Backend Services

#### 1. Voice Engine Registry (`apps/api/src/services/voice/engineRegistry.ts`)
Central registry for managing voice processing engines.

**Engine Types:**
- `STT` - Speech-to-Text engines (Whisper, Vosk, Google Speech, etc.)
- `TTS` - Text-to-Speech engines (Coqui, Google TTS, Amazon Polly, etc.)
- `KEYWORD_LISTENER` - Always-on hotword detection (Picovoice, Vosk)
- `REMOTE_INPUT` - Remote input sources (Android, network streams)

**Key Features:**
- Dynamic engine registration
- Active engine selection per type
- Engine lifecycle management (initialize/shutdown)
- Configuration storage

#### 2. Input Controller (`apps/api/src/services/voice/inputController.ts`)
Routes audio input from multiple sources to STT engines.

**Input Sources:**
- Microphone (local)
- File upload
- Android device (network)
- Keyword trigger
- Google Voice Keyboard

**Features:**
- Queue-based processing
- Async/streaming support
- Source-specific metadata handling

#### 3. Output Controller (`apps/api/src/services/voice/outputController.ts`)
Handles text-to-speech synthesis through various TTS engines.

**Features:**
- Queue-based TTS processing
- Streaming audio synthesis
- Voice/language/speed/pitch control
- Multiple output destinations

#### 4. Keyword Listener Service (`apps/api/src/services/voice/keywordListener.ts`)
Manages always-on hotword detection.

**Features:**
- Multiple keyword registration
- Callback-based detection
- Engine-agnostic interface

#### 5. AI Role Manager (`apps/api/src/services/aiRoleManager.ts`)
Manages AI personalities and roles for voice interactions.

**Default Roles:**
- **Friendly Helper** - Warm, approachable assistant
- **Formal Assistant** - Professional, business-oriented
- **Experimental Agent** - Creative, innovative solutions

**Role Configuration:**
- System prompts
- Context modifiers (temperature, topP, maxTokens)
- Response style (verbosity, tone, formatting)
- Voice settings (preferred voice, speed, pitch)

#### 6. Android Bridge Service (`apps/api/src/services/androidBridge.ts`)
WebSocket server for Android device integration.

**Features:**
- Real-time voice/text/keyboard events from Android
- Bidirectional audio streaming
- Device management
- Multiple concurrent connections

**WebSocket Port:** 8765 (default)

### API Routes

All voice functionality is exposed through tRPC endpoints in `apps/api/src/routers/voice.router.ts`:

#### Engine Management
- `voice.listEngines` - List engines by type
- `voice.getActiveEngine` - Get active engine for a type
- `voice.setActiveEngine` - Set active engine

#### Input/Output
- `voice.transcribeAudio` - Transcribe audio to text
- `voice.synthesizeSpeech` - Synthesize text to speech
- `voice.getInputQueueStatus` - Check input processing queue
- `voice.getOutputQueueStatus` - Check output processing queue

#### Keyword Listener
- `voice.startKeywordListener` - Start listening for keywords
- `voice.stopKeywordListener` - Stop keyword listener
- `voice.getKeywordListenerStatus` - Get listener status
- `voice.registerKeyword` - Register a keyword
- `voice.unregisterKeyword` - Remove a keyword

#### AI Roles
- `voice.listRoles` - List all roles
- `voice.getRole` - Get role by ID
- `voice.getActiveRole` - Get active role
- `voice.setActiveRole` - Set active role
- `voice.createRole` - Create new role
- `voice.updateRole` - Update existing role
- `voice.deleteRole` - Delete role

#### Android Bridge
- `voice.getAndroidDevices` - List connected devices
- `voice.getAndroidBridgeStatus` - Get bridge status
- `voice.startAndroidBridge` - Start WebSocket server
- `voice.stopAndroidBridge` - Stop WebSocket server

### Frontend Components

#### 1. Voice Playground Page (`apps/ui/src/pages/VoicePlayground.tsx`)
Main interface for voice experimentation.

**Features:**
- Input source selection (mic, file, Android, keyword)
- STT/TTS engine selection
- AI role/personality selection
- Live transcription display
- Audio playback
- Real-time status indicators

**Route:** `/voice-playground`

#### 2. Voice Keyboard Overlay (`apps/ui/src/components/VoiceKeyboard.tsx`)
Floating voice-to-text input overlay.

**Features:**
- Right-click activation
- Keyboard shortcuts (ESC to cancel, Enter to submit)
- Real-time transcription
- Confidence display
- Position control

#### 3. Audio Player (`apps/ui/src/components/AudioPlayer.tsx`)
Enhanced audio playback component with streaming support.

**Features:**
- Play/pause/stop controls
- Seek bar
- Time display
- Streaming support

### Database Schema

#### VoiceEngine Model
```prisma
model VoiceEngine {
  id        String   @id @default(cuid())
  name      String
  type      String   // 'STT' | 'TTS' | 'KEYWORD_LISTENER' | 'REMOTE_INPUT'
  provider  String   // e.g., 'whisper', 'vosk', 'google', 'coqui'
  isEnabled Boolean  @default(true)
  config    Json     @default("{}")
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### VoiceRole Model
```prisma
model VoiceRole {
  id               String   @id @default(cuid())
  name             String
  description      String
  personality      String
  systemPrompt     String   @db.Text
  contextModifiers Json?
  responseStyle    Json?
  voiceSettings    Json?
  isActive         Boolean  @default(true)
  metadata         Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## Integration Guide

### Adding a New STT Engine

```typescript
import { getVoiceEngineRegistry, STTEngine, EngineConfig } from './engineRegistry';

const mySTTEngine: STTEngine = {
  config: {
    id: 'my-stt',
    name: 'My STT Engine',
    type: 'STT',
    provider: 'my-provider',
    isEnabled: true,
    config: { apiKey: 'xxx' },
  },
  
  initialize: async () => {
    // Initialize your engine
  },
  
  shutdown: async () => {
    // Cleanup
  },
  
  isReady: () => true,
  
  transcribe: async (audioBuffer: Buffer) => {
    // Implement transcription
    return 'transcribed text';
  },
};

const registry = getVoiceEngineRegistry();
await registry.registerEngine(mySTTEngine);
```

### Adding a New TTS Engine

```typescript
import { getVoiceEngineRegistry, TTSEngine } from './engineRegistry';

const myTTSEngine: TTSEngine = {
  config: {
    id: 'my-tts',
    name: 'My TTS Engine',
    type: 'TTS',
    provider: 'my-provider',
    isEnabled: true,
    config: {},
  },
  
  initialize: async () => {},
  shutdown: async () => {},
  isReady: () => true,
  
  synthesize: async (text: string, options?: any) => {
    // Implement synthesis
    return Buffer.from('audio data');
  },
};

const registry = getVoiceEngineRegistry();
await registry.registerEngine(myTTSEngine);
```

### Adding a New AI Role

```typescript
import { getAIRoleManager } from './aiRoleManager';

const manager = getAIRoleManager();

manager.registerRole({
  id: 'my-custom-role',
  name: 'My Custom Role',
  description: 'A specialized AI assistant',
  personality: 'custom',
  systemPrompt: 'You are a specialized assistant...',
  contextModifiers: {
    temperature: 0.7,
    maxTokens: 1000,
  },
  responseStyle: {
    verbosity: 'detailed',
    tone: 'professional',
  },
  voiceSettings: {
    preferredVoice: 'en-US-Neural',
    speed: 1.0,
  },
  isActive: true,
});
```

### Using the Android Bridge

**Android Client Example:**
```kotlin
// Connect to WebSocket
val socket = WebSocket("ws://desktop-ip:8765")

// Send voice data
val audioData = recordAudio()
socket.send(json {
  type = "voice"
  timestamp = now()
  data = {
    audioData = audioData.toBase64()
    format = "pcm"
    sampleRate = 16000
  }
})

// Receive transcription
socket.onMessage { message ->
  val event = JSON.parse(message)
  if (event.type == "transcription") {
    println("Transcribed: ${event.text}")
  }
}
```

## Future Enhancements

### Phase 1: Engine Integration
- [ ] Integrate Whisper STT engine
- [ ] Integrate Vosk STT engine
- [ ] Integrate Coqui TTS engine
- [ ] Integrate Google Cloud Speech/TTS APIs
- [ ] Integrate Picovoice keyword detection

### Phase 2: Mobile Integration
- [ ] Build Android companion app
- [ ] Add iOS support
- [ ] Implement voice keyboard accessibility service
- [ ] Add mobile UI controls

### Phase 3: Advanced Features
- [ ] Multi-language support
- [ ] Voice biometrics/authentication
- [ ] Real-time translation
- [ ] Voice effects/filters
- [ ] Conversation history persistence

### Phase 4: SpeechLab Integration
- [ ] Fork SpeechLab repository
- [ ] Migrate modular engine system
- [ ] Add plugin pattern support
- [ ] Integrate with existing engines

## Development

### Running the Voice Playground

1. Start the API server:
```bash
cd apps/api
npm run dev
```

2. Start the UI:
```bash
cd apps/ui
npm run dev
```

3. Navigate to `/voice-playground` in the browser

### Testing

The system uses singleton services that can be reset for testing:

```typescript
import { 
  resetVoiceEngineRegistry,
  resetInputController,
  resetOutputController,
  resetKeywordListenerService,
  resetAIRoleManager,
  resetAndroidBridgeService,
} from './services/voice';

// Reset all services
resetVoiceEngineRegistry();
resetInputController();
resetOutputController();
// ... etc
```

## Troubleshooting

### WebSocket Connection Issues
- Check firewall settings for port 8765
- Verify desktop and Android are on same network
- Check Android bridge status: `voice.getAndroidBridgeStatus`

### Audio Playback Issues
- Verify TTS engine is initialized
- Check audio format compatibility
- Ensure browser supports audio playback

### Transcription Accuracy
- Use higher quality audio input (higher sample rate)
- Reduce background noise
- Try different STT engines for comparison
- Adjust microphone sensitivity

## License

Part of the DoMoreAI project.
