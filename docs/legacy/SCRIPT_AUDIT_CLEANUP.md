# Script Audit & Cleanup Plan

## Overview

Found **80+ scripts** across 3 locations:
- Root directory: 11 scripts (.sh, .ts, .js)
- scripts/: 11 scripts (.ts)
- apps/api/scripts/: 69 scripts (.ts, .js)

---

## Script Categorization

### ✅ KEEP - Active & Essential

#### Model/Provider Scripts
**Location:** `apps/api/scripts/`

| Script | Purpose | Doc Reference |
|--------|---------|---------------|
| `ingest_latest_models.ts` | **PRIMARY** - Full model sync | MODEL_INGESTION_SURVEYOR_GUIDE.md |
| `debug_mcp_server.ts` | Test single MCP server | TOOL_MCP_GUIDE.md |
| `check_providers.ts` | List active providers | MODEL_PROVIDER_GUIDE.md |
| `check_models.ts` | Model inventory | MODEL_PROVIDER_GUIDE.md |

#### Role Scripts
**Location:** `apps/api/scripts/`

| Script | Purpose | Doc Reference |
|--------|---------|---------------|
| `check-roles.ts` | List all roles | ROLE_GUIDE.md |
| `list_roles.ts` | Role inventory | ROLE_GUIDE.md |
| `dump_roles.ts` | Export role data | ROLE_GUIDE.md |

#### Development Scripts
**Location:** Root

| Script | Purpose | Doc Reference |
|--------|---------|---------------|
| `start-ui.sh` | Start UI dev server | - |
| `stop-dev.sh` | Stop all dev servers | - |
| `cleanup.sh` | Clean build artifacts | - |

**Location:** `scripts/`

| Script | Purpose | Doc Reference |
|--------|---------|---------------|
| `env-loader.ts` | Load environment vars | Used by other scripts |

---

### ⚠️ ARCHIVE - Historical/One-Time Use

#### Migration Scripts (One-time, probably done)
**Location:** `apps/api/scripts/`

- `migrate-role-templates.ts` - Role template migration
- `migrate-specs-to-capabilities.ts` - Specs → ModelCapabilities
- `fix_failed_migration.ts` - Migration fixer
- `verify_migration.ts` - Migration validator
- `restore_from_backup.ts` - Backup restoration
- `restore_raw_table.ts` - Raw table restoration
- `drop_view.ts` - Drop database view

**Action:** Move to `scripts/archive/migrations/`

#### Deduplication Scripts (One-time cleanup)
**Location:** `apps/api/scripts/`

- `deduplicate_models.ts` - Remove duplicate models
- `deduplicate_roles.ts` - Remove duplicate roles
- `cleanup_providers.ts` - Clean provider table

**Action:** Move to `scripts/archive/cleanup/`

#### Old Seeding Scripts (Replaced by newer system)
**Location:** `apps/api/scripts/`

- `seed_chain_of_command.ts`
- `seed_datacenter_helper.ts`
- `seed_org_chart.ts`
- `seed_prompt_engineer.ts`
- `seed_ui_designer.ts`

**Action:** Move to `scripts/archive/old-seeds/`

---

### ❌ DELETE - Redundant/Obsolete

#### Duplicate Functionality

**Root directory:**
- `check_roles.ts` - **DELETE** (duplicate of apps/api/scripts/check-roles.ts)
- `check_duplicates.ts` - **DELETE** (dedup done, use audit-models.ts)
- `cleanup_models.ts` - **DELETE** (use ingest_latest_models.ts)

**apps/api/scripts/:**

**Model ingestion (redundant):**
- `ingest_models_robust.ts` - **DELETE** (use ingest_latest_models.ts)
- `reingest-all.ts` - **DELETE** (use ingest_latest_models.ts)
- `refresh-models.ts` - **DELETE** (use ingest_latest_models.ts)
- `reset-and-sync.ts` - **DELETE** (dangerous, use ingest_latest_models.ts)

**Verification (redundant):**
- `verify-ingestion-fix.ts` - **DELETE** (one-time fix)
- `verify_normalization.ts` - **DELETE** (one-time check)
- `verify-specialization.ts` - **DELETE** (one-time check)
- `final-check.ts` - **DELETE** (generic name, unclear purpose)

