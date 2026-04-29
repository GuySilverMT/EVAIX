# UI Architect: Node Mutate
Use this tool to update, move, or delete existing nodes.

## 🛠️ TOOL SIGNATURES
system.ui_architect_node_mutate({ action: "updateNode" | "moveNode" | "deleteNode" | "setTheme", nodeId?: string, ... })

### Usage
```typescript
// 1. Update style or props
await system.ui_architect_node_mutate({ 
    action: "updateNode", 
    nodeId: "node_123", 
    update: { 
        style: { background: "bg-blue-600", borderRadius: "8px" },
        props: { children: "Updated Label" }
    } 
});

// 2. Move node to a different parent
await system.ui_architect_node_mutate({ 
    action: "moveNode", 
    nodeId: "node_123", 
    targetParentId: "card_456", 
    index: 0 
});

// 3. Delete a node
await system.ui_architect_node_mutate({ 
    action: "deleteNode", 
    nodeId: "node_ghost" 
});

// 4. Set global theme
await system.ui_architect_node_mutate({
    action: "setTheme",
    theme: { primary: "#8b5cf6", radius: 0.5 }
});
```
