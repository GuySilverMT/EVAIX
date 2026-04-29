# ⚠️ Voice Input - Standalone App

This app is **excluded from the monorepo's `pnpm run dev`** command because:

1. The **Python version** is the recommended approach (simpler, more reliable)
2. The **Electron version** has pnpm workspace compatibility issues
3. It's designed to run **independently** from the main development workflow

## 🚀 How to Run

### Python Version (Recommended)

From the monorepo root:
```bash
./start-voice-input.sh
```

Or directly:
```bash
cd apps/voice-input
python3 voice_input.py
```

### Electron Version (Advanced)

```bash
cd apps/voice-input
./install-standalone.sh  # First time only
npm start
```

## 📝 Note

The voice-input app is **intentionally separate** from the main monorepo workflow because:
- It's a **desktop utility**, not a web service
- It has different runtime requirements (system-level access)
- The Python version doesn't need the build pipeline
- The Electron version uses npm instead of pnpm to avoid workspace issues

## 🔧 Development

If you need to work on the Electron version:

```bash
cd apps/voice-input
npm install
npm run build
npm run dev
```

**Do not use `pnpm`** for the Electron version - it causes installation issues with Electron and RobotJS in the workspace context.

## ✅ Recommended Workflow

1. Use the **Python version** for daily use
2. Run it with `./start-voice-input.sh`
3. Develop the main C.O.R.E. apps with `pnpm run dev` (voice-input is auto-excluded)
4. Both can run simultaneously without conflicts

---

See **README.md** for full documentation.
