🌌 Nebula UI Architecture: The "No-Code" Engine
Version: 2.0 (Shell Architecture) Status: Active Implementation

1. Core Philosophy: The "Browser" Model
The most important concept in Nebula is that apps/ui is not a website; it is a Runtime Environment (like a Web Browser or Spotify Player).

The Player: The React Codebase (apps/ui). It contains the logic, the components, and the renderer.

The Cartridge: The Data (.json files). This defines the layout, the flow, and the content of an application.

We do not write "Pages" in React anymore. We write Components in React, and we assemble Pages in JSON.

2. The Nebula Protocol (The Data Structure)
Every piece of UI in the system is defined by a NebulaNode. This is a recursive JSON object that tells the renderer what to paint.

The Node Interface
TypeScript

interface NebulaNode {
  id: string;           // Unique ID for React keys and selection
  type: string;         // Must match a key in component-map.tsx
  
  // 1. Static Props (Passed directly to the React Component)
  props: {
    className?: string;
    title?: string;
    [key: string]: any;
  };

  // 2. Responsive Behavior (The "Morphing" Logic)
  responsive?: {
    visibility?: {
      mobile: 'hidden' | 'visible';
      desktop: 'hidden' | 'visible';
    };
    mode?: {
      mobile: 'stack' | 'bottom-bar' | 'drawer'; // How it behaves on phone
      desktop: 'sidebar' | 'grid' | 'default';   // How it behaves on PC
    };
  };

  // 3. Hierarchy
  children?: NebulaNode[];
}
Example: A Responsive Layout
JSON

{
  "id": "main-layout",
  "type": "Flex",
  "props": { "className": "h-full w-full" },
  "children": [
    {
      "id": "nav",
      "type": "FloatingNavigation",
      "responsive": {
        "mode": { "mobile": "bottom-bar", "desktop": "sidebar" }
      }
    },
    {
      "id": "content",
      "type": "NebulaCanvas",
      "props": { "className": "flex-1" }
    }
  ]
}
3. The Renderer (NebulaRenderer)
This is the heart of the application. It is a recursive React component that takes a NebulaNode and turns it into pixels.

Location: apps/ui/src/features/nebula-renderer/NebulaRenderer.tsx

How it works:
Lookup: It reads node.type (e.g., "SmartForm").

Registry Check: It looks for "SmartForm" in apps/ui/src/nebula/component-map.tsx.

Responsive Check: It checks window.innerWidth. If node.responsive.visibility.mobile is "hidden", it renders null.

Render: It renders the React Component, passing node.props and node.children into it.

The Golden Rule:

If a component is not in component-map.tsx, it cannot be used in JSON.

4. The Shell Architecture (Project Loading)
We support building other apps inside this app. To do this, we wrap everything in the Nebula Shell.

Location: apps/ui/src/nebula/NebulaShell.tsx

The Modes:
Workbench Mode (The OS):

Renders the AgentWorkbench and DataCenter.

This is where you build the backend, manage files, and tweak themes.

It runs natively in React.

Preview Mode (The Simulator):

Renders the Target App (e.g., crm.json) inside a sandboxed container.

It simulates Mobile/Tablet/Desktop viewports.

It uses the same NebulaRenderer but feeds it a different root node.

Project Files ("Cartridges")
Virtual apps live in apps/ui/src/data/projects/.

workbench.json -> Defines the system UI.

crm.json -> Defines a custom app you are building.

mobile-app.json -> Defines a mobile-first interface.

5. Data Binding (Connecting to Backend)
How does a JSON button trigger a backend action?

Method A: Smart Components (Recommended)
The component handles the logic internally.

JSON: {"type": "RoleList", "props": { "filter": "admin" }}

React: The RoleList component imports trpc.role.list.useQuery() and handles the loading state itself.

Method B: The Resolver (Advanced)
We inject data into props using a special syntax {{ path.to.data }}.

JSON: {"type": "Text", "props": { "content": "{{ session.user.name }}" }}

Resolver: The NebulaRenderer parses these strings and replaces them with actual values from the Context before rendering.

6. Workflow for AI Agents
When asking an AI to build a new feature:

Harvest: "Look at OldPage.tsx. Extract the UserTable logic into src/components/nebula/UserTable.tsx."

Register: "Add UserTable to component-map.tsx."

Define: "Create a JSON layout in projects/my-app.json that uses UserTable inside a Flex container."

Render: "The Shell will now render this new layout instantly."