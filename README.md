# EVAIX Monorepo

Welcome to the **EVAIX** (Cognitive Orchestration & Research Engine) monorepo.

EVAIX is a comprehensive system featuring a React-based frontend UI, a backend API orchestrating AI agents and MCP tools, and a standalone Voice Input application for system-wide speech-to-text functionality.

## 🏗️ Architecture

The EVAIX system is composed of three main parts that interact to provide a seamless user experience:

```mermaid
graph TD;
    UI[Electron / React UI (apps/ui)] <--> API[Backend API (apps/api)];
    Voice[Voice Input (apps/voice-input)] --> System[System Wide Input];
    UI -.-> System;
    API <--> DB[(PostgreSQL Database)];
    API <--> Models[Local & Remote AI Models];
```

1. **Backend API (`apps/api`)**: Built with Node.js/Express (or similar). It handles AI orchestration, connections to PostgreSQL, model routing (via `@evaix/arbitrage`), and provides a TRPC/REST interface for the UI.
2. **Frontend UI (`apps/ui`)**: A React/Vite application that can be run in the browser or packaged as an Electron desktop application. It connects to the Backend API to visualize agent actions, manage tools, and configure the workspace.
3. **Voice Input (`apps/voice-input`)**: A standalone application (available in Python and Electron versions) that listens for a global hotkey and uses speech-to-text to insert dictated text into any active system window.
4. **Bad Builder (`apps/badbuilder`)**: A static vanilla web application used for canvas-based layout generation and experimentation (Nebula engine).

## 🚀 Setup Guide

Follow these steps to bootstrap the EVAIX monorepo and run it locally.

### 1. Prerequisites

- **Node.js**: v22 or higher (v24 recommended for full compatibility).
- **pnpm**: Make sure you have `pnpm` installed (`npm install -g pnpm`).
- **PostgreSQL**: A running local PostgreSQL instance is required for the database.
- **Python 3**: For running the recommended Voice Input app.

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
*(Edit `.env.local` to add your PostgreSQL connection string, API keys for LLM providers, etc.)*

### 4. Database Setup

Push the Prisma schema to your PostgreSQL database:

```bash
# Push schema from the API workspace
pnpm run db:push
```

### 5. Running the Application

You can start the main development servers (UI and API) concurrently from the root directory:

```bash
# Starts the API and UI in development mode
pnpm run dev
```

To run the desktop Electron app:

```bash
pnpm run desktop
```

To run the standalone Voice Input application:

```bash
./start-voice-input.sh
```

## 📚 Documentation

For more detailed information, please see the specific documentation in the `docs/` folder, or the `README.md` files located in each application directory:
- [API Documentation](./apps/api/README.md)
- [UI Documentation](./apps/ui/README.md)
- [Voice Input Documentation](./apps/voice-input/README.md)
- [Bad Builder Documentation](./apps/badbuilder/README.md)

---
*Part of the C.O.R.E. (Cognitive Orchestration & Research Engine) monorepo.*
