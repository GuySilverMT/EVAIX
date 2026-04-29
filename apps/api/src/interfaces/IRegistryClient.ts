export interface IRegistryClient {
  listServers(): Promise<{ name: string; description?: string }[]>;
  getServerConfig(serverName: string): Promise<{ command: string; args: string[]; env?: Record<string, string> }>;
}
