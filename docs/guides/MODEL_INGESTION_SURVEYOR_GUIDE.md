# Model Ingestion & Surveyor System - Complete Guide

> **The Anti-Corruption Pipeline** - How models safely enter the system with zero data loss

## Quick Overview

**System Status:** ✅ Active and Running
- **Anti-Corruption Pipeline:** Protects raw data integrity
- **Surveyor Service:** Auto-identifies model capabilities
- **Specialized Tables:** Embedding, Audio, Image, Safety models
- **Unknown Model Fallback:** No model left behind

---

## Architecture

### Two-Phase Ingestion Pipeline

```
Phase 1: RAW DATA LAKE (The "Bag")
  ↓
  Save EXACTLY as received
  No filtering, no corruption
  ↓
  RawDataLake table
  
Phase 2: THE GATEKEEPER
  ↓
  Filter → Normalize → Classify
  ↓
  Surveyor inspects capabilities
  ↓
  Route to specialized tables
  ↓
  Model + ModelCapabilities tables
```

### Key Services

**1. ProviderManager** (`ProviderManager.ts`)
- Auto-bootstraps from `.env.local`
- Manages provider health
- Fetches model lists

**2. UnifiedIngestionService** (`UnifiedIngestionService.ts`)
- Orchestrates fetch → raw → normalize flow
- Coordinates all phases

**3. Surveyor** (`Surveyor.ts`) ⭐
- **"The Model Doctor"**
- Inspects model names and metadata
- Determines capabilities (vision, reasoning, coding, etc.)
- Identifies specialized models (embedding, audio, ocr)
- Pattern matching + heuristics

**4. RegistrySyncService** (`RegistrySyncService.ts`)
- Syncs to database
- Populates specialized tables
- Handles unknown models

---

## The Surveyor Service

### Purpose

**Automatically identifies model capabilities** so you don't have to manually configure every model.

### How It Works

**Pattern Matching:**
```typescript
// Specific patterns checked first
if (name.match(/mxbai.*embed/i)) {
  return {
    contextWindow: 512,
    primaryTask: "embedding",
    capabilities: ["embedding"]
  };
}

// Generic patterns
if (name.includes('embed')) {
  return {
    contextWindow: 2048,
    primaryTask: "embedding"
  };
}
```

**Heuristic Fallbacks:**
```typescript
// Vision models
if (name.includes('vision') || name.includes('llava')) {
  return { capabilities: ["vision"], primaryTask: "chat" };
}

// Reasoning models
if (name.includes('o1') || name.includes('reasoning')) {
  return { capabilities: ["reasoning"], contextWindow: 32768 };
}

// Embedding models
if (name.includes('embed')) {
  return { primaryTask: "embedding" };
}
```

**Raw Data Context Upgrade:**
```typescript
// If provider gives us context window in raw data, use it
if (providerData.context_length) {
  specs.contextWindow = providerData.context_length;
  console.log(`[Surveyor] 📈 Upgrading context to ${specs.contextWindow}`);
}
```

### Provider-Specific Patterns

#### Ollama
- `mxbai.*embed` → Embedding (512 tokens)
- `embed` → Generic embedding (2048 tokens)
- `vision` → Vision models
- `llava` → Vision chat
- `codestral` → Code generation

#### OpenAI (via providers)
- `text-embedding-3-small/large` → Embedding (8191 tokens)
- `text-embedding-ada-002` → Embedding (8191 tokens)
- `gpt-4-vision` → Vision
- `o1` → Reasoning

#### Google
- Models with "embed" → Embedding
- Vision models marked automatically

### Surveyor Execution

**Runs automatically:**
1. **On startup** - Scans *only* models missing `ModelCapabilities`. 
   - **Laziness:** If a model has a `confidence: 'high'` signature, it is strictly skipped.
   - **De-duplication:** Unknown models are "deferred" after one failed attempt to prevent startup spam.
2. **After model sync** - `RegistrySyncService` proactively triggers `surveyModel` for new versions.
3. **On demand** - Via API endpoint.

**Manual trigger:**
```bash
npx tsx -e "
import { Surveyor } from './apps/api/src/services/Surveyor.js';
const stats = await Surveyor.surveyAll();
console.log('Surveyed:', stats.surveyed, 'models');
"
```

---

## Anti-Corruption Pipeline Details

### Phase 1: Raw Data Lake

**Goal:** Never lose the source of truth

```typescript
// Save EXACTLY as received
await prisma.rawDataLake.create({
  data: {
    providerId: 'openrouter',
    sourceUrl: 'https://openrouter.ai/api/v1/models',
    rawContent: JSON.stringify(apiResponse),  // Exact copy
    fetchedAt: new Date()
  }
});
```

