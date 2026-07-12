# EVAIX UI

The `apps/ui` workspace contains the frontend application for the EVAIX monorepo. It is built using React, Vite, and Tailwind CSS. It serves as the primary interface for visualizing agent actions, configuring workspaces, and managing tools.

The UI connects to the backend API (`apps/api`) via TRPC and REST. It can be run as a standard web application in the browser or packaged as a desktop application using Electron.

## 🚀 Getting Started

Ensure you have run the monorepo-wide setup commands first (`pnpm install` and `.env` setup in the root).

### Running in Development

To start the UI development server (along with the API) from the root of the monorepo:

```bash
# In the root directory
pnpm run dev
```

Alternatively, to run *only* the UI application from the root:

```bash
pnpm --filter ui run dev
```

### Running the Desktop App (Electron)

To run the UI packaged as a desktop Electron app:

```bash
# In the root directory
pnpm run desktop
```

Or specific to the UI package:

```bash
pnpm --filter ui run desktop
```

## 🛠️ Scripts

Within the `apps/ui` workspace, the following scripts are available (run with `pnpm run <script>`):

- `dev`: Generates the theme and starts the Vite development server concurrently with a theme file watcher.
- `desktop`: Starts the Vite server and the Electron application concurrently.
- `build`: Generates the theme and builds the Vite application for production.
- `preview`: Previews the built application locally.
- `lint`: Runs ESLint for the UI package.
- `type-check`: Runs TypeScript type checking without emitting files.

## 🎨 Theming

The UI features a robust theming system. When running `dev` or `build`, a script (`scripts/generate-theme.mjs`) automatically generates the theme based on configurations.