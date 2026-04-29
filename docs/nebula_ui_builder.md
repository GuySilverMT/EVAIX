Open your terminal in the root of domoreai.

Install dependencies to ensure the workspace is linked:

Bash

pnpm install
Create the target package directory (Manual override to prevent agent "permission" hesitation):

Bash

mkdir -p packages/nebula/src/core
mkdir -p packages/nebula/src/engine
mkdir -p packages/nebula/src/react
mkdir -p packages/nebula/src/ingest
Phase 1: Agent Injection (Execute Sequentially)
Copy the blocks below and paste them into your AI Agent's chat window. If you are using a tool like Cursor/Windsurf, use "Composer" or "Chat" mode.

Step 1: The DNA (Types & Schema)
Action: Paste [TASK 1] from the previous response.

Verify: Check that packages/nebula/src/core/types.ts exists and exports NebulaNode.

Step 2: The Engine (State Logic)
Action: Paste [TASK 2] from the previous response.

Verify: Check packages/nebula/src/engine/NebulaOps.ts.

Self-Correction Check: Ensure it imports produce from immer. If the agent forgot to add immer to package.json, run:

Bash

pnpm add immer -w
Step 3: The Renderer (React Component)
Action: Paste [TASK 3] from the previous response.

Verify: Check packages/nebula/src/react/NebulaRenderer.tsx.

Critical Check: Ensure it handles the children mapping correctly.

<!-- cspell:ignore Ingester -->
Step 4: The Ingester (AST Transformer)
Action: Paste [TASK 5] from the previous response.

Verify: Check packages/nebula/src/ingest/AstTransformer.ts.

Step 5: The Cockpit (The Page)
Action: Paste [TASK 6] from the previous response.

Verify: Check apps/ui/src/pages/nebula-builder.tsx.

Phase 2: Wiring & Launch
The agents might create the files, but they often struggle to "hook up" the final route in a complex existing router. You should do this manually to be safe.

1. Add the Route Open apps/ui/src/App.tsx (or your router configuration file) and add:

TypeScript

import NebulaBuilderPage from './pages/nebula-builder';

// Inside your <Routes> or router config:
<Route path="/nebula" element={<NebulaBuilderPage />} />
2. Start the UI

Bash

pnpm --filter ui dev
3. Access the Cockpit Open your browser to http://localhost:5173/nebula (or your port).

Phase 3: The "First Flight" (Verification)
Now we verify if the "Ghost" layout engine works.

Test A: The Simulation

On the Nebula Page, click the "Run AI Simulation" button in the top right.

Success: You should see a JSON tree appear on the left, and a rendered Hero Section appear on the right instantly.

Test B: The "Code Mode" (Real AI Test) Now, switch to your AI Agent (in your IDE or OS) and give it the System Instructions I provided earlier.

Prompt the Agent:

"I want to modify the Nebula Layout. Use nebula.addNode to insert a 'Card' component into the root. Inside the card, add a 'Text' node that says 'System Online'."

Observe:

The Agent should output TypeScript code.

Your OS/IDE should execute that code against the running NebulaOps instance.

The UI should update without a page refresh.

Troubleshooting
Missing Styles: If the components appear unstyled (just plain HTML), ensure NebulaRenderer is correctly using cn() or your resolveStyles helper is correctly mapping p-4 to your CSS framework.

"Component Not Found": If the renderer is blank, check the Registry map in NebulaRenderer.tsx. Ensure it maps the string 'Box' to a real <div> or <Box> component.

AST Errors: If pasting JSX fails, ensure you installed typescript as a dependency in the nebula package so the compiler API is available.