# EVAIX API

The `apps/api` workspace contains the backend application for the EVAIX monorepo. It is a Node.js API that handles AI agent orchestration, MCP tool integration, local/remote model routing via `@evaix/arbitrage`, and provides a TRPC/REST interface for the frontend UI.

## 🚀 Getting Started

Ensure you have run the monorepo-wide setup steps first, including installing dependencies (`pnpm install`), configuring your `.env.local` file at the root, and ensuring a local PostgreSQL instance is running.

### 1. Database Setup

Before running the API, you must push the Prisma schema to your PostgreSQL database. Run this from the root of the monorepo:

```bash
pnpm run db:push
```

Or, directly within the `apps/api` directory:

```bash
npx prisma db push
```

### 2. Running the Development Server

To start the API development server alongside the UI from the monorepo root:

```bash
pnpm run dev
```

To run *only* the API development server from the root:

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

The API relies on Prisma as its ORM, mapping to a PostgreSQL database. Code logic such as Vector storage (`PgVectorStore`), AI Provider integration, and tool management live within the `src/` directory.

The API workspace must have access to the PostgreSQL database mapped in your environment variables for successful execution.