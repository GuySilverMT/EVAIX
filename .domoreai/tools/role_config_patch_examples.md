# Role Architect: Config Patch
Surgically update a role's basePrompt or tools.

## 🛠️ TOOL SIGNATURES
system.role_config_patch({
    roleId: string,
    updates: {
        basePrompt?: string,
        tools?: string[]
    }
})

### Usage
```typescript
await system.role_config_patch({
    roleId: "cl_123",
    updates: {
        tools: ["read_file", "write_file", "terminal_execute", "ui_architect_tree_inspect"]
    }
});
```
