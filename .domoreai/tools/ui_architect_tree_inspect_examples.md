# UI Architect: Tree Inspect
Use this tool to read the current state of the Nebula UI Tree.

## 🛠️ TOOL SIGNATURES
system.ui_architect_tree_inspect({ nodePath?: string })

### Usage
```typescript
// Inspect the whole tree
const tree = await system.ui_architect_tree_inspect({});
console.log("Current UI Tree:", tree);

// Inspect a specific branch
const branch = await system.ui_architect_tree_inspect({ nodePath: "card_abc" });
```
