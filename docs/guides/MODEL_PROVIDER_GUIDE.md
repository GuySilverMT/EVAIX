# Model & Provider System - Guide

## Key Principle: NO HARDCODED MODELS

**Roles define REQUIREMENTS, not MODELS:**

```typescript
// ❌ WRONG
const model = "gpt-4";

// ✅ CORRECT  
const cortexConfig = {
  contextRange: { min: 8192, max: 128000 },
  capabilities: ['reasoning', 'coding']
};
// Model selected dynamically by LLMSelector
```

## How Models Get Into System

1. **Environment Variable** (.env.local) - API keys
2. **ProviderManager** - Auto-bootstraps providers
3. **Provider APIs** - Fetch model lists
4. **RegistrySyncService** - Ingest and classify
5. **Database** - Store models + capabilities
6. **LLMSelector** - Pick best model dynamically

## Dynamic Selection

LLMSelector picks models based on:
- **Context size range** (min/max)
- **Capabilities** (vision, reasoning, coding)
- **Cost** (cheapest first)
- **Provider health** (exclude offline)

## Supported Providers

- OpenRouter, Groq, Mistral, NVIDIA, Cerebras, Google
- Ollama (local)

## The Surveyor Service ⭐

**"The Model Doctor"** - Automatically identifies model capabilities

### What It Does
- Inspects model names and metadata
- Determines capabilities (vision, reasoning, coding, embedding)
- Routes to specialized tables (EmbeddingModel, AudioModel)
- Handles unknown models gracefully

### How It Works
```typescript
// Pattern matching
if (name.includes('embed')) {
  primaryTask = 'embedding';
  contextWindow = 2048;
}

// Heuristics
if (name.includes('vision') || name.includes('llava')) {
  capabilities.push('vision');
}
```

### When It Runs
- On API startup (scans unknown models)
- After model sync
- On demand via `/api/system/survey` endpoint

**See:** `docs/MODEL_INGESTION_SURVEYOR_GUIDE.md` for complete details

## Sync Models

```bash
npx tsx apps/api/scripts/ingest_latest_models.ts
```

## Scripts Reference

### Primary Operations
```bash
# Full system sync (models + MCP tools)
npx tsx scripts/sync-all.ts

# Or individual syncs:

# Full model sync
npx tsx apps/api/scripts/ingest_latest_models.ts

# Check providers
npx tsx apps/api/scripts/check_providers.ts

# Model inventory
npx tsx apps/api/scripts/check_models.ts
```

### Utilities
```bash
# Audit models for issues
npx tsx apps/api/scripts/audit-models.ts

# Check model capabilities
npx tsx apps/api/scripts/check-capabilities.ts

# Provider management
npx tsx apps/api/scripts/manage_providers.ts
```

### Debug/Inspection
```bash
# Inspect database
npx tsx apps/api/scripts/inspect-db.ts

# Export DB to JSON
npx tsx apps/api/scripts/export_db_to_json.ts
```

---

**Key Point:** Models are selected at runtime based on role requirements, NOT hardcoded!
