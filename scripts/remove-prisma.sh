#!/usr/bin/env bash
# =============================================================================
# remove-prisma.sh — Surgical Prisma Excision for EVAIX API
# =============================================================================
# This script performs the following steps:
#   1. Removes @prisma/client and prisma from package.json
#   2. Strips `RUN npx prisma generate` from the Dockerfile
#   3. Rewrites src/db.ts to a no-op stub
#   4. Nukes the entire apps/api/prisma/ directory
#   5. Nukes all one-off DB scripts in apps/api/src/scripts/ and src/db/
#   6. Strips `import ... from '@prisma/client'` lines from service/router files
#   7. Reports files that still have prisma references (need manual review)
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_ROOT="$REPO_ROOT/apps/api"
SRC="$API_ROOT/src"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
info() { echo -e "      $*"; }

echo ""
echo "============================================================"
echo "  EVAIX — Prisma Excision Script"
echo "============================================================"
echo ""

# ---------------------------------------------------------------------------
# 1. Remove prisma entries from apps/api/package.json
# ---------------------------------------------------------------------------
PKG="$API_ROOT/package.json"
if [ -f "$PKG" ]; then
  # Remove @prisma/client and prisma package lines
  sed -i '/"@prisma\/client"/d' "$PKG"
  sed -i '/"prisma"/d'         "$PKG"
  # Remove prisma scripts (postmigrate / premigrate referencing prisma)
  sed -i '/npx prisma/d'       "$PKG"
  ok "Stripped @prisma/client + prisma from $PKG"
else
  warn "package.json not found at $PKG"
fi

# ---------------------------------------------------------------------------
# 2. Strip `RUN npx prisma generate` from the Dockerfile
# ---------------------------------------------------------------------------
DOCKERFILE="$API_ROOT/Dockerfile"
if [ -f "$DOCKERFILE" ]; then
  sed -i '/npx prisma generate/d' "$DOCKERFILE"
  # Also remove any trailing comment that references prisma
  sed -i '/# Generate Prisma Client/d' "$DOCKERFILE"
  ok "Removed prisma generate step from Dockerfile"
else
  warn "Dockerfile not found at $DOCKERFILE"
fi

# ---------------------------------------------------------------------------
# 3. Rewrite src/db.ts to a lightweight stub
# ---------------------------------------------------------------------------
DB_FILE="$SRC/db.ts"
if [ -f "$DB_FILE" ]; then
  cat > "$DB_FILE" <<'STUB'
/**
 * db.ts — Stub: Prisma has been removed.
 * Replace this with your actual vector/JSON store client if needed.
 */
export const db = {
  // TODO: wire up your pgvector or JSON-file store here
};
STUB
  ok "Replaced $DB_FILE with stub"
else
  warn "src/db.ts not found — skipping stub creation"
fi

# ---------------------------------------------------------------------------
# 4. Delete the prisma/ schema directory
# ---------------------------------------------------------------------------
PRISMA_DIR="$API_ROOT/prisma"
if [ -d "$PRISMA_DIR" ]; then
  rm -rf "$PRISMA_DIR"
  ok "Deleted $PRISMA_DIR"
else
  info "No prisma/ directory found — already clean"
fi

# ---------------------------------------------------------------------------
# 5. Delete one-off DB scripts that are purely Prisma wrappers
#    (Scripts that have no purpose without the ORM)
# ---------------------------------------------------------------------------
DB_SCRIPTS_DIR="$SRC/db"
if [ -d "$DB_SCRIPTS_DIR" ]; then
  rm -rf "$DB_SCRIPTS_DIR"
  ok "Deleted $SRC/db/ (seed scripts)"
fi

