# Cooperative OS: Living Glossary

## 🟢 The Active Core (Stable)
These components are the "Single Source of Truth" for the current system interaction.

### **Nebula UI Builder** (formerly Interface Studio)
The visual "Text-to-App" engine. It allows users to build React interfaces using natural language.
* **Role:** The "Factory" that builds the frontend.
* **Status:** **Active**. This is the primary mechanism for UI generation.
* **Underlying Tech:** Uses the **Nebula Protocol** (AST transformations) to generate safe, hallucination-free React code.

### **Cooperative Workbench**
The primary operating environment (`/workbench`). This is the "Grid" where Humans and AI Agents collaborate.
* **Swappable Cards:** The fundamental unit of the Workbench. A card can be a Terminal, a Code Editor, or a Browser. They are multi-modal containers that agents can populate.
* **Smart Context:** The Workbench is aware of the active project and user focus.

### **Data Center**
The "Engine Room" for data (`/datacenter`).
* **Function:** Direct management of SQL databases and JSON stores.
* **Database Browser:** A visual tool to inspect tables and run queries.
* **Status:** **Active**. Essential for backend data verification.
### **Anti-Corruption Ingestion**
A two-phase pipeline that protects the system from malformed or expensive provider data.
* **Phase 1 (The Bag):** Raw JSON from providers is saved to `RawDataLake` untouched.
* **Phase 2 (The Gatekeeper):** Data is filtered (e.g., rejecting paid models) and normalized into the `Model` table.

### **Surveyor (Model Doctor)**
An internal service that uses name-based heuristics and metadata inspection to proactively determine model capabilities (Vision, Reasoning, etc.) without making test prompts.

---

## 🔵 System Architecture Concepts

### **Codemode (Experimental)**
A pattern where an Agent generates executable code (JavaScript/Python) to orchestrate complex tasks, rather than calling fixed tools one by one.
* **Why:** Allows for loops, retries, and conditional logic *inside* the tool call.
* **Integration:** Designed to work heavily with **MCP Servers**.

### **MCP (Model Context Protocol)**
The standard for connecting AI models to external systems (Filesystem, GitHub, Postgres).
* **Philosophy:** Tools are not internal functions; they are external **Servers**.
* **Podman:** We use Podman containers to run these MCP servers securely.

### **Volcano**
The orchestration framework used to define high-level agent workflows (branching, loops, sub-agents).

### **Exhaustive Fallbacks**
The system's resilience strategy. It never fails on the first error. It tries:
1.  Same Provider (Backup Model)
2.  Different Provider (Equivalent Model)
3.  **Unknown Model Fallback:** Falling back to a generic model from the `UnknownModel` pool if no specialized match exists.
4.  Only then does it fail.

### **Specialized Models**
Models linked to specific capability tables (`EmbeddingModel`, `AudioModel`, `ImageModel`) allowing for domain-specific metadata (e.g., embedding dimensions or sample rates).

---

## 🟠 Legacy & Deprecated (The "Boneyard")
*Do not rely on these components. They are currently broken or being refactored.*

* **Command Center:** (Legacy) Old high-level strategy view.
* **Code Visualizer:** (Legacy) The live graph view.
* **Architect Studio:** (Legacy) The "God Mode" for role definition.
* **Org Structure:** (Legacy) Chain of command visualizer.

---

## 🟣 Naming & Taxonomy Rules

### **Identity vs. Implementation**
We strictly distinguish between the *Idea* of an agent and the *Code* that runs it.
* **The Role (Identity):** A data entity (JSON/Markdown) defining *Intent* (e.g., "Backend Developer").
* **The Runtime (Implementation):** The TypeScript code handling execution (e.g., `AgentRuntime.ts`).

### **Agent DNA**
The configuration file that defines a Role. It contains the prompt, tool access, and context budget.