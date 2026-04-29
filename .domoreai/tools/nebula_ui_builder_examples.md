
# Nebula UI Builder Tool - v2.0 Protocol

## Overview
The Nebula UI Builder is a code-first UI construction system. In **CODE MODE**, you build interfaces using a high-level TypeScript API with global safety shims.

## NEBULA CODE MODE v2.0

### 1. Global API
You have direct access to these globals:

*   **`nebula`**: The main interface for tree manipulation.
    *   `addNode(parentId, node)`: Adds a node. **CRITICAL: Returns the new nodeId (string).**
    *   `updateNode(nodeId, updates)`: Updates props/styles.
    *   `moveNode(nodeId, targetParentId, index)`: Reorders or moves a node to a new parent.
    *   `deleteNode(nodeId)`: Removes node + children.
*   **`ast`**: The smartest way to ingest JSX.
    *   `parse(jsxString)`: Converts JSX into a Nebula fragment.
*   **`tree`**: Read-only current state.

### 2. The Thinking Protocol
Before writing any code, you MUST follow this structure in your response:
1.  **LOCATE**: Identify the parent (usually `'root'`).
2.  **DEFINE**: Choose layout (flex/grid) and style tokens (Tailwind).
3.  **EXECUTE**: Write the script.

### 3. Style & Layout Tokens
**NEVER use pixel values.** Use Tailwind utility tokens.
- **Layout**: `layout: { mode: 'flex', direction: 'column', justify: 'center', gap: 'gap-4' }`
- **Styles**: `style: { background: 'bg-card', padding: 'p-6', radius: 'rounded-xl', shadow: 'shadow-md' }`

## Component Registry

- **Box**: Layout container. Use for wrapping and layout.
- **Text**: Props: `{ children: string, type: 'h1'|'h2'|'h3'|'p' }`.
- **Button**: Props: `{ children: string, variant: 'default' | 'ghost' | 'outline' }`.
- **Input / Textarea**: Standard text inputs.
- **Badge**: Tiny label/pill.
- **Label**: Form labels.
- **Slider**: Range slider input.
- **Icon**: Props: `{ name: string }` (Use [Lucide](https://lucide.dev/icons) names like "User", "Settings").
- **Card**: Composite with children: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **Tabs**: Composite with children: `TabsList`, `TabsTrigger` (prop `value`), `TabsContent` (prop `value`).
- **AiButton / SuperAiButton**: Special AI-trigger buttons.
- **Image**: Props: `{ src: string, alt: string }`.

## Golden Rules
1.  **Always capture IDs**: `const boxId = nebula.addNode('root', { ... });`
2.  **Atomic Operations**: One script should perform one logical task (e.g., "Create Login Screen").
3.  **No Hallucinations**: Only use the `nebula` and `ast` globals. No `axios`, `fetch`, or `document`.

## Example: Building a 2x2 Grid

```typescript
// 1. Create Grid Container
const gridId = nebula.addNode('root', {
  type: 'Box',
  layout: { mode: 'grid', columns: 2, gap: 'gap-4' },
  style: { padding: 'p-8', background: 'bg-slate-900' }
});

// 2. Add Cards via Loop
['A', 'B', 'C', 'D'].forEach(label => {
  const cardId = nebula.addNode(gridId, {
    type: 'Box',
    style: { background: 'bg-slate-800', padding: 'p-4', radius: 'rounded-lg' }
  });
  
  nebula.addNode(cardId, {
    type: 'Text',
    props: { children: `Section ${label}` },
    style: { color: 'text-white', fontWeight: 'font-bold' }
  });
});
```