**Benefits:**
- 🔒 Immutable history
- 🔍 Can audit/debug later
- 🔄 Can re-process if logic changes
- 📊 Track provider changes over time

### Phase 2: The Gatekeeper

**Goal:** Filter and normalize safely

#### Step 1: Filtering

**Whitelist (Fail-Open):**
- Ollama (local, always free)
- Groq, Mistral, Google (generous tiers)

**Strict Filter (Fail-Closed):**
- OpenRouter: MUST have exact `$0.00` pricing
- Rejects any model with cost > 0 to prevent accidental charges

```typescript
// OpenRouter filtering
if (provider === 'openrouter') {
  const pricing = model.pricing || {};
  if (pricing.prompt > 0 || pricing.completion > 0) {
    console.log(`Rejected ${model.name}: Not free ($${pricing.prompt})`);
    return null;  // SKIP
  }
}
```

#### Step 2: Surveyor Inspection

```typescript
const specs = Surveyor.inspect(provider, modelName, rawData);
// Returns: { contextWindow, capabilities, primaryTask, confidence }
```

#### Step 3: Specialized Routing

Based on `primaryTask` from Surveyor:

**Chat Models:**
```typescript
await prisma.model.create({
  data: { /* ... */ },
  modelCapabilities: {
    create: {
      hasVision: specs.capabilities.includes('vision'),
      hasReasoning: specs.capabilities.includes('reasoning'),
      contextWindow: specs.contextWindow
    }
  }
});
```

**Embedding Models:**
```typescript
await prisma.embeddingModel.create({
  data: {
    model: { connect: { id: modelId } },
    dimensions: specs.dimensions || 1536,
    maxContext: specs.contextWindow
  }
});
```

**Audio Models:**
```typescript
await prisma.audioModel.create({
  data: {
    model: { connect: { id: modelId } },
    audioType: specs.audioType,  // 'tts' | 'stt'
    voices: specs.voices || [],
    languages: specs.languages || []
  }
});
```

#### Step 4: Unknown Model Fallback

If Surveyor can't identify capabilities:

```typescript
await prisma.unknownModel.upsert({
  where: { modelId },
  create: {
    modelId,
    reason: 'uncategorized_by_surveyor'
  }
});
```

**Why?**
- Ensures we don't lose models
- LLMSelector can fallback to unknowns
- Prevents "No model found" crashes
- New models still usable while we improve patterns

---

## Specialized Tables

### Why Separate Tables?

**Embedding Models** need different data than chat:
- Dimensions (384, 1536, 3072)
- Max input tokens
- No conversation features

**Audio Models** have unique properties:
- Voice options
- Sample rates
- Languages supported

### Current Specialized Tables

**1. EmbeddingModel**
```typescript
{
  modelId: string;
  dimensions: number;      // 512, 1536, 3072
  maxContext: number;      // Max tokens for embedding
  indexingSpeed: number;   // Optional metric
}
```

**2. AudioModel**
```typescript
{
  modelId: string;
  audioType: string;       // 'tts' | 'stt' | 'speech'
  voices: string[];        // ['alloy', 'echo', 'fable']
  languages: string[];     // ['en', 'es', 'fr']
  sampleRates: number[];   // [16000, 48000]
}
```

**3. ImageModel**
```typescript
{
  modelId: string;
  resolutions: string[];   // ['1024x1024', '1792x1024']
  styles: string[];        // ['vivid', 'natural']
  quality: string;         // 'standard' | 'hd'
}
```

**4. SafetyModel**
```typescript
{
  modelId: string;
  categories: string[];    // ['hate', 'violence', 'sexual']
  confidence: string;      // 'high' | 'medium' | 'low'
}
```

---

## Recent Improvements (Jan 2026)

### Embedding Model Detection

**Issue:** `mxbai-embed-large:latest` was misclassified

**Fix:**
1. Added specific Ollama pattern: `/mxbai.*embed/i` → 512 tokens
2. Enhanced generic "embed" pattern with `primaryTask: "embedding"`
3. Added OpenAI embedding models (text-embedding-3-*)
4. Pattern priority: Specific → Generic → Heuristic

**Result:** All embedding models now correctly identified

### Unknown Model Handling

**Before:** Models without clear capabilities were rejected

**After:** 
- Stored in `UnknownModel` table.
- **Deferral:** Surveyor marks them as `surveyor_deferred` after the first failed attempt to keep startup logs clean.
- Available as fallback options in `LLMSelector`.
- Once a new pattern is added to `Surveyor.ts`, they will be identified and moved to the proper table.

---

## Usage in LLMSelector

### Capability-Based Selection

```typescript
// LLMSelector uses Surveyor data
const candidates = await prisma.model.findMany({
  where: {
    isActive: true,
    capabilities: {
      hasVision: requiredCaps.includes('vision'),
      hasReasoning: requiredCaps.includes('reasoning')
    }
  }
});
```

