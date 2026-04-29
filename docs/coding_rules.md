# System Coding Rules & Constitution

## 1. The Rule of Separation (Identity vs. Implementation)
* **Constraint:** You MUST distinguish between a "Role" (The Persona) and "Code" (The Logic).
* **Naming Convention:**
    * **Roles (Data):** Use **kebab-case** or **Title Case** in string definitions. (e.g., `backend-developer`, "Senior Architect").
    * **Code (Logic):** Use **PascalCase** for classes and **camelCase** for instances.
    * **Forbidden:** Never name a TypeScript class simply `BackendDeveloper`. It must be `BackendDeveloperAgent` or `BackendDeveloperRuntime`.
    * **Reasoning:** An LLM is a *driver*. The Code is the *vehicle*. Do not confuse the driver with the car.

## 2. The Rule of Exhaustive Fallbacks
* **Philosophy:** The system must "try, fallback, exhaust" before failing.
* **Sequence:**
    1.  **Primary:** Best free model (Healthy Provider).
    2.  **Intra-Provider:** Next best model on the same provider.
    3.  **Inter-Provider:** Switch provider (e.g., Google -> OpenRouter).
    4.  **Fail:** Only after all options are exhausted.

## 3. The Rule of "Codemode" Preference
* **Experimental:** When complex orchestration is needed (e.g., "Check file, if missing create it, then write to it"), prefer using **Codemode** to generate a single script rather than chaining multiple chat round-trips.
* **MCP Integration:** Codemode should be the primary method for interacting with stateful MCP servers.

## 4. The Rule of Ubiquity (The "Spark")
* **Requirement:** The `SuperAiButton` (or `AiActionTrigger`) MUST be present on every interactive component (Input, Card, Terminal).
* **Context:** The button must be aware of its local container (e.g., "I am in the Data Center Grid").

## 5. The Rule of Evolution (Auto-Commit)
* **Requirement:** Any AI modification to the Virtual File System (VFS) must trigger a Git Commit.
* **Tagging:** Commits must be tagged with `[Role Name]: Intent`.

## 6. The Rule of Scope (Retention)
* **Constraint:** AI Agents may ADD functionality but NEVER remove existing features without explicit confirmation.
* **Frontend Focus:** The **Nebula** and **Workbench** components are the "Golden Paths". Do not break them to fix legacy components (Command Center, Visualizer).

## 7. The Rule of Loose Coupling (JIT)
* **Requirement:** Roles define **Intent** (Requirements), not specific Model IDs.
* **Implementation:** The Orchestrator selects the model **Just-In-Time** based on the current health and `Exhaustive Fallback` status.

## 9. The Rule of Anti-Corruption Ingestion
* **Process:** Never ingest provider data directly into `Model`. Use `RawDataLake` first to preserve the source of truth perfectly.
* **Cost Safety:** Filtering MUST happen in the normalization phase (Phase 2), never at the source.

## 10. The Rule of Type Resilience
* **Philosophy:** The codebase must remain buildable even if Prisma Client generation is out of sync.
* **Practice:** If the IDE/Build fails on newly added Prisma fields, use local **Delegates** or **Interfaces** and `any` casts in the service layer until the environment stabilizes. Do not stop development for a generator lag.

## 11. Tech Stack Constraints
* **Frontend:** Next.js + React (Nebula/Workbench).
* **Backend:** Node.js/TypeScript (Direct DB Access).
* **Prisma:** Central DB access, but resilient to minor schema shifts.
* **Containers:** Podman + Podman Compose.
* **Orchestration:** Volcano.dev + MCP.