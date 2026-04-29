# Documentation & Scripts - Master Index

> **Your Guide to the Cooperative OS Documentation**

Last Updated: 2026-01-17

---

## 📚 Primary Guides (Start Here)

### 1. Tool & MCP System
**File:** `TOOL_MCP_GUIDE.md`

**What it covers:**
- Tool types (Native, MCP, Meta)
- MCP servers configuration
- 3 execution modes (JSON_STRICT, CODE_INTERPRETER, HYBRID_AUTO)
- Quick commands

**Key scripts:**
- `apps/api/scripts/debug_mcp_server.ts` - Test MCP servers

---

### 2. Model & Provider System
**File:** `MODEL_PROVIDER_GUIDE.md`

**What it covers:**
- NO hardcoded models principle
- Dynamic model selection (LLMSelector)
- Context ranges vs specific models
- Provider infrastructure
- Surveyor service overview

**Key scripts:**
- `apps/api/scripts/ingest_latest_models.ts` - Sync all models
- `apps/api/scripts/check_providers.ts` - List providers
- `apps/api/scripts/check_models.ts` - Model inventory

**Deep dive:** `MODEL_INGESTION_SURVEYOR_GUIDE.md`

---

### 3. Model Ingestion & Surveyor
**File:** `MODEL_INGESTION_SURVEYOR_GUIDE.md`

**What it covers:**
- Anti-Corruption Pipeline (Raw Data Lake)
- Surveyor service (auto-identifies capabilities)
- Specialized tables (Embedding, Audio, etc.)
- Unknown model fallback
- Pattern matching & heuristics

**When to read:** Deep understanding of how models enter the system

---

### 4. Role System
**File:** `ROLE_GUIDE.md`

**What it covers:**
- Role DNA (5 modules: Identity, Cortex, Context, Governance, Metadata)
- Role Factory service
- Dynamic model assignment (NOT hardcoded)
- Tool assignment
- Context ranges for roles

**Key scripts:**
- `apps/api/scripts/check-roles.ts` - List roles
- `apps/api/scripts/dump_roles.ts` - Export role data

---

## 🔧 Supporting Documentation

### Script Management
**File:** `SCRIPT_AUDIT_CLEANUP.md`

**What it covers:**
- Complete script inventory (80+ scripts audited)
- Categorization (Keep, Archive, Delete)
- Script locations and purposes
- Cleanup results

**Cleanup utility:** `scripts/cleanup-scripts.ts`

---

### Session Recovery
**File:** `SESSION_RECOVERY.md`

**What it covers:**
- What happened during accidental rejection
- What was restored
- Key takeaways

---

## 📂 Archive

Historical documentation (safe to ignore):

**Location:** `scripts/archive/`
- migrations/ - One-time migration scripts
- cleanup/ - Deduplication scripts
- old-seeds/ - Legacy seeding scripts
- one-time-fixes/ - Specific bug fixes

---

## 🎯 Quick Reference

### Common Tasks

#### Models
```bash
# Sync all models
npx tsx apps/api/scripts/ingest_latest_models.ts

# Check model count
npx tsx apps/api/scripts/check_models.ts

# List providers
npx tsx apps/api/scripts/check_providers.ts
```

#### Roles
```bash
# List all roles
npx tsx apps/api/scripts/check-roles.ts

# Export role data
npx tsx apps/api/scripts/dump_roles.ts
```

#### MCP/Tools
```bash
# Test MCP server
npx tsx apps/api/scripts/debug_mcp_server.ts <server-name>
```

#### Development
```bash
# Start UI
./start-ui.sh

# Stop services
./stop-dev.sh

# Clean build artifacts
./cleanup.sh
```

---

## 📊 System Status

### Current State (2026-01-17)

**Models:**
- ✅ 100+ chat models available
- ✅ 6 API providers + 1 local (Ollama)
- ✅ Dynamic selection via LLMSelector
- ✅ Surveyor auto-identifying capabilities

**Roles:**
- ✅ 9 roles defined
- ✅ 7 with active variants
- ✅ 3 execution modes working
- ✅ Dynamic model assignment (context ranges)

**Tools:**
- ✅ 177 tools enabled
- ✅ 4 core MCP servers active
- ✅ 3 execution modes documented

**Scripts:**
- ✅ 25+ active scripts
- ✅ 18 archived (historical)
- ✅ 26 removed (redundant)
- ✅ All documented

---

## 🔑 Key Principles

### 1. Models Are NOT Hardcoded
Roles define requirements (context range, capabilities), LLMSelector picks best model dynamically.

### 2. Three Execution Modes
- **JSON_STRICT** - Architects, managers (pure JSON-RPC)
- **CODE_INTERPRETER** - Workers, engineers (TypeScript)
- **HYBRID_AUTO** - Generalists, auditors (AI picks)

### 3. Anti-Corruption Pipeline
Phase 1: Raw Data Lake (exact copy)  
Phase 2: Gatekeeper (filter, normalize, classify)

### 4. Surveyor Service
Automatically identifies model capabilities via pattern matching and heuristics.

---

## 📋 Checklist for New Contributors

- [ ] Read `TOOL_MCP_GUIDE.md` - Understand tool system
- [ ] Read `MODEL_PROVIDER_GUIDE.md` - Understand NO hardcoded models
- [ ] Read `ROLE_GUIDE.md` - Understand role DNA
- [ ] Check `SCRIPT_AUDIT_CLEANUP.md` - Know which scripts to use
- [ ] Run `check_models.ts` and `check-roles.ts` to see system state

---

## 🆘 Troubleshooting

**Model not appearing?**
→ Check `MODEL_INGESTION_SURVEYOR_GUIDE.md` - Troubleshooting section

**Role can't select model?**
→ Check `ROLE_GUIDE.md` - Context ranges might be too narrow

**MCP server not connecting?**
→ Check `TOOL_MCP_GUIDE.md` - MCP server status

**Script confusion?**
→ Check `SCRIPT_AUDIT_CLEANUP.md` - Complete script reference

---

## 📞 Need Help?

1. Check the relevant guide above
2. Look at script comments
3. Check archived scripts if needed

---

**Documentation Status:** ✅ Complete and Up-to-Date  
**Last Cleanup:** 2026-01-17 (Scripts organized)  
**Total Guides:** 7 active documents  
**Total Scripts:** 25+ active, documented