**Debug/Test (redundant):**
- `debug-models-json.ts` - **DELETE** (use check_models.ts)
- `fetch-groq.ts` - **DELETE** (specific provider test)
- `smoke-context.ts/.js/.d.ts` - **DELETE** (test artifacts)
- `check_resource.ts/.js/.d.ts` - **DELETE** (compiled artifacts)
- `check_saved_queries.ts/.js/.d.ts` - **DELETE** (compiled artifacts)

**Cleanup (dangerous/redundant):**
- `wipe-models.ts` - **DELETE** (dangerous, use with caution comment)
- `wipe-roles.ts` - **DELETE** (dangerous, use with caution comment)
- `prune_legacy_roles.ts` - **DELETE** (legacy cleanup done)

**Comparison (one-time):**
- `compare-orms.ts` - **DELETE** (ORM comparison, decision made)
- `gap-analysis.ts` - **DELETE** (gap analysis done)
- `diagnose-join.ts` - **DELETE** (specific debug)

**Old/Unclear:**
- `antigravity.ts` - **CHECK** - What does this do?
- `audit_doctor.ts` - **CHECK** - Still needed?
- `force_heal.ts` - **CHECK** - Still needed?
- `find-ghost-ui.ts` - **DELETE** (specific bug hunt)
- `delete_old_ui_role.ts` - **DELETE** (one-time cleanup)
- `fix_role_typos.ts` - **DELETE** (one-time fix)
- `demo_role_decoupling.ts` - **DELETE** (demo script)

---

### 🔍 REVIEW - Need Clarification

**Root directory:**
- `test-anti-corruption.sh` - Test anti-corruption pipeline?
- `test-jsx-parser.js` - JSX parser test?
- `test_script.sh` - Generic test?
- `fix_git.sh` - Git fixer?
- `start-voice-input.sh` - Voice input starter?

**scripts/:**
- `run-aqa-audit.ts` - AQA audit (tool quality?)
- `seed-coordinator.ts` - Coordinator seeding?
- `sync-all.ts` - Sync what?
- `test-healer-protocol.ts` - Healer protocol test?
- `verify-agent-fixes.ts` - Agent fixes verification?
- `verify-hybrid-role-creation.ts` - Role creation test?
- `generate_mcp_manifests.ts` - MCP manifest generation?
- `generate_native_docs.ts/.js/.d.ts` - Native tool docs?

**apps/api/scripts/:**
- `add-search-codebase-to-roles.ts` - One-time tool assignment?
- `audit-models.ts` - Model audit?
- `check-capabilities.ts` - Capability check?
- `fix-capabilities.ts` - Capability fix?
- `count-models.ts` - Model counter (use check_models.ts instead?)
- `export_db_to_json.ts` - DB export utility?
- `ingest-agents.ts` - Agent ingestion?
- `ingest-codebase.ts` - Codebase ingestion?
- `inspect-db.ts` - DB inspector?
- `inspect-role-prompts.ts` - Role prompt inspector?
- `inventory_roles.js` - Role inventory (JS version)?
- `manage_providers.ts` - Provider management?
- `setup-vector-db.ts` - Vector DB setup?
- `sync_roles_from_json.ts` - Role sync from JSON?
- `sync_roles.ts` - Role sync?
- `update-groq-key.ts` - Groq key updater?

---

## Cleanup Action Plan

### Phase 1: Archive (Don't Delete Yet)

```bash
mkdir -p scripts/archive/{migrations,cleanup,old-seeds,one-time-fixes}

# Move migration scripts
mv apps/api/scripts/migrate-*.ts scripts/archive/migrations/
mv apps/api/scripts/*_migration.ts scripts/archive/migrations/
mv apps/api/scripts/restore_*.ts scripts/archive/migrations/
mv apps/api/scripts/drop_view.ts scripts/archive/migrations/

# Move cleanup scripts
mv apps/api/scripts/deduplicate_*.ts scripts/archive/cleanup/
mv apps/api/scripts/cleanup_providers.ts scripts/archive/cleanup/

# Move old seeding scripts
mv apps/api/scripts/seed_*.ts scripts/archive/old-seeds/

# Move one-time fixes
mv apps/api/scripts/*_typos.ts scripts/archive/one-time-fixes/
mv apps/api/scripts/delete_old_*.ts scripts/archive/one-time-fixes/
mv apps/api/scripts/find-ghost-*.ts scripts/archive/one-time-fixes/
```

### Phase 2: Delete Redundant

