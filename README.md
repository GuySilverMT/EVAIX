# EVAIX Monorepo

Welcome to the **EVAIX** (Cognitive Orchestration & Research Engine) monorepo.

EVAIX is an Agentic Spatial Window Manager designed to orchestrate AI agents and seamlessly transition computing from an application-centric model to an agent-centric matrix. Operating natively over a Linux environment, EVAIX replaces traditional desktop paradigms with a spatial coordinate system (Display → Column → Row) managed through progressive stacking. EVAIX is a self-bootstrapping, living framework—designed to use core EVAIX monorepo code to recursively build and expand itself.

## 🏗️ Architecture & Separation of Concerns

The EVAIX system is composed of decoupled parts that interact to provide a seamless user and agent experience:

```mermaid
graph TD;
    UI[OpenWebUI / React Shell] <--> API[EVAIX Gateway (API)];
    API <--> Mastra[Mastra Orchestrator];
    Mastra <--> MCP[MCP Tools];
    Mastra <--> LLM[LiteLLM Router];
    LLM <--> Models[Local & Remote AI Models];
    API <--> DB[(Postgres Memory)];
```

- **LiteLLM (The Router)**: Strictly handles model and provider API routing. It acts as the universal translation layer.
- **Mastra (The Orchestrator)**: Manages AI Roles and Agents. Roles are strictly compartmentalized and independent of models.
- **OpenWebUI (The Interface)**: Serves as the primary prompt overlay and chat interface.
- **Postgres (The Memory)**: Strictly isolated for vector embeddings and semantic code search.
- **MCP Tools (The Bridge)**: Exposes system capabilities, external applications, and the EVAIX filesystem to the agents.

## 🚀 Setup Guide

Follow these steps to bootstrap the EVAIX monorepo and run it locally.

### 1. Prerequisites

- **Node.js**: v24 or higher is recommended for full compatibility.
- **pnpm**: Make sure you have `pnpm` installed (`npm install -g pnpm`).
- **PostgreSQL**: A running local PostgreSQL instance is required for vector embeddings.

### 2. Installation

Clone the repository and install all monorepo dependencies:

```bash
# Install dependencies across all workspaces
pnpm install
```

### 3. Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

_(Edit `.env.local` to add your PostgreSQL connection string, API keys for LLM providers, etc.)_

### 4. Running the Application

You can start the main development servers concurrently from the root directory:

```bash
# Starts the API and UI in development mode
pnpm run dev
```

To run the desktop app:

```bash
pnpm run desktop
```

## 📚 Documentation

For more detailed information, please see the specific documentation in the `docs/` folder, or the `README.md` files located in each application directory:

- [Charter](./docs/charter.md)
- [API Documentation](./apps/api/README.md)

---

_Part of the C.O.R.E. (Cognitive Orchestration & Research Engine) monorepo._
