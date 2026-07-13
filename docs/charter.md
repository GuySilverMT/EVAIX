I. EVAIX Project Charter (Updated)
1. Vision & Purpose
EVAIX is an Agentic Spatial Window Manager designed to orchestrate AI agents and seamlessly transition computing from an application-centric model to an agent-centric matrix. Operating natively over a Linux environment, EVAIX replaces traditional desktop paradigms with a spatial coordinate system (Display → Column → Row) managed through progressive stacking. EVAIX is a self-bootstrapping, living framework—designed to use core EVAIX monorepo code to recursively build and expand itself.

2. Core Architecture & Separation of Concerns

LiteLLM (The Router): Strictly handles model and provider API routing. It acts as the universal translation layer, allowing EVAIX to swap models seamlessly without altering agent logic.

Mastra (The Orchestrator): Manages AI Roles and Agents. Roles are strictly compartmentalized and independent of models. A single Mastra role (e.g., "Frontend Architect") can be executed through any LiteLLM model.

OpenWebUI (The Interface): Serves as the primary prompt overlay and chat interface.

Postgres (The Memory): Strictly isolated for vector embeddings and semantic code search. It does not manage application state or routing.

MCP Tools (The Bridge): Exposes system capabilities, external applications (Google Docs, Blender, terminal), and the EVAIX filesystem to the agents.

3. The Context & Project Paradigm
Every interaction is contextualized by its Project Type. When operating on EVAIX (Project Type: Coding), the system dynamically binds to living documents (project_charter.md, glossary.md, coding_rules.md) and the existing codebase. The AI is restricted from rewriting existing components, instead pulling from the EVAIX UI component library and TypeScript monorepo to bootstrap new features.

II. Integration Plan: The Prompt Handoff & Context Routing
To decouple OpenWebUI's default behavior and achieve true compartmentalization between roles and models, the prompt handoff must be handled by an intermediary API layer within EVAIX.

Here is how the components act as a single cohesive unit during a prompt execution:

The Trigger (OpenWebUI / ModelBar): The user inputs a prompt. In the EVAIX ModelBar, the user has independently selected the Context Target (e.g., EVAIX/apps/api), the Role (e.g., evaix-backend-coder), and the Model (e.g., claude-3-5-sonnet).

Context Assembly (EVAIX Gateway): Before reaching the agent, the EVAIX API gateway intercepts the request. It reads the project settings, pulls the project_charter.md, and grabs relevant context limits.

Role Handoff (Mastra): The packaged prompt is routed to the Mastra Server. Mastra initializes the requested Role. Mastra assigns the specific MCP tools required for this role (e.g., Postgres semantic search for the codebase, or terminal execution).

Model Routing (LiteLLM): Instead of Mastra having a hardcoded model, EVAIX passes the user's selected model dynamically into Mastra's execution call. Mastra forwards the prompt and system instructions to the LiteLLM proxy endpoint.

Execution & Response: LiteLLM routes the request to the provider. The resulting code or action is passed back through Mastra, which utilizes its MCP tools to apply file changes to the local directory or return the response to OpenWebUI.

III. Filesystem Plan & Component Library
To ensure the AI agents understand where to look and what to code, the monorepo must be strictly segmented. This structure prevents the AI from conflating core EVAIX with other projects like Nebula, and isolates the Postgres embedding logic.

Plaintext
evaix-monorepo/
├── pnpm-workspace.yaml
├── apps/
│   ├── evaix-shell/          # Electron/React: The 3D matrix controller & ModelBar
│   ├── evaix-api/            # Express/Node: Intercepts prompts, assembles context
│   └── openwebui/            # Configured as a submodule or Docker service
├── packages/
│   ├── evaix-mastra/         # Agent framework: Role definitions & workflows
│   ├── evaix-litellm/        # Model routing & provider configurations
│   ├── evaix-mcp/            # Isolated MCP servers
│   │   ├── mcp-postgres/     # Strictly for vector embeddings/semantic search
│   │   ├── mcp-filesystem/   # Read/Write access to project directories
│   │   └── mcp-apps/         # Bridges for native apps (terminal, browser)
│   └── evaix-ui/             # Shared React components (AppCard, WebNode, etc.)
└── projects/
    └── evaix-core/           # Living context documents for the AI
        ├── project_charter.md
        ├── glossary.md
        └── coding_rules.md