# UI Factory: Layout Generate
Use this tool to create new nodes or ingest JSX.

## 🛠️ TOOL SIGNATURES
system.ui_factory_layout_generate({ action: "addNode" | "ingest", parentId: string, ... })

### Usage
```typescript
// 1. Add individual node
const btnId = await system.ui_factory_layout_generate({ 
    action: "addNode", 
    parentId: "root", 
    node: { 
        type: "Button", 
        props: { children: "Click Me", variant: "primary" },
        style: { margin: "mt-4" }
    } 
});

// 2. Ingest raw JSX (High productivity)
// This will parse the JSX and create the corresponding Nebula nodes
await system.ui_factory_layout_generate({ 
    action: "ingest", 
    parentId: "container_123", 
    rawJsx: `
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-xl font-bold text-white mb-2">Dynamic Card</h2>
            <p className="text-zinc-400 text-sm">Created via UI Factory</p>
            <button className="mt-4 px-4 py-2 bg-indigo-600 rounded text-white font-bold">Action</button>
        </div>
    `
});
```