### Embedding Model Exclusion

```typescript
// Filter out non-chat models
candidates = candidates.filter(m => {
  const caps = m.capabilities;
  const primaryTask = caps?.primaryTask;
  
  // Exclude specialized models
  if (['embedding', 'tts', 'stt', 'ocr', 'moderation'].includes(primaryTask)) {
    return false;
  }
  
  return true;
});
```

### Unknown Model Fallback

```typescript
// If no suitable model found, try unknowns
if (candidates.length === 0) {
  const unknowns = await prisma.unknownModel.findMany({
    include: { model: true }
  });
  
  console.log(`[LLMSelector] Using unknown model as fallback`);
  return unknowns[0].model.id;
}
```

---

## Monitoring & Debugging

### Check Surveyor Status

```bash
# View surveyor stats
npx tsx -e "
import { Surveyor } from './apps/api/src/services/Surveyor.js';
const stats = await Surveyor.surveyAll();
console.log(stats);
"
```

### Check Unknown Models

```bash
npx tsx -e "
import { prisma } from './apps/api/src/db.js';
const unknowns = await prisma.unknownModel.findMany({
  include: { model: true }
});
console.log('Unknown models:', unknowns.length);
unknowns.forEach(u => console.log(' -', u.model.name, ':', u.reason));
await prisma.\$disconnect();
"
```

### Check Raw Data Lake

```bash
npx tsx -e "
import { prisma } from './apps/api/src/db.js';
const count = await prisma.rawDataLake.count();
console.log('Raw data snapshots:', count);
await prisma.\$disconnect();
"
```

---

## Troubleshooting

### Model Not Showing Up

**1. Check if filtered out:**
```bash
# Look for rejection logs
grep "Rejected" logs/api.log
```

**2. Check if in unknown table:**
```bash
# Query unknowns
npx tsx -e "..."  # See above
```

**3. Check Surveyor patterns:**
```bash
# Test specific model
npx tsx -e "
import { Surveyor } from './apps/api/src/services/Surveyor.js';
const specs = Surveyor.inspect('ollama', 'your-model-name');
console.log(specs);
"
```

### Embedding Model in Chat List

**Symptom:** Embedding models appearing in role selection

**Solution:** Already fixed - Surveyor sets `primaryTask: "embedding"`, LLMSelector filters them out.

### Wrong Context Window

**Symptom:** Model has incorrect token limit

**Solution:**
1. Check raw data: Does provider give us the right value?
2. Update Surveyor pattern for that model
3. Re-run sync

---

## Best Practices

### 1. Trust the Pipeline

Don't bypass Phase 1 (Raw Data Lake). Always:
```typescript
// ✅ GOOD
await saveToRawDataLake(rawResponse);
await processFromRawData();

// ❌ BAD
await directlyInsertToModel(rawResponse);  // Lost source of truth!
```

### 2. Improve Surveyor Patterns

When you find a misclassified model:
1. Add specific pattern to Surveyor
2. Re-run sync
3. Document the pattern

### 3. Monitor Unknown Models

```bash
# Weekly check
npx tsx -e "..." # Check unknowns count
```

If it's growing, update Surveyor patterns.

### 4. Whitelist Conservatively

Only add providers to whitelist if you're **sure** they're free:
- Ollama (local)
- Providers with generous free tiers
- Never add paid APIs without strict filtering

---

## File Locations

### Core Services
- `apps/api/src/services/Surveyor.ts` - Model inspection
- `apps/api/src/services/ProviderManager.ts` - Provider registry
- `apps/api/src/services/RegistrySyncService.ts` - Database sync
- `apps/api/src/services/UnifiedIngestionService.ts` - Orchestrator

### Scripts
- `apps/api/scripts/ingest_latest_models.ts` - Full sync
- `apps/api/scripts/force-sync.ts` - Emergency resync

### Database
- `RawDataLake` - Immutable provider responses
- `Model` - Core model table
- `ModelCapabilities` - Capabilities metadata
- `UnknownModel` - Unidentified models (fallback)
- `EmbeddingModel`, `AudioModel`, etc. - Specialized

---

## Success Metrics

Current system (as of 2026-01-17):
- ✅ Zero data corruption (Raw Data Lake)
- ✅ 100+ models ingested safely
- ✅ Embedding models correctly classified
- ✅ Unknown model fallback working
- ✅ Auto-identification via Surveyor
- ✅ Specialized tables populated
- ✅ Provider filtering preventing charges

---

**Last Updated:** 2026-01-17  
**Status:** Production Ready  
**Surveyor:** Active & Running  
**Anti-Corruption:** Protecting Data Integrity
