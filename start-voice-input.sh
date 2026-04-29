#!/bin/bash
# Voice Input Launcher
# Starts the system-wide voice-to-text application

set -e

cd "$(dirname "$0")/apps/voice-input"

echo "🎤 Voice Input - System-Wide Speech-to-Text"
echo "==========================================="
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    echo "   Install with: sudo apt-get install python3 python3-pip"
    exit 1
fi

echo "✅ Starting Voice Input (Python version)..."
echo "📌 Press Ctrl+Shift+Space from anywhere to activate!"
echo "📌 Window will appear near your cursor"
echo ""

# Run the Python app (it will auto-install dependencies on first run)
python3 voice_input.py
