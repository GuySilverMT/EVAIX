# Tool & MCP System - Complete Guide

> **Unified Documentation** - Everything you need to know about the Tool and MCP system

## Quick Start

### Sync All Tools
```bash
npx tsx apps/api/scripts/sync-tools.ts --fix
```

### Verify System Health
```bash
npx tsx apps/api/scripts/verify-tools.ts
```

## System Overview

- **177 total tools** (enabled)
- **10 MCP servers** available (4 core enabled by default)
- **3 execution modes** (JSON_STRICT, CODE_INTERPRETER, HYBRID_AUTO)

## Core MCP Servers

### Active by Default (4)
- **filesystem** - File operations
- **git** - Git operations  
- **postgres** - Database queries
- **playwright** - Browser automation

### Available on Demand (8)
- memory, commander, docker, language-server
- context7, planning, deep-research, linear

## Tool Types

### 1. Native Tools (19)
- Defined in TypeScript
- Examples: `read_file`, `write_file`, `terminal_execute`

### 2. MCP Tools (158)
- From external servers
- Examples: `git_status`, `postgres_query`

### 3. Meta Tools (3)
- System-level role management
- Examples: `role_registry_list`, `role_variant_evolve`

## Execution Modes

### JSON_STRICT
Pure JSON-RPC tool calling for architects and managers.

### CODE_INTERPRETER  
TypeScript code blocks for workers and engineers.

### HYBRID_AUTO
AI chooses best mode dynamically.

## File Locations

### Scripts
- `apps/api/scripts/ingest_latest_models.ts` - Model sync
- Check MCP registry: `apps/api/src/services/mcp-registry-client.ts`

### Configuration
- `apps/api/src/services/mcp-registry-client.ts` - MCP servers
- `apps/api/src/services/tools/NativeToolsRegistry.ts` - Native tools

## Scripts Reference

### MCP Testing
```bash
# Test single MCP server
npx tsx apps/api/scripts/debug_mcp_server.ts <server-name>

# Example
npx tsx apps/api/scripts/debug_mcp_server.ts filesystem
```

### Tool Documentation
```bash
# Generate MCP manifests
npx tsx scripts/generate_mcp_manifests.ts

# Generate native tool docs
npx tsx scripts/generate_native_docs.ts
```

### RAG & Codebase
```bash
# Setup vector database
npx tsx apps/api/scripts/setup-vector-db.ts

# Ingest codebase for search
npx tsx apps/api/scripts/ingest-codebase.ts
```

---

**Last Updated:** 2026-01-17  
**Status:** Production Ready
