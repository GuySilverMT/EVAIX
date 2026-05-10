# Voice Input - System-Wide Speech-to-Text

A standalone application that provides system-wide voice-to-text input capabilities. Insert text anywhere using your voice!

## 🎯 Two Versions Available

### ⭐ Python Version (RECOMMENDED)

**Pros:**
- ✅ Easy to install (auto-installs dependencies)
- ✅ Lightweight (~5MB)
- ✅ Fast startup (<1s)
- ✅ No build process required
- ✅ Works reliably in monorepos

**Cons:**
- ❌ No system tray integration
- ❌ Simpler UI (Tkinter vs HTML/CSS)

### Electron Version (Advanced)

**Pros:**
- ✅ Beautiful glassmorphism UI
- ✅ System tray integration
- ✅ More polished experience

**Cons:**
- ❌ Complex installation (Electron + RobotJS)
- ❌ Larger size (~200MB)
- ❌ Build process required
- ❌ Workspace compatibility issues

## 🚀 Quick Start (Python - Recommended)

```bash
# From monorepo root
./start-voice-input.sh

# Or directly
cd apps/voice-input
python3 voice_input.py
```

On first run, it will automatically install Python dependencies.

## 🎯 How to Use

1. **Start the app** (see above)
2. **Press `Ctrl+Shift+Space`** from anywhere
3. **Speak** into your microphone
4. **Click "Insert Text"** to type it at your cursor

## ✨ Features

- 🌍 **Works Everywhere**: Any application, any text field
- ⌨️ **Global Hotkey**: `Ctrl+Shift+Space` activates from anywhere
- 🖱️ **Mouse-Friendly**: Window appears near your cursor
- 🔒 **Privacy-First**: All processing happens via Google Speech API (free tier)
- ⚡ **Lightweight**: Minimal resource usage

## 📦 Installation

### Python Version (Automatic)

Just run the launcher - it handles everything:

```bash
./start-voice-input.sh
```

### Python Version (Manual)

```bash
# Install dependencies
pip3 install --user pyautogui SpeechRecognition pynput pyaudio

# On Linux, you might need:
sudo apt-get install python3-tk python3-dev portaudio19-dev

# Run the app
cd apps/voice-input
python3 voice_input.py
```

### Electron Version (Advanced Users)

```bash
cd apps/voice-input

# Use the standalone installer (bypasses pnpm workspace)
./install-standalone.sh

# Or manually with npm
npm install
npm run build
npm start
```

## 🐛 Troubleshooting

### Python Version

**"No module named 'pyaudio'"**
```bash
sudo apt-get install portaudio19-dev python3-pyaudio
pip3 install --user pyaudio
```

**"No module named '_tkinter'"**
```bash
sudo apt-get install python3-tk
```

**Microphone not working**
1. Test: `arecord -l`
2. Grant microphone permissions
3. Check volume levels

### Electron Version

**"Electron failed to install correctly"**
```bash
cd apps/voice-input
./install-standalone.sh
```

**RobotJS build errors (Linux)**
```bash
sudo apt-get install libxtst-dev libpng++-dev
```

## 🎨 Architecture

### Python Version
```
Python Script → Tkinter UI → SpeechRecognition → PyAutoGUI → System
```

### Electron Version
```
Electron Main → Browser Window → Web Speech API → RobotJS → System
```

## 📚 Documentation

- **INSTALL_COMPLETE.md** - Installation guide and comparison
- **QUICKSTART.md** - Quick start guide with examples
- **TESTING.md** - Troubleshooting guide

## 🔧 Configuration

### Change the Hotkey (Python)

Edit `voice_input.py`:
```python
hotkey = keyboard.HotKey(
    keyboard.HotKey.parse('<ctrl>+<shift>+<space>'),  # Change this
    on_activate
)
```

### Change the Hotkey (Electron)

Edit `src/main.ts`:
```typescript
const ACTIVATION_SHORTCUT = 'CommandOrControl+Shift+Space'; // Change this
```

## 🎯 Use Cases

- **Coding**: Dictate comments and documentation
- **Email**: Write messages hands-free
- **Terminal**: Enter long commands
- **Note-taking**: Quick voice notes anywhere
- **Accessibility**: Alternative input method

## 🔮 Future Enhancements

- [ ] Multiple language support
- [ ] Offline speech recognition (Vosk)
- [ ] Custom voice commands/macros
- [ ] Text formatting commands
- [ ] History of transcriptions
- [ ] Custom vocabulary

## 📊 Comparison

| Feature | Python | Electron |
|---------|--------|----------|
| Installation | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| UI Quality | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Size | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 💡 Recommendation

**Start with the Python version** - it's simpler, more reliable, and easier to maintain. Only use the Electron version if you specifically need the advanced UI or system tray integration.

## 📝 License

Part of the C.O.R.E. (Cognitive Orchestration & Research Engine) monorepo.

---

**Enjoy your voice-powered typing! 🎤✨**
