# Post-Mortem: Grand Orchestrator Failure & Self-Healing Fixes

## Incident Summary
**Date**: 2026-01-18  
**Affected System**: Grand Orchestrator (Architect-tier agent)  
**Symptom**: Agent attempted to "Evolve a DevOps Engineer" instead of extracting the Box component  
**Root Cause**: Architectural Cognitive Dissonance - capabilities mismatch + protocol hijack  

---

## The Three Failures

### 1. The "Zero-Token" Fallback (Brain Crisis)

**What Happened:**
```
[LLMSelector] 🚨 CRITICAL: NO models support minOutputTokens=1024
[LLMSelector] ⚠️ Falling back to mistralai/mamba-codestral-7b-v0.1 with maxOutput=0
```

**Root Cause:**
- `LLMSelector.ts` filtered models by `minOutputTokens` requirement
- No models met the 1024 requirement (likely due to missing metadata or provider limits)
- Fallback logic selected a model with `maxOutput=0` (Registry Data Corruption)
- A model with zero output tokens cannot generate code blocks → "Response contains no executable code"

**Impact:**
- 7B parameter model lacks instruction-following density for Architect tasks
- Model cannot produce valid output, leading to execution failures

---

### 2. Protocol Hijack (Instruction Overwrite)

**What Happened:**
Agent received task: "Extract Box component from registry"  
Agent executed: "Evolve a DevOps Engineer role"

**Root Cause:**
```typescript
// OLD CODE (AgentRuntime.ts:537-538)
if (this.tier === 'Architect') {
    protocol = SPECIALIZED_ARCHITECT_PROTOCOL;
}
```

**The Conflict:**
1. User set `ROLE: System Architect` (tier-based routing)
2. `AgentRuntime.ts` injected `SPECIALIZED_ARCHITECT_PROTOCOL` based on tier alone
3. Protocol explicitly defines Architect goals as:
   - "Discover existing roles using 'system.role_registry_list'"
   - "Evolve new capabilities using 'system.role_variant_evolve'"
4. Smaller fallback model (Mamba-Codestral) prioritized System Instructions over User Task
5. Model hallucinated a role management task because the framework told it "that's what Architects do"

**Impact:**
- Task hijacking: User intent overridden by protocol instructions
- Wrong tools executed (role_variant_evolve instead of ui_architect_tree_inspect)

---

### 3. Execution Strategy Rejection

**What Happened:**
Model provided markdown-wrapped JSON instead of raw JSON

**Root Cause:**
- `JSON_STRICT_PROTOCOL` mandates: "Output a raw JSON object... NO MARKDOWN. Do NOT wrap in backticks"
- Smaller models (7B) struggle with strict formatting requirements
- Model likely provided: ` ```json\n{ "tool": "..." }\n``` `
- `JsonRpcStrategy` rejected it because it wasn't "Raw JSON"
- Runtime defaulted to chat response instead of execution

**Impact:**
- Valid tool calls rejected due to formatting
- Agent stuck in conversational mode instead of execution mode

---

## Self-Healing Fixes Implemented

### Fix 1: Repair the Selector Fallback

**File**: `apps/api/src/orchestrator/LLMSelector.ts`

**Changes:**
1. **Sanity Check**: Never select models with `maxOutput=0`
   ```typescript
   return maxOutput >= minOutputTokens && maxOutput > 0; // [SANITY] Never select zero-token models
   ```

2. **Architect Safety**: Never fall back to models < 13B for Architect tasks
   ```typescript
   const is7BOrSmaller = modelName.includes('7b') || modelName.includes('3b') || modelName.includes('1b');
   if (is7BOrSmaller) {
     console.error(`[LLMSelector] 🚫 REJECTED: ${bestAvailable.name} is too small for Architect tasks`);
     // Try to find a larger model or throw error
   }
   ```

3. **Fatal Error on Corruption**: Throw error if all models have `maxOutput=0`
   ```typescript
   if (validModels.length === 0) {
     throw new Error(`[LLMSelector] 💀 FATAL: All available models have maxOutput=0 (Registry Data Corruption)`);
   }
   ```

**Result:**
- ✅ Prevents selection of corrupted/zero-token models
- ✅ Ensures Architect tasks get models >= 13B
- ✅ Fails fast with clear error messages instead of silent degradation

---

### Fix 2: Decouple Tier from Protocol

**File**: `apps/api/src/services/AgentRuntime.ts`

**Changes:**
```typescript
// OLD: Tier-based protocol injection
if (this.tier === 'Architect') {
    protocol = SPECIALIZED_ARCHITECT_PROTOCOL;
}

// NEW: Tool-based protocol injection
const hasRoleManagementTools = this.availableTools.some(t => 
  t === 'role_registry_list' || t === 'role_variant_evolve' || t === 'role_config_patch'
);

if (hasRoleManagementTools) {
  // Only inject architect protocol if the role actually has role-management tools
  protocol = SPECIALIZED_ARCHITECT_PROTOCOL;
}
```

**Result:**
- ✅ Protocol only injects if role-management tools are actually available
- ✅ Prevents protocol hijacking for non-role-management tasks
- ✅ Architect tier can now perform non-meta tasks without instruction conflicts

---

### Fix 3: Harden Execution Parsers

**File**: `apps/api/src/services/tooling/ExecutionStrategies.ts`

**Changes:**
Enhanced JSON extraction to handle multiple markdown formats:

```typescript
// 1. Try ```json blocks first
const jsonBlockMatch = jsonStr.match(/```json\s*\n([\s\S]*?)```/);

// 2. Try generic ``` blocks (smaller models often forget the 'json' label)
const genericBlockMatch = jsonStr.match(/```\s*\n?([\s\S]*?)```/);

// 3. Try single backticks (some models wrap JSON in single backticks)
if (jsonStr.startsWith('`') && jsonStr.endsWith('`')) {
  jsonStr = jsonStr.slice(1, -1).trim();
}

// 4. Fallback: Extract using brace matching
const firstBrace = jsonStr.indexOf("{");
const lastBrace = jsonStr.lastIndexOf("}");
```

**Result:**
- ✅ Resilient to markdown formatting variations from smaller models
- ✅ Handles ```json, ```, single backticks, and raw JSON
- ✅ Counters the "Technical Debt Tsunami" of models that struggle with strict formatting

---

## Validation Checklist

- [x] Models with `maxOutput=0` are filtered out
- [x] Architect tasks reject models < 13B
- [x] Protocol injection checks for actual tool availability
- [x] JSON parser handles multiple markdown formats
- [x] Clear error messages for debugging
- [x] Graceful degradation with warnings

---

## Lessons Learned

1. **Never trust model metadata blindly** - Always validate before selection
2. **Decouple tier from behavior** - Use actual capabilities, not labels
3. **Design for smaller models** - They will struggle with strict formatting
4. **Fail fast, fail loud** - Better to error than silently degrade
5. **Protocol injection is powerful but dangerous** - Only inject when truly needed

---

## Monitoring Recommendations

1. **Alert on zero-token models**: Set up monitoring for models with `maxOutput=0`
2. **Track protocol injection**: Log when SPECIALIZED_ARCHITECT_PROTOCOL is used
3. **Monitor execution strategy failures**: Track JSON parsing failures
4. **Model size distribution**: Ensure Architect tasks get appropriate models

---

## Future Improvements

1. **Model Registry Validation**: Add database constraints to prevent `maxOutput=0`
2. **Capability-Based Routing**: Route tasks based on required capabilities, not tiers
3. **Adaptive Formatting**: Detect model capabilities and adjust formatting requirements
4. **Protocol Composition**: Allow multiple protocols to coexist without conflicts
