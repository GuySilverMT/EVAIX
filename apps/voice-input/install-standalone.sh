#!/bin/bash
# Standalone installer for Voice Input
# This bypasses pnpm workspace issues with Electron

set -e

cd "$(dirname "$0")"

echo "🎤 Voice Input - Standalone Installation"
echo "=========================================="
echo ""

# Check if we're in the voice-input directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from apps/voice-input directory"
  exit 1
fi

echo "📦 Installing dependencies with npm (bypassing pnpm workspace)..."
echo ""

# Remove pnpm artifacts
rm -rf node_modules pnpm-lock.yaml

# Use npm instead of pnpm for this specific package
npm install

echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start the app, run:"
echo "  npm start"
echo ""
echo "Or from the monorepo root:"
echo "  cd apps/voice-input && npm start"