```bash
# Root duplicates
rm check_roles.ts check_duplicates.ts cleanup_models.ts

# Model ingestion redundant
rm apps/api/scripts/ingest_models_robust.ts
rm apps/api/scripts/reingest-all.ts
rm apps/api/scripts/refresh-models.ts
rm apps/api/scripts/reset-and-sync.ts

# Verification redundant
rm apps/api/scripts/verify-ingestion-fix.ts
rm apps/api/scripts/verify_normalization.ts
rm apps/api/scripts/verify-specialization.ts
rm apps/api/scripts/final-check.ts

# Debug redundant
rm apps/api/scripts/debug-models-json.ts
rm apps/api/scripts/fetch-groq.ts
rm apps/api/scripts/smoke-context.*
rm apps/api/scripts/check_resource.{js,d.ts}
rm apps/api/scripts/check_saved_queries.{js,d.ts}

# Dangerous/legacy
rm apps/api/scripts/wipe-*.ts
rm apps/api/scripts/prune_legacy_roles.ts

# One-time/done
rm apps/api/scripts/compare-orms.ts
rm apps/api/scripts/gap-analysis.ts
rm apps/api/scripts/diagnose-join.ts
rm apps/api/scripts/demo_role_decoupling.ts
```

### Phase 3: Document Active Scripts

Update documentation with script references:

**MODEL_INGESTION_SURVEYOR_GUIDE.md:**
```markdown
## Scripts

**Primary:**
- `apps/api/scripts/ingest_latest_models.ts` - Full model sync
- `apps/api/scripts/check_providers.ts` - List providers
- `apps/api/scripts/check_models.ts` - Model inventory

**Debug:**
- `apps/api/scripts/debug_mcp_server.ts` - Test MCP server connectivity
```

**ROLE_GUIDE.md:**
```markdown
## Scripts

**Inspection:**
- `apps/api/scripts/check-roles.ts` - List all roles
- `apps/api/scripts/dump_roles.ts` - Export role data
- `apps/api/scripts/inspect-role-prompts.ts` - View role prompts

**Management:**
- Via UI: Agent DNA Lab
```

**TOOL_MCP_GUIDE.md:**
```markdown
## Scripts

**MCP Testing:**
- `apps/api/scripts/debug_mcp_server.ts <server-name>` - Test server

**Tool Sync:**
- Currently manual via UI
```

---

## Final Structure

```
mono/
├── scripts/
│   ├── env-loader.ts              ✅ Keep (utility)
│   └── archive/
│       ├── migrations/
│       ├── cleanup/
│       ├── old-seeds/
│       └── one-time-fixes/
│
├── apps/api/scripts/
│   ├── ingest_latest_models.ts    ✅ PRIMARY - Model sync
│   ├── check_providers.ts         ✅ Keep - Provider list
│   ├── check_models.ts            ✅ Keep - Model inventory
│   ├── check-roles.ts             ✅ Keep - Role list
│   ├── dump_roles.ts              ✅ Keep - Role export
│   ├── debug_mcp_server.ts        ✅ Keep - MCP debug
│   └── (review remaining ~15)
│
└── Root
    ├── start-ui.sh                ✅ Keep - Dev
    ├── stop-dev.sh                ✅ Keep - Dev
    └── cleanup.sh                 ✅ Keep - Dev
```

---

## Recommendations

1. **Run Phase 1 first** (archive, don't delete)
2. **Test system** after archiving
3. **Run Phase 2** (delete redundant) after 1 week of testing
4. **Review "🔍 REVIEW" scripts** - clarify purpose before deciding
5. **Update docs** with active script references

---

## Script Reference Guide

### Model Management
```bash
# Sync all models from all providers
npx tsx apps/api/scripts/ingest_latest_models.ts

# List active providers
npx tsx apps/api/scripts/check_providers.ts

# Check model count
npx tsx apps/api/scripts/check_models.ts
```

### Role Management
```bash
# List all roles
npx tsx apps/api/scripts/check-roles.ts

# Export role data
npx tsx apps/api/scripts/dump_roles.ts
```

### MCP/Tools
```bash
# Test MCP server
npx tsx apps/api/scripts/debug_mcp_server.ts filesystem
```

---

**Total Removal:** ~35 scripts (redundant/obsolete)  
**Total Archive:** ~20 scripts (historical)  
**Total Keep:** ~25 scripts (active/essential)
