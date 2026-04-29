# Agent DNA Reference Guide

This document defines the **DNA Structure** of an AI Agent (Role Variant) in the Nebula architecture. It explains what choices are available for each module and how they impact the agent's behavior.

## 🧬 What is Agent DNA?

Agent DNA is the configuration set that defines a "Role Variant". It is stored in the `RoleVariant` table in Postgres as JSON blobs (`identityConfig`, `cortexConfig`, `governanceConfig`, `contextConfig`). It dictates *who* the agent is, *how* it thinks, and *what* it can do.

---

## 🏗️ The 5 Modules of DNA

### 1. Identity Module (The Persona)
Defines the personality and communication style.
*   **Purpose**: Ensures the agent speaks and interacts appropriately for its role (e.g., a "QA Assessor" should be strict; a "Brainstormer" should be creative).
*   **Configuration Keys**:
    *   `personaName`: Creative codename (e.g., "Architect X", "Code Ninja").
    *   `systemPromptDraft`: The actual instruction text injected into the LLM.
    *   `style`: Communication mode.
        *   **Choices**: `PROFESSIONAL_CONCISE`, `SOCRATIC` (Questions only), `AGGRESSIVE_AUDITOR` (Finds faults), `CREATIVE_EXPLORER`.

### 2. Cortex Module (The Brain)
Defines the cognitive load, orchestration strategy, and capabilities.
*   **Purpose**: Determines how complex the agent's thinking process is.
*   **Configuration Keys**:
    *   `orchestration`: The thinking pattern.
        *   **Choices**:
            *   `SOLO`: Single-shot response.
            *   `CHAIN_OF_THOUGHT`: Step-by-step reasoning before answering.
            *   `MULTI_STEP_PLANNING`: Creates a plan first, then executes.
    *   `contextRange`: Token limits (e.g., `{ min: 4096, max: 8192 }`).
    *   `reflectionEnabled`: `true` (Double-check work) / `false` (Speed).
    *   `capabilities`: Hardware/Software features.
        *   **Choices**: `vision` (See images), `reasoning` (o1/DeepSeek), `tts` (Speak), `embedding` (RAG), `coding`.

### 3. Governance Module (The Law)
Defines the rules and quality assurance gates.
*   **Purpose**: Prevents the agent from breaking the system or writing bad code.
*   **Configuration Keys**:
    *   `rules`: List of strict constraints (e.g., "No destructive database migrations", "Always use Arrow Functions").
    *   `assessmentStrategy`: How the agent's work is graded.
        *   **Choices**:
            *   `LINT_ONLY`: Fast, checks syntax.
            *   `VISUAL_CHECK`: Asks user for visual confirmation.
            *   `STRICT_TEST_PASS`: Must pass `npm test`.
    *   `enforcementLevel`:
        *   **Choices**: `BLOCK_ON_FAIL`, `WARN_ONLY`.

### 4. Context Module (The Memory Strategy)
Defines how the agent accesses information.
*   **Purpose**: Optimizes token usage and retrieval accuracy.
*   **Configuration Keys**:
    *   `strategy`:
        *   **Choices**:
            *   `STANDARD`: Reads open files (VS Code style).
            *   `VECTOR_SEARCH`: Searches the Vector Database (RAG) for semantic matches.
            *   `LOCUS_FOCUS`: ONLY sees the file actively being edited.
    *   `permissions`: Allowed paths (e.g., `["/src", "/docs"]` or `["ALL"]`).

### 5. Tool Module (The Extensions)
Defines which external tools the agent can use.
*   **Purpose**: Extends the agent's capabilities beyond text generation.
*   **Configuration Keys**:
    *   `customTools`: A list of Tool Names.
*   **Relationship to MCP**:
    *   The **Tool Architect** (LLM) scans the **MCP Registry** (`prisma.tool`) and selects the best tools for the job.
    *   Example: A "Researcher" role gets `deep-research`. A "Manager" role gets `planning`.
    *   **These ARE the MCP Servers**. The DNA just lists *which ones* to enable.

---

## ❓ FAQ: DNA vs. MCP Servers

| Concept | Explanation | Example |
| :--- | :--- | :--- |
| **MCP Server** | The **Executable Program** that provides a tool. | `mcp-server-git`, `deep-research.py`. |
| **MCP Tool** | A single function provided by a server. | `git_commit`, `deep_research`. |
| **Agent DNA** | The **Configuration** that selects tools. | "This agent has `git_commit` enabled." |

**Analogy**:
*   **MCP Servers** are apps in the App Store.
*   **Agent DNA** is the list of apps you decided to install on *your* phone.

---

## 🚀 How to Create DNA
You don't write JSON manually. You use the **Role Factory**:
1.  **Prompt**: "Create a Senior Frontend Developer role."
2.  **Architects**: The system uses 5 sub-agents (Identity, Cortex, Governance, Context, Tool Architects) to generate the DNA automatically.
3.  **Result**: A new `RoleVariant` is born.
