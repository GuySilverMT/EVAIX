#!/bin/bash

# Shell Script Cleanup - Root Directory
# Archives one-time test and fix scripts

set -e

echo ""
echo "🧹 Shell Script Cleanup"
echo "======================="
echo ""

ARCHIVE_DIR="scripts/archive/shell-tests"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# Scripts to archive
SCRIPTS_TO_ARCHIVE=(
    "fix_git.sh"
    "test-anti-corruption.sh"
    "test_script.sh"
)

echo "📦 Archiving one-time/test scripts:"
echo ""

for script in "${SCRIPTS_TO_ARCHIVE[@]}"; do
    if [ -f "$script" ]; then
        mv "$script" "$ARCHIVE_DIR/"
        echo "  ✅ Archived: $script"
    else
        echo "  ℹ️  Not found: $script"
    fi
done

echo ""
echo "✅ Active Development Scripts (keeping):"
echo "  • start-ui.sh - Start UI dev server"
echo "  • stop-dev.sh - Stop dev servers"
echo "  • cleanup.sh - Remove build artifacts"
echo "  • start-voice-input.sh - Launch voice input"
echo ""
echo "📁 Archived to: $ARCHIVE_DIR"
echo ""
echo "Cleanup complete!"
