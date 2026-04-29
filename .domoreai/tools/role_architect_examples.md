# Role Architect: Toolset
Tools for discovering, evolving, and patching AI personas.

## 🛠️ TOOL SIGNATURES

### system.role_registry_list
List available personas and roles in the system.
```typescript
const roles = await system.role_registry_list({});
```

### system.role_variant_evolve
Evolve a new Role Variant (DNA).
```typescript
await system.role_variant_evolve({
    intent: {
        name: "React Specialist",
        description: "Specializes in React and Tailwind architecture",
        domain: "Frontend",
        complexity: "HIGH",
        capabilities: ["Nebula", "TypeScript", "VFS"]
    }
});
```

### system.role_config_patch
Targeted updates to a role's basePrompt or tools array.
```typescript
await system.role_config_patch({
    roleId: "cl_123",
    updates: {
        tools: ["read_file", "write_file", "terminal_execute"]
    }
});
```
