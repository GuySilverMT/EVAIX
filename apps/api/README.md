# EVAIX API

The `apps/api` workspace contains the backend application for the EVAIX monorepo. It is a Node.js API that handles AI agent orchestration, MCP tool integration, local/remote model routing via `@evaix/arbitrage`, and provides a TRPC/REST interface for the frontend UI.

## 🚀 Getting Started

Ensure you have run the monorepo-wide setup steps first, including installing dependencies (`pnpm install`), configuring your `.env.local` file at the root, and ensuring a local PostgreSQL instance is running.

### 1. Running the Development Server

To start the API development server alongside the UI from the monorepo root:

```bash
pnpm run dev
```

To run _only_ the API development server from the root:

```bash
pnpm --filter api run dev
```

## 🛠️ Scripts

Within the `apps/api` workspace, the following key scripts are available:

- `dev`: Starts the development server using `tsx` and the root `.env.local` file.
- `build`: Compiles the TypeScript code (`tsc -b`).
- `start`: Starts the compiled application in production mode (`node dist/src/index.js`).
- `lint`: Runs ESLint for the API package.

### Database / Seeding Scripts

- `ingest:models`: Ingests model configurations into the database.
- `seed:models`: Seeds ghost records for models.
- `premigrate` / `postmigrate`: Helper scripts for exporting/syncing DB state to and from JSON during migrations.

## 🗄️ Architecture Notes

The API relies on flat JSON files for application database logic. Code logic such as Vector storage (`PgVectorStore`), AI Provider integration, and tool management live within the `src/` directory.

The API workspace uses flat JSON files and PostgreSQL vector embeddings to persist data.
