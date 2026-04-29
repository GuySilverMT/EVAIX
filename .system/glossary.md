# Cooperative OS Glossary

## System Core
* **LaunchPad** (Route: `/`): The system bootloader and hub. Like VSCode's "No Folder Open" state. It handles Project selection, System Configuration, and access to the "Constitution".
* **Cooperative Workspace** (Route: `/workbench`): The primary Operating System interface. It is an adaptive environment that "eats" code to improve itself. It contains:
    * **Swappable Cards:** Multi-modal containers (Editor, Terminal, Browser) that condense/expand based on focus.
    * **Parallel Layouts:** Context-aware layouts (e.g., "Code Mode", "Deploy Mode").
* **Constitution** (Route: `/settings`): The governing laws, global rules, themes, and hotkeys.

## Orchestration & Command
* **Command Center** (Route: `/command`): The "General's Tent." It visualizes the **Chain of Command** (Corp -> Dept -> Div -> Team -> Role). Used to route prompts and oversee high-level execution.
* **Architect Studio** (Route: `/architect`): The "God Mode" for defining **Roles** and **Workflows**. Supports visual grouping (Circling Roles -> Crew -> Division).
* **Code Visualizer** (Route: `/visualizer`): The "Code Eater." A live graph of the Monorepo, showing file ownership by Role. It allows viewing code (Monaco) and summaries (TipTap).

## Data & Intelligence Infrastructure
* **Triple Layer Data:** The resiliency strategy for model data:
    1.  **Layer 1 (Provider Data):** Raw, messy JSON stored exactly as received from the API.
    2.  **Layer 2 (AI Data):** Inferred knowledge (e.g., "This model likely supports Vision") discovered by the **Model Doctor**.
    3.  **Layer 3 (Capabilities):** The computed "Specs" used by the application to filter models.
* **Model Doctor:** An autonomous background service that monitors the `ModelRegistry`. It detects "sick" models (missing specs), infers missing data via heuristics or web search, and "heals" them so they can be used.

## Agent Anatomy & Taxonomy (CRITICAL)
* **Role (The Identity):** A configuration stored in the Database (not a file). It is the "Soul" of the agent.
    * *Examples:* "Frontend Designer", "SysAdmin", "Code Reviewer".
    * *Owns:* A specific **Domain** (File paths), a **Context Budget** (Token limit), and a **Toolbelt**.
* **Tool (The Executable):** A concrete piece of **TypeScript Code** residing in the API (e.g., `apps/api/src/tools/git.ts`). It is the "Hand" that actually touches the system.
* **Tool Interface (The API):** The JSON Schema sent to the AI model. It tells the AI *what* the tool accepts (e.g., "path", "content"). It is distinct from the code itself.
* **Tool Instruction (The Usage Rule):** A text snippet injected into the System Prompt that governs **Behavior**.
    * *Example:* "When using `write_file`, you MUST run `prettier` afterwards."
* **SOP (Standard Operating Procedure):** A static **Markdown Document** that defines a complex workflow.
    * *Example:* `deployment_sop.md` (Step 1: Check tests, Step 2: Bump version, Step 3: Push).
* **Domain (The Territory):** The strict **Filesystem Boundary** enforced by the Factory.
    * *Example:* The "Frontend Role" has a domain of `apps/ui/**`. It physically cannot see or touch `apps/api/**`.

## Specialized Studios
* **Data Center** (Route: `/datacenter`): "Data God Mode." Direct SQL/JSON interaction. Features **TableNodes** for visual query building (drawing lines between columns to map data).
* **Nebula UI Builder** (Route: `/nebula-builder`): The Text-to-App engine. It replaces the old "Interface Studio".
    * **Nebula Protocol:** An AST-based transformation layer that converts natural language into React Code.
    * **No-Hallucination:** Unlike standard LLM code gen, Nebula maps intent to *existing* component libraries only.

## Universal Components
* **Global Context Bar:** The persistent top bar containing the **Universal AI Button**.
* **Universal AI Button:** The "Spark" present at every level (Global, Card, Node). It carries the context of its specific container and supports Voice Input/Output.

## Component Map
| Component | File Name | Route | Definition & Purpose |
| :--- | :--- | :--- | :--- |
| LaunchPad | `LaunchPad.tsx` | `/` | The system bootloader. The map of the OS. |
| Agent Workbench | `AgentWorkbench.tsx` | `/workbench` | The "Doing" Grid. Where humans and agents work in Swappable Cards. |
| Command Center | `CommandCenter.tsx` | `/command` | The "General's Tent." High-level dispatch and strategy visualization. |
| Code Visualizer | `CodeVisualizer.tsx` | `/visualizer` | The "Code Eater." Live graph of backend dependencies. |
| Org Structure | `OrganizationalStructure.tsx` | `/org-structure` | The "Defining" Canvas. Where Roles and Chains of Command are built. |
| Data Center | `DataCenter.tsx` | `/datacenter` | "Data God Mode." Manages SQL/JSON and Database Browser. |
| Nebula Builder | `NebulaBuilder.tsx` | `/nebula-builder` | The AI UI Factory. Uses Nebula Protocol to generate React code. |
| Constitution | `Constitution.tsx` | `/settings` | Global rules, themes, and system settings. |
| Database Browser | `DatabaseBrowser.tsx` | N/A | Component for viewing tables, importing JSON, and generating SQL. |
