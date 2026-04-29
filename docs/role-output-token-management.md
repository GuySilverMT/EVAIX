# Role-Specific Output Token Management

## Overview
The system now intelligently manages output token limits on a **per-role basis**, preventing "output too big" errors while optimizing model selection.

## Architecture

### 1. **Default Behavior**
- **Default `maxTokens`: 1024** (sufficient for JSON responses and tool calls)
- Most roles (coordinators, managers, tool-calling agents) work perfectly with this limit

### 2. **Role-Specific Configuration**
Roles can specify higher output requirements via `cortexConfig.maxOutputTokens`:

```typescript
// Set by Role Factory during role creation
cortexConfig: {
  executionMode: 'CODE_INTERPRETER',
  contextRange: { min: 4096, max: 128000 },
  maxOutputTokens: 2048, // ← Role-specific output requirement
  capabilities: ['coding'],
  tools: ['filesystem', 'terminal']
}
```

### 3. **Intelligent Model Selection**
The `LLMSelector` now considers output requirements when choosing models:

```typescript
// AgentService passes output requirement to selector
const roleWithMaxOutput = {
  ...role,
  metadata: {
    requirements: {
      minOutputTokens: effectiveMaxTokens // Ensures model can handle it
    }
  }
};

const bestModel = await selector.resolveModelForRole(roleWithMaxOutput, estimatedTokens);
```

**Result**: Models with insufficient `maxOutput` are automatically filtered out.

## Role Factory Integration

### Cortex Architect Prompt
The Role Factory's Cortex Architect now intelligently sets `maxOutputTokens` based on role type:

```
OUTPUT LENGTH REQUIREMENTS:
- **1024**: JSON responses, tool calls, coordinators, managers (DEFAULT)
- **2048**: Code generation, refactoring, moderate documentation
- **4096**: Long-form planning, architectural documents, detailed analysis
- **8192**: Comprehensive documentation, multi-file generation, extensive reports
```

### Fallback Logic
If the Cortex Architect fails, intelligent defaults are applied:
- **High complexity roles**: 2048 tokens (planning, architecture)
- **Other roles**: 1024 tokens (JSON, tools)

## Priority Chain

The system resolves `maxTokens` in this order:

1. **`cortexConfig.maxOutputTokens`** (set by Role Factory)
2. **`role.metadata.maxTokens`** (manual override)
3. **`modelConfig.maxTokens`** (request-level override, default: 1024)

```typescript
const effectiveMaxTokens = 
  cortexMaxOutputTokens ||  // From Role Factory
  metadataMaxTokens ||      // From role metadata
  modelConfig.maxTokens;    // From request (default: 1024)
```

## Example Use Cases

### JSON/Tool-Calling Role (1024 tokens)
```json
{
  "name": "Task Coordinator",
  "complexity": "MEDIUM",
  "domain": "System",
  "cortexConfig": {
    "executionMode": "JSON_STRICT",
    "maxOutputTokens": 1024
  }
}
```
✅ Selects models like `mediatek/breeze-7b-instruct` (maxOutput: 1024)

### Code Generation Role (2048 tokens)
```json
{
  "name": "Code Refactorer",
  "complexity": "HIGH",
  "domain": "Backend",
  "cortexConfig": {
    "executionMode": "CODE_INTERPRETER",
    "maxOutputTokens": 2048
  }
}
```
✅ Filters out models with maxOutput < 2048

### Documentation Role (4096 tokens)
```json
{
  "name": "Technical Writer",
  "complexity": "HIGH",
  "domain": "Documentation",
  "cortexConfig": {
    "executionMode": "HYBRID_AUTO",
    "maxOutputTokens": 4096
  }
}
```
✅ Only selects models capable of long-form output

## Benefits

1. **No More "Output Too Big" Errors**: Models are selected based on their actual capabilities
2. **Optimal Resource Usage**: Roles that only need JSON responses don't waste tokens
3. **Automatic Optimization**: Role Factory sets appropriate limits during creation
4. **Flexible Overrides**: Can be manually adjusted via role metadata or request config
5. **Transparent Selection**: Logs show which models were filtered and why

## Logs Example

```
[LLMSelector] 📤 Filtering for minOutputTokens: 2048
[LLMSelector] ✅ Found 15 model(s) with sufficient output capacity (>= 2048 tokens)
[LLMSelector] Selected gpt-4o-mini (Score: 150)
```

Or if no suitable model exists:
```
[LLMSelector] 🚨 CRITICAL: NO models support minOutputTokens=8192
[LLMSelector] ⚠️ Falling back to claude-3-5-sonnet with maxOutput=4096
```

## Migration Notes

- **Existing roles**: Will use default 1024 tokens (safe for all current use cases)
- **New roles**: Role Factory automatically sets appropriate limits
- **Manual adjustment**: Update `cortexConfig.maxOutputTokens` in role variants
- **Request override**: Pass `modelConfig.maxTokens` in `startSession` call

## Files Modified

1. `apps/api/src/services/agent.service.ts` - Priority chain and selector integration
2. `apps/api/src/orchestrator/LLMSelector.ts` - Output token filtering
3. `apps/api/src/services/RoleFactoryService.ts` - Cortex Architect prompt and config
4. `apps/api/src/services/VolcanoAgent.ts` - Default updated to 1024
