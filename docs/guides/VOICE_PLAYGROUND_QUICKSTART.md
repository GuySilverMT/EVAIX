# Voice Playground - Quick Start Guide

## Getting Started in 5 Minutes

This guide will help you get the Voice Playground up and running quickly.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Running PostgreSQL database

## Step 1: Database Setup

Run the Prisma migration to create the Voice Playground tables:

```bash
cd apps/api
npx prisma db push
```

This will create:
- `VoiceEngine` table for storing engine configurations
- `VoiceRole` table for storing AI personalities

## Step 2: Start the API Server

```bash
cd apps/api
npm run dev
```

The server will:
- Start on port 4000 (default)
- Initialize mock STT/TTS engines automatically
- Register 3 default AI roles (Friendly Helper, Formal Assistant, Experimental Agent)

You should see:
```
✅ Mock voice engines initialized
[MockSTTEngine] Initializing Mock STT Engine
[MockTTSEngine] Initializing Mock TTS Engine
[MockKeywordListener] Initializing Mock Keyword Listener
```

## Step 3: Start the UI

```bash
cd apps/ui
npm run dev
```

The UI will start on port 5173 (default).

## Step 4: Access Voice Playground

Open your browser and navigate to:
```
http://localhost:5173/voice-playground
```

## Using the Voice Playground

### Input Sources

1. **Microphone** - Record audio from your microphone
2. **File Upload** - Upload audio files for transcription
3. **Android** - Connect Android device via WebSocket
4. **Keyword Listener** - Always-on hotword detection

### Selecting Engines

The UI shows dropdowns for:
- **STT Engine** - Select which speech-to-text engine to use
- **TTS Engine** - Select which text-to-speech engine to use

With mock engines, you'll see:
- Mock STT Engine (mock)
- Mock TTS Engine (mock)
- Mock Keyword Listener (mock)

### Selecting AI Role

Choose from default roles:
- **Friendly Helper** - Casual, warm responses
- **Formal Assistant** - Professional, business tone
- **Experimental Agent** - Creative, innovative

### Processing Flow

1. Choose an input source
2. Select STT/TTS engines (or use defaults)
3. Select AI role
4. Type text in the input area or provide audio
5. Click "Synthesize Speech" to convert text to audio
6. Play the generated audio using the built-in player

## Mock Engine Behavior

The mock engines simulate real behavior:

### Mock STT Engine
- Accepts any audio buffer
- Returns mock transcription based on buffer size
- Simulates 500ms processing delay
- Example output: "Hello world this is a test."

### Mock TTS Engine
- Accepts any text input
- Generates sine wave audio (440Hz tone)
- Simulates 500ms processing delay
- Returns audio buffer (16-bit PCM, 16kHz)

### Mock Keyword Listener
- Accepts keyword registration
- Randomly "detects" keywords every 5 seconds
- Useful for testing keyword-based workflows

## Testing Features

### Test Text-to-Speech

1. Type text in the experiment panel:
   ```
   Hello, this is a test of the text to speech system.
   ```

2. Click "Synthesize Speech"

3. Wait for processing (mock delay: 500ms)

4. Play the generated audio

### Test Keyword Listener

1. Select "Keyword" input source

2. Click "Start Listening"

3. The mock engine will randomly "detect" keywords

4. Check console for detection events

### Test Android Bridge

1. Start Android bridge from UI (settings menu)

2. Connect from Android device:
   ```
   ws://YOUR_DESKTOP_IP:8765
   ```

3. Send test voice event from Android

4. Check transcription result in UI

## Adding Real Engines

To use real STT/TTS engines instead of mocks, see:
- [SpeechLab Integration Guide](./SPEECHLAB_INTEGRATION.md)
- [Voice Playground Documentation](./VOICE_PLAYGROUND.md)

Quick example - adding Whisper:

```typescript
// apps/api/src/services/voice/engines.ts
import { WhisperAdapter } from './adapters/WhisperAdapter.js';

const whisper = new WhisperAdapter({
  id: 'whisper-base',
  name: 'Whisper Base',
  type: 'STT',
  provider: 'whisper',
  isEnabled: true,
  config: {
    modelPath: './models/whisper-base.pt',
  },
});

await registry.registerEngine(whisper);
```

## Environment Variables

Create `.env` file in `apps/api`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/domoreai"

# API
API_PORT=4000
API_HOST=0.0.0.0

# Voice Engines (optional)
ENABLE_REAL_ENGINES=false
ENABLE_WHISPER=false
WHISPER_MODEL_PATH=/path/to/models/whisper

# Android Bridge
ANDROID_BRIDGE_PORT=8765
```

## Troubleshooting

### Port Already in Use

If port 4000 or 5173 is in use:

```bash
# Change API port
API_PORT=4001 npm run dev

# Change UI port
VITE_PORT=5174 npm run dev
```

### Database Connection Error

Verify PostgreSQL is running:
```bash
psql -U postgres -c "SELECT 1"
```

Check database URL in `.env`

### Mock Engines Not Initializing

Check server logs for errors:
```bash
cd apps/api
npm run dev 2>&1 | grep -i "mock\|error"
```

### UI Not Connecting to API

Verify API is running:
```bash
curl http://localhost:4000/health
```

Check CORS configuration in `apps/api/src/index.ts`

## Next Steps

1. **Explore the UI** - Try all input sources and features
2. **Test Different Roles** - See how AI personality affects responses
3. **Add Real Engines** - Follow SpeechLab integration guide
4. **Build Android App** - Create companion app for mobile input
5. **Customize Roles** - Create your own AI personalities

## Resources

- [Voice Playground Documentation](./VOICE_PLAYGROUND.md) - Complete feature docs
- [SpeechLab Integration](./SPEECHLAB_INTEGRATION.md) - Real engine setup
- [API Reference](./API_REFERENCE.md) - tRPC endpoint docs
- [Contributing](../CONTRIBUTING.md) - How to contribute

## Support

For help:
1. Check documentation in `docs/`
2. Search existing GitHub issues
3. Create new issue with details
4. Join community Discord (if available)

## Demo Video

[Coming Soon] - Video walkthrough of Voice Playground features

## Screenshots

[Coming Soon] - UI screenshots and feature demos

---

**Happy Voice Processing! 🎤🤖**
