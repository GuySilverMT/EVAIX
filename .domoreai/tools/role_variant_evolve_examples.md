# Role Architect: Variant Evolve
Evolve a new Role Variant (DNA) with specialized personality and toolsets.

## 🛠️ TOOL SIGNATURES
system.role_variant_evolve({
    roleId?: string,
    intent: {
        name: string,
        description: string,
        domain: string,
        complexity: "LOW" | "MEDIUM" | "HIGH",
        capabilities?: string[]
    }
})

### Usage
```typescript
await system.role_variant_evolve({
    intent: {
        name: "DevOps Engineer",
        description: "Specializes in CI/CD and script automation",
        domain: "Backend",
        complexity: "MEDIUM",
        capabilities: ["Git", "Shell", "Docker"]
    }
});
```
