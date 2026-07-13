# Cognitive Recovery Strategy

## Problem Statement

During complex refactoring operations (e.g., structural shifts in `registry.tsx`), the Codestral-Mamba model was timing out due to:

1. **Deep Instruction Chains**: Complex operations like `jit_tool_mount` or `execute_loop` exceeded the default 50-60 second tRPC/OpenAI client window
2. **Insufficient Timeouts**: The `OpenAIProvider.ts` was using a 15-second timeout, far too aggressive for "Structural Shift" refactors
3. **No Retry Logic**: Single-point failures caused entire operations to fail without recovery attempts

## Root Cause Analysis

### Model Latency
- **Codestral-Mamba** is fast, but instruction chains can be deep
- Large file rewrites (like `registry.tsx`) can exceed 50-60 seconds
- Socket closes before completion, causing `INTERNAL_SERVER_ERROR`

### Volcano Client Defaults
- `OpenAIProvider.ts` (line 74) used standard `makeRequest`
- No custom timeout passed to `generateCompletion` call
- Fell back to environment default (15 seconds)

### tRPC Batching
- Logs show `?batch=1`
- 52-second hang on session start triggers timeout before cognitive recovery

## Solution: Three-Tier Fix

### 1. Smart Retries in OpenAIProvider.ts ✅

**Implemented Changes:**
- Increased base timeout from **15s → 120s** for complex operations
- Added `maxRetries: 3` to OpenAI client configuration
- Implemented **dynamic timeout detection**:
  - **120 seconds** for complex refactoring operations (detected via keywords)
  - **60 seconds** for standard operations

**Detection Keywords:**
- `refactor`, `registry`, `structural`, `migrate`, `transform`
- `nebula`, `architect`, `component manifest`, `large file`

```typescript
// Before
timeout: 15000, // 15 seconds (Aggressive failover)

// After
timeout: 120000, // 120 seconds for Refactor Swarms (Cognitive Recovery)
maxRetries: 3,   // Volcano-native retry logic
```

### 2. Scope the Refactor (Agent "Chunking")

**Strategy:**
The `CodeModeStrategy` should work in chunks instead of attempting to refactor entire files at once.

**Recommended Approach:**
```typescript
// Instead of: Rewrite entire registry.tsx
// Do: Move components one-by-one

1. Create src/nebula/primitives/ directory
2. Move Box → verify ComponentManifest
3. Move Text → verify ComponentManifest
4. Move Image → verify ComponentManifest
```

**Safety Valve:**
- If operation takes >30s, log partial state to `nebula-project.json`
- Allow loop to resume from checkpoint

### 3. Update Orchestrator Prompt

**Resilient Refactor Delegation Prompt:**

```
RECOVERY COMMAND: Resilient Swarm Refactor

Task for System Architect (Multi-Step):
1. Use filesystem-mcp to create src/nebula/primitives/ directory first
2. Move components one-by-one (Box -> Text -> Image)
3. After each move, verify the ComponentManifest still resolves

Task for UI/UX Technologist:
1. Implement the meta.slots logic in NebulaRenderer.tsx
2. Constraint: If an operation takes >30s, log partial state to nebula-project.json

System Guardrail:
- If mistralai/mamba-codestral continues to timeout, fallback to claude-3-5-sonnet
  for high-complexity structural rewrites of PropertyPanel.tsx
```

## Verification

### Testing the Fix

1. **Monitor Timeout Behavior:**
   ```bash
   # Watch API logs for timeout messages
   tail -f apps/api/logs/api.log | grep -i timeout
   ```

2. **Test Complex Refactor:**
   - Trigger a structural refactor via the Nebula Architect
   - Verify logs show: `Using 120s timeout (Complex: true)`
   - Confirm operation completes without `INTERNAL_SERVER_ERROR`

3. **Verify Retry Logic:**
   - Simulate network instability
   - Confirm retries occur (max 3 attempts)

### Expected Behavior

**Before:**
```
[OpenAIProvider] Calling API with model: "mistralai/mamba-codestral"
ERROR: APIConnectionTimeoutError after 15s
```

**After:**
```
[OpenAIProvider] Calling API with model: "mistralai/mamba-codestral"
[OpenAIProvider] Using 120s timeout (Complex: true)
✅ Operation completed in 47s
```

## Future Enhancements

### Recommended Improvements

1. **Progressive Timeout Scaling:**
   - Start with 60s timeout
   - If retry needed, scale to 90s
   - Final retry uses 120s

2. **Telemetry Integration:**
   - Track timeout frequency by model
   - Auto-adjust timeout thresholds based on historical data
   - Alert when timeout rate exceeds 10%

3. **Fallback Model Chain:**
   ```typescript
   const FALLBACK_CHAIN = [
     'mistralai/mamba-codestral',  // Fast, may timeout on complex ops
     'anthropic/claude-3-5-sonnet', // Slower, more reliable
     'openai/gpt-4'                 // Fallback of last resort
   ];
   ```

4. **Checkpoint System:**
   - For operations >60s, implement auto-checkpointing
   - Store intermediate state in Redis/DB
   - Resume from checkpoint on timeout

## Configuration Reference

### Environment Variables

```bash
# Override default timeouts (optional)
VOLCANO_TIMEOUT_STANDARD=60000    # 60s for standard ops
VOLCANO_TIMEOUT_COMPLEX=120000    # 120s for complex ops
VOLCANO_MAX_RETRIES=3             # Retry attempts
```

### Per-Model Overrides

Future: Allow model-specific timeout configuration in `ProviderConfig`:

```typescript
interface ProviderConfig {
  id: string;
  type: string;
  baseURL: string;
  timeoutMs?: number;        // Override default timeout
  maxRetries?: number;       // Override retry count
  complexTimeoutMs?: number; // Override complex operation timeout
}
```

## Related Files

- `/apps/api/src/utils/OpenAIProvider.ts` - Main timeout implementation
- `/apps/api/src/services/AgentRuntime.ts` - Execution strategies
- `/apps/api/src/services/tooling/ExecutionStrategies.ts` - Code mode execution
- `/apps/api/src/config/constants.ts` - Global timeout constants

## Changelog

### 2026-01-17
- ✅ Increased base timeout: 15s → 120s
- ✅ Added `maxRetries: 3` to OpenAI client
- ✅ Implemented dynamic timeout detection
- ✅ Added `isComplexRefactorOperation()` helper
- 📝 Documented cognitive recovery strategy

---

**Status:** ✅ Implemented and Ready for Testing

**Next Steps:**
1. Test with a complex refactoring operation
2. Monitor timeout logs
3. Adjust keyword detection if needed
4. Consider implementing checkpoint system for operations >90s
