import { prisma } from '../db.js';
import { IRegistryClient } from "../interfaces/IRegistryClient.js";

export class RegistryClient implements IRegistryClient {

  private configs: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {
    'filesystem': {
      command: 'node',
      args: ['node_modules/@cyanheads/filesystem-mcp-server/dist/index.js']
    },
    'git': {
      command: 'node',
      args: ['node_modules/git-mcp-server/build/index.js']
    }
  };

  async listServers(): Promise<{ name: string; description?: string }[]> {
    const dbServers = await prisma.mcpServer.findMany({
      where: { status: 'active' },
      select: { name: true }
    });

    const servers = dbServers.map(s => ({ name: s.name, description: 'Dynamically installed skill' }));

    // Fallback dictionary names
    for (const name of Object.keys(this.configs)) {
        if (!servers.some(s => s.name === name)) {
            servers.push({ name, description: 'Core server' });
        }
    }

    return servers;
  }

  async getServerConfig(serverName: string): Promise<{ command: string; args: string[]; env?: Record<string, string> }> {
    const dbServer = await prisma.mcpServer.findUnique({
      where: { name: serverName }
    });

    if (dbServer) {
        return {
            command: dbServer.command,
            args: dbServer.args,
            env: dbServer.env as Record<string, string> | undefined
        };
    }

    const config = this.configs[serverName];
    if (config) {
        return config;
    }

    throw new Error(`Server config not found for ${serverName}`);
  }
}