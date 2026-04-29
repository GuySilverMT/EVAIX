import { IRegistryClient } from "../interfaces/IRegistryClient.js";

export class RegistryClient implements IRegistryClient {
  listServers(): Promise<{ name: string; description?: string }[]> {
    return Promise.resolve([
      { name: 'filesystem', description: 'System: Surgical file editing' },
      { name: 'git', description: 'System: Git history and operations' },
      { name: 'postgres', description: 'System: Database inspection' },
      { name: 'playwright', description: 'System: UI verification' },
      // Additional servers commented out - enable as needed
      // { name: 'memory', description: 'Memory: Knowledge Graph' },
      // { name: 'commander', description: 'System: Process & Fuzzy Search' },
      // { name: 'docker', description: 'Execution: Sandboxed environment' },
      // { name: 'context7', description: 'Grounding: Documentation fetching' },
      // { name: 'planning', description: 'Strategy: Software Planning Tool' },
      // { name: 'deep-research', description: 'Research: Deep Web & Academic Search' }
    ]);
  }

  async getServerConfig(serverName: string): Promise<{ command: string; args: string[]; env?: Record<string, string> }> {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/domoreai";

    // We utilize dynamic imports to keep the code cleaner and avoid top-level await issues if any
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);

    const resolvePath = (pkgName: string, relativeScript: string) => {
      try {
        // Resolve package.json to get the root
        const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
        const pkgRoot = pkgJsonPath.replace('/package.json', '');
        return `${pkgRoot}/${relativeScript}`;
      } catch (err) {
        console.error(`Failed to resolve path for ${pkgName}`, err);
        throw new Error(`Failed to resolve MCP server package: ${pkgName}`);
      }
    };

    const configs: Record<string, () => { command: string; args: string[]; env?: Record<string, string> }> = {
      // 1. Perception Layer (Filesystem)
      'filesystem': () => ({
        command: 'node',
        args: [resolvePath('@cyanheads/filesystem-mcp-server', 'dist/index.js')],
        env: {}
      }),

      // 2. Operational History (Git)
      'git': () => ({
        command: 'node',
        args: [resolvePath('git-mcp-server', 'build/index.js')],
        env: {}
      }),

      // 3. Database Layer (Postgres)
      'postgres': () => ({
        command: 'node',
        args: [resolvePath('@henkey/postgres-mcp-server', 'build/index.js')],
        env: {
          "POSTGRES_CONNECTION_STRING": dbUrl
        }
      }),

      // 4. UI Verification (Playwright)
      'playwright': () => ({
        command: 'node',
        args: [resolvePath('@automatalabs/mcp-server-playwright', 'dist/index.js')],
        env: {}
      }),

      /*
      // Missing servers commented out to prevent errors
      */
    };

    const configFactory = configs[serverName];
    if (!configFactory) {
      throw new Error(`Unknown MCP server: ${serverName}`);
    }

    return configFactory();
  }

  // Static Facade for backward compatibility
  private static instance = new RegistryClient();

  static async listServers() {
    return this.instance.listServers();
  }

  static async getServerConfig(serverName: string) {
    return this.instance.getServerConfig(serverName);
  }
}

