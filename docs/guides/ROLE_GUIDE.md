# Role System - Guide

## Key Principle: Roles ≠ Models

**Roles use CONTEXT RANGES, not specific models:**

```typescript
// Role defines requirements
{
  contextRange: { min: 8192, max: 128000 },
  capabilities: ['reasoning', 'coding'],
  executionMode: 'CODE_INTERPRETER',
  tools: ['read_file', 'write_file']
}

// Model selected dynamically at runtime
```

## Role DNA (5 Modules)

1. **Identity** - Persona, system prompt, style
2. **Cortex** - Execution mode, context range, capabilities, tools
3. **Context** - Strategy, permissions
4. **Governance** - Rules, assessment, enforcement
5. **Metadata** - Additional info

## Current Roles (9)

- Grand Orchestrator (JSON_STRICT)
- Role Architect (JSON_STRICT)
- Prompt Architect (JSON_STRICT)
- Terminal Liaison (CODE_INTERPRETER)
- Nebula Architect (CODE_INTERPRETER)
- MCP Capability Auditor (HYBRID_AUTO)
- System Diagnostic (HYBRID_AUTO)
- System Judge (needs variant)
- Librarian (needs variant)

## Role Factory

Creates roles through 5 specialized architects:
1. Identity Architect
2. Cortex Architect
3. Context Architect
4. Governance Architect
5. Tool Architect

Each has 3 retry attempts + fallback.

## Context Ranges

- **Small:** 4K - 32K (fast, cheap)
- **Medium:** 8K - 128K (balanced)
- **Large:** 32K - 500K (quality)

## Scripts Reference

### Inspection
```bash
# List all roles
npx tsx apps/api/scripts/check-roles.ts

# Alternative (same thing)
npx tsx apps/api/scripts/list_roles.ts

# Export role data
npx tsx apps/api/scripts/dump_roles.ts

# View role prompts
npx tsx apps/api/scripts/inspect-role-prompts.ts
```

### Management
```bash
# Sync roles
npx tsx apps/api/scripts/sync_roles.ts

# Import from JSON
npx tsx apps/api/scripts/sync_roles_from_json.ts
```

---

**Key Point:** Roles define what they need, LLMSelector finds the best model dynamically!
