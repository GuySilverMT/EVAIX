# Complete Script Inventory & Documentation Status

## Scripts Remaining After Cleanup

### scripts/ (11 scripts)

| Script | Status | Documented In | Purpose |
|--------|--------|---------------|---------|
| cleanup-scripts.ts | ✅ Documented | SCRIPT_AUDIT_CLEANUP.md | Script cleanup utility |
| env-loader.ts | ✅ Documented | SCRIPT_AUDIT_CLEANUP.md | Environment loader (utility) |
| generate_mcp_manifests.ts | ⚠️ MISSING | - | MCP manifest generation |
| generate_native_docs.ts | ⚠️ MISSING | - | Native tool docs generation |
| run-aqa-audit.ts | ⚠️ MISSING | - | Tool AQA audit |
| seed-coordinator.ts | ⚠️ MISSING | - | Coordinator seeding |
| sync-all.ts | ⚠️ MISSING | - | Sync all? |
| test-healer-protocol.ts | ⚠️ MISSING | - | Healer protocol test |
| verify-agent-fixes.ts | ⚠️ MISSING | - | Agent fixes verification |
| verify-hybrid-role-creation.ts | ⚠️ MISSING | - | Role creation test |

### apps/api/scripts/ (27 scripts)

#### ✅ DOCUMENTED Scripts

| Script | Documented In | Purpose |
|--------|---------------|---------|
| **ingest_latest_models.ts** | MODEL_INGESTION_SURVEYOR_GUIDE.md | **PRIMARY** - Full model sync |
| **check_providers.ts** | MODEL_PROVIDER_GUIDE.md | List active providers |
| **check_models.ts** | MODEL_PROVIDER_GUIDE.md | Model inventory |
| **debug_mcp_server.ts** | TOOL_MCP_GUIDE.md | Test MCP server |
| **check-roles.ts** | ROLE_GUIDE.md | List all roles |
| **dump_roles.ts** | ROLE_GUIDE.md | Export role data |
| list_roles.ts | ROLE_GUIDE.md | Role inventory (duplicate of check-roles?) |

#### ⚠️ UNDOCUMENTED Scripts (20)

| Script | Likely Purpose | Should Document In |
|--------|----------------|-------------------|
| add-search-codebase-to-roles.ts | One-time tool assignment | Archive? |
| antigravity.ts | ??? (What is this?) | ??? |
| audit_doctor.ts | Model audit? | MODEL_PROVIDER_GUIDE.md? |
| audit-models.ts | Model validation | MODEL_PROVIDER_GUIDE.md |
| check-capabilities.ts | Check model capabilities | MODEL_PROVIDER_GUIDE.md |
| check_resource.ts | Resource check | ??? |
| check_saved_queries.ts | Query check | ??? |
| count-models.ts | Count models (redundant with check_models?) | Delete? |
| export_db_to_json.ts | DB export utility | Document as utility |
| fix-capabilities.ts | Fix model capabilities | Archive? (one-time fix) |
| force_heal.ts | Force healing? | ??? |
| ingest-agents.ts | Agent ingestion | ??? |
| ingest-codebase.ts | Codebase ingestion (for RAG?) | Document |
| inspect-db.ts | DB inspector | Document as utility |
| inspect-role-prompts.ts | View role prompts | ROLE_GUIDE.md |
| manage_providers.ts | Provider management | MODEL_PROVIDER_GUIDE.md |
| setup-vector-db.ts | Vector DB setup (for RAG) | Document |
| sync_roles_from_json.ts | Role sync from JSON | ROLE_GUIDE.md? |
| sync_roles.ts | Role sync | ROLE_GUIDE.md? |
| update-groq-key.ts | Update Groq API key | Archive? (one-time) |

---

## Action Items

### 1. Document Active Scripts

#### Add to MODEL_PROVIDER_GUIDE.md:
```markdown
## Scripts

**Primary:**
- `apps/api/scripts/ingest_latest_models.ts` - Full model sync
- `apps/api/scripts/check_providers.ts` - List providers
- `apps/api/scripts/check_models.ts` - Model inventory

**Utilities:**
- `apps/api/scripts/audit-models.ts` - Model validation
- `apps/api/scripts/check-capabilities.ts` - Check capabilities
- `apps/api/scripts/manage_providers.ts` - Provider management

**Debug:**
- `apps/api/scripts/inspect-db.ts` - Database inspector
```

#### Add to ROLE_GUIDE.md:
```markdown
## Scripts

**Inspection:**
- `apps/api/scripts/check-roles.ts` - List all roles
- `apps/api/scripts/list_roles.ts` - Role inventory (alias)
- `apps/api/scripts/dump_roles.ts` - Export role data
- `apps/api/scripts/inspect-role-prompts.ts` - View role prompts

**Management:**
- `apps/api/scripts/sync_roles.ts` - Sync roles
- `apps/api/scripts/sync_roles_from_json.ts` - Import from JSON
```

#### Add to TOOL_MCP_GUIDE.md:
```markdown
## Scripts

**MCP Testing:**
- `apps/api/scripts/debug_mcp_server.ts <server-name>` - Test server

**Tool Generation:**
- `scripts/generate_mcp_manifests.ts` - Generate MCP manifests
- `scripts/generate_native_docs.ts` - Generate native tool docs
```

#### Create new section for RAG/Vector:
```markdown
## RAG & Codebase Scripts

**Setup:**
- `apps/api/scripts/setup-vector-db.ts` - Vector database setup

**Ingestion:**
- `apps/api/scripts/ingest-codebase.ts` - Ingest codebase for search
- `apps/api/scripts/ingest-agents.ts` - Ingest agent data
```

### 2. Archive One-Time Scripts

Move to `scripts/archive/one-time-fixes/`:
- `add-search-codebase-to-roles.ts` - Tool assignment (done)
- `fix-capabilities.ts` - Capability fix (done)
- `update-groq-key.ts` - API key update (manual now)

### 3. Remove True Duplicates

- `count-models.ts` → Use `check_models.ts` instead

### 4. Investigate Unknown Scripts

Need clarification on:
- `antigravity.ts` - What does this do?
- `audit_doctor.ts` - Still needed?
- `force_heal.ts` - What does this heal?
- `check_resource.ts` - What resource?
- `check_saved_queries.ts` - What queries?

### 5. scripts/ Directory Scripts

Most scripts in `scripts/` appear to be:
- Test/verification scripts (test-healer-protocol, verify-*)
- Generation scripts (generate_mcp_manifests, generate_native_docs)
- One-time seeds (seed-coordinator)

**Recommendation:** Document the active ones, archive the rest.

---

## Summary

**Total Scripts:** 38 remaining
- **Documented:** 7 core scripts ✅
- **Should document:** 13 scripts ⚠️
- **Should archive:** 8 scripts 📁
- **Should delete:** 1 script (duplicate) 🗑️
- **Need review:** 9 scripts ❓

---

## Quick Fix: Add Missing Documentation

I'll update the guides to include all active scripts.