SCRIPTS=(
  "$SRC/scripts/add-cerebras.ts"
  "$SRC/scripts/add-meta-to-architect.ts"
  "$SRC/scripts/check-roles-data.ts"
  "$SRC/scripts/check-whisper.ts"
  "$SRC/scripts/clean-cuid-overrides.ts"
  "$SRC/scripts/clean-junk-models.ts"
  "$SRC/scripts/clean-orphaned-roletools.ts"
  "$SRC/scripts/debug-providers.ts"
  "$SRC/scripts/debug-roles.ts"
  "$SRC/scripts/debug-target-model.ts"
  "$SRC/scripts/ensure-providers.ts"
  "$SRC/scripts/fix-architect.ts"
  "$SRC/scripts/fix-bad-models.ts"
  "$SRC/scripts/fix-registry-data.ts"
  "$SRC/scripts/force-sync.ts"
  "$SRC/scripts/inspect-role-architect.ts"
  "$SRC/scripts/list-architect-variants.ts"
  "$SRC/scripts/list-providers.ts"
  "$SRC/scripts/repro-agent-fail.ts"
  "$SRC/scripts/restore_db.ts"
  "$SRC/scripts/temp-list-roles.ts"
  "$SRC/scripts/update-role-architect-prompt.ts"
  "$SRC/scripts/update-role-dna.ts"
  "$SRC/scripts/verify-role-creation-robustness.ts"
  "$SRC/scripts/verify-role-persistence.ts"
  "$SRC/scripts/test-routing-override.ts"
  "$SRC/scripts/sync_roles_from_json.ts"
  "$SRC/scripts/seed-core-roles.ts"
  "$SRC/scripts/check-types.ts"
)

DELETED_SCRIPTS=0
for f in "${SCRIPTS[@]}"; do
  if [ -f "$f" ]; then
    rm -f "$f"
    DELETED_SCRIPTS=$((DELETED_SCRIPTS + 1))
  fi
done
ok "Deleted $DELETED_SCRIPTS Prisma-only script files"

# ---------------------------------------------------------------------------
# 6. Delete the PrismaAgentConfigRepository (pure ORM wrapper, no value)
# ---------------------------------------------------------------------------
PRISMA_REPO="$SRC/repositories/PrismaAgentConfigRepository.ts"
if [ -f "$PRISMA_REPO" ]; then
  rm -f "$PRISMA_REPO"
  ok "Deleted PrismaAgentConfigRepository.ts"
fi

# ---------------------------------------------------------------------------
# 7. Strip bare `import ... from '@prisma/client'` lines from remaining files
#    (does NOT attempt to remove usage — just the import declarations)
# ---------------------------------------------------------------------------
echo ""
echo "  Stripping @prisma/client import lines from service/router files..."
STRIPPED_FILES=0
while IFS= read -r -d '' file; do
  if grep -q "from '@prisma/client'\|from \"@prisma/client\"\|require('@prisma/client')\|require(\"@prisma/client\")" "$file"; then
    sed -i \
      -e "/from '@prisma\/client'/d" \
      -e '/from "@prisma\/client"/d' \
      -e "/require('@prisma\/client')/d" \
      -e '/require("@prisma\/client")/d' \
      "$file"
    STRIPPED_FILES=$((STRIPPED_FILES + 1))
    info "Stripped import → $file"
  fi
done < <(find "$SRC" -name "*.ts" -not -path "*/node_modules/*" -print0)
ok "Stripped @prisma/client imports from $STRIPPED_FILES files"

# ---------------------------------------------------------------------------
# 8. Final audit — list files that still mention prisma (need manual review)
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "  MANUAL REVIEW REQUIRED — remaining prisma references:"
echo "============================================================"

REMAINING=$(grep -rn --include="*.ts" "prisma" "$SRC" 2>/dev/null | grep -v "//.*prisma" || true)

if [ -z "$REMAINING" ]; then
  ok "Zero remaining prisma references in $SRC — you're clean!"
else
  warn "The following files still use prisma and need manual refactoring:"
  echo "$REMAINING" | awk -F: '{print "  "$1":"$2}' | sort -u
  echo ""
  echo -e "${YELLOW}  These typically fall into two categories:${NC}"
  echo "  A) prisma.<model>.findMany() calls  → replace with JSON file reads"
  echo "  B) Prisma type references (e.g. Prisma.AgentConfig) → replace with local types"
fi

echo ""
echo "============================================================"
echo "  Next Steps"
echo "============================================================"
echo "  1. Run: pnpm install   (at monorepo root) to drop prisma lockfile entries"
echo "  2. Review files listed above and replace ORM calls with JSON reads"
echo "  3. Run: pnpm --filter=api build  to verify zero-error build"
echo "============================================================"
echo ""
