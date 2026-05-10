# 🎤 Voice Input - Quick Start Guide

## What You Just Got

A **system-wide speech-to-text application** that lets you insert text with your voice anywhere on your computer - not just in browsers!

## Key Features

✅ **Works Everywhere**: Any application, any text field  
✅ **Global Hotkey**: `Ctrl+Shift+Space` activates it instantly  
✅ **Mouse-Friendly**: Window appears near your cursor  
✅ **Beautiful UI**: Modern, animated interface  
✅ **Privacy-First**: All processing happens locally  

## How to Use

### 1. Start the Application

```bash
./start-voice-input.sh
```

Or from the voice-input directory:
```bash
cd apps/voice-input
pnpm run start
```

The app will minimize to your system tray (look for a microphone icon).

### 2. Activate Voice Input

**Method 1 - Hotkey (Recommended):**
- Click where you want to insert text
- Press `Ctrl+Shift+Space`
- A floating window appears near your cursor

**Method 2 - Tray Icon:**
- Right-click the tray icon
- Select "Show Window"

### 3. Speak Your Text

- The microphone icon will pulse (red) when listening
- Speak clearly into your microphone
- Watch your words appear in real-time
- Click "Insert Text" when done (or press Enter)

### 4. Text Gets Inserted

- The window disappears
- Your spoken text is typed at your cursor position
- Works in ANY application!

## Example Workflow

1. Open your text editor, email client, or any app
2. Click in a text field
3. Press `Ctrl+Shift+Space`
4. Say: "Hello, this is a test of the voice input system"
5. Click "Insert Text"
6. ✨ Text appears where your cursor was!

## Customization

### Change the Hotkey

Edit `apps/voice-input/src/main.ts`:

```typescript
const ACTIVATION_SHORTCUT = 'CommandOrControl+Shift+Space'; // Change this
```

Available options:
- `CommandOrControl+Shift+V`
- `Alt+Space`
- `Super+V` (Windows key + V)
- Any combination you prefer!

After changing, rebuild:
```bash
cd apps/voice-input
pnpm run build
pnpm run start
```

## Troubleshooting

### "No microphone found"
- Check your system microphone is connected
- Grant microphone permissions to Electron
- Test your mic in other apps first

### Hotkey doesn't work
- Another app might be using the same hotkey
- Try a different key combination
- Restart the application after changes

### Text doesn't insert
- Make sure the target app accepts keyboard input
- Click in the text field before activating
- Some apps (terminals) need focus first

### App won't start
On Linux, you might need system dependencies:
```bash
sudo apt-get install libxtst-dev libpng++-dev
```

Then reinstall:
```bash
cd apps/voice-input
pnpm install
pnpm run build
```

## Advanced Usage

### Run in Development Mode

```bash
cd apps/voice-input
pnpm run dev
```

This opens DevTools for debugging.

### Package for Distribution

```bash
cd apps/voice-input
pnpm run package
```

Creates an installable package in `release/`.

## Tips for Best Results

1. **Speak Clearly**: Natural pace, clear pronunciation
2. **Quiet Environment**: Reduce background noise
3. **Good Microphone**: Better mic = better accuracy
4. **Punctuation**: Say "period", "comma", "question mark"
5. **Review First**: Check the transcript before inserting

## What Makes This Different?

Unlike browser-based solutions:
- ✅ Works in **any application** (not just Chrome)
- ✅ **System-level integration** via global hotkeys
- ✅ **Lightweight** - runs in background
- ✅ **No browser required** when typing
- ✅ **Direct keyboard simulation** - works everywhere

## Architecture

```
┌─────────────────────────────────────┐
│  System Tray (Always Running)       │
│  - Global Hotkey Listener           │
│  - Ctrl+Shift+Space                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Floating Window (On Demand)        │
│  - Web Speech API                   │
│  - Real-time Transcription          │
│  - Beautiful UI                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  RobotJS (System Integration)       │
│  - Keyboard Simulation              │
│  - Types text at cursor             │
└─────────────────────────────────────┘
```

## Next Steps

Want to enhance it? Ideas:
- Add custom voice commands
- Support multiple languages
- Create text macros
- Add formatting commands
- Build a history feature

Check `apps/voice-input/README.md` for more details!

---

**Enjoy your new voice-powered typing! 🎤✨**
