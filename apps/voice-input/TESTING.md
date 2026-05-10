# 🧪 Voice Input - Testing Guide

## Quick Test

Here's a simple way to test if everything is working:

### 1. Start the Application

```bash
./start-voice-input.sh
```

You should see:
```
🎤 Voice Input - System-Wide Speech-to-Text
===========================================

✅ Starting Voice Input...
📌 Press Ctrl+Shift+Space from anywhere to activate!
📌 Look for the microphone icon in your system tray
```

### 2. Open a Text Editor

Open any text editor (gedit, VS Code, terminal, etc.)

### 3. Test the Hotkey

1. Click in the text field
2. Press `Ctrl+Shift+Space`
3. You should see a floating window appear near your cursor

### 4. Test Voice Input

Say something like:
- "Hello world, this is a test"
- "Testing one two three"
- "The quick brown fox jumps over the lazy dog"

Watch the text appear in the transcript area.

### 5. Insert the Text

Click the "Insert Text" button (or press Enter)

The window should disappear and your spoken text should appear in the text editor!

## Troubleshooting Tests

### Test 1: Check if Electron is installed

```bash
cd apps/voice-input
npx electron --version
```

Should show something like: `v28.0.0`

### Test 2: Check if build succeeded

```bash
ls -la apps/voice-input/dist/
```

Should show:
- `main.js`
- `main.d.ts`
- `main.js.map`

### Test 3: Check microphone access

Open Chrome or Firefox and visit:
```
chrome://settings/content/microphone
```

Make sure microphone access is allowed.

### Test 4: Test RobotJS (if text insertion fails)

On Linux, you might need:
```bash
sudo apt-get install libxtst-dev libpng++-dev
```

Then reinstall:
```bash
cd apps/voice-input
rm -rf node_modules
pnpm install
pnpm run build
```

### Test 5: Run in development mode

For debugging with DevTools:
```bash
cd apps/voice-input
pnpm run dev
```

This opens the DevTools console where you can see any errors.

## Expected Behavior

✅ **System Tray**: App should appear in system tray  
✅ **Hotkey**: `Ctrl+Shift+Space` should show window  
✅ **Window Position**: Should appear near mouse cursor  
✅ **Microphone**: Should pulse red when listening  
✅ **Transcription**: Text should appear in real-time  
✅ **Insertion**: Text should type at cursor position  
✅ **Window Hide**: Should hide after inserting text  

## Common Issues

### "No microphone found"
- Check `arecord -l` (Linux) to see available mics
- Test mic in other apps first
- Grant permissions in browser settings

### Hotkey doesn't work
- Check if another app is using `Ctrl+Shift+Space`
- Try changing the hotkey in `src/main.ts`
- Restart the app

### Window doesn't appear
- Check system tray for the app icon
- Try right-click tray icon → "Show Window"
- Check terminal for error messages

### Text doesn't insert
- Make sure target app has focus
- Click in the text field first
- Some apps (terminals) need explicit focus

### Build errors
```bash
cd apps/voice-input
rm -rf node_modules dist
pnpm install
pnpm run build
```

## Performance Test

The app should:
- Start in < 2 seconds
- Show window in < 100ms after hotkey
- Begin listening immediately
- Insert text in < 100ms

## Next Steps

Once basic testing works:
1. Try it in different applications
2. Test with longer phrases
3. Try punctuation commands ("period", "comma")
4. Test the Cancel button
5. Try clicking outside the window (should hide)

---

**If all tests pass, you're ready to use Voice Input! 🎉**
