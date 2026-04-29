import { prisma } from '../db.js';
import { RegistryClient } from './mcp-registry-client.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface McpToolSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  enum?: unknown[];
  description?: string;
}

export class McpToolSyncService {
  private static registry = new RegistryClient();

  static async syncAllTools() {
    console.log('[McpSync] 🔄 Starting automatic tool synchronization...');
    const servers = await this.registry.listServers();
    const stats = { servers: 0, tools: 0, errors: 0 };

    for (const serverDef of servers) {
      const serverName = serverDef.name;
      let client: Client | null = null;

      try {
        const config = await this.registry.getServerConfig(serverName);

        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
        });

        transport.onerror = (err) => {
          console.warn(`[McpSync] Transport error for ${serverName}:`, err.message);
        };

        client = new Client(
          { name: "domoreai-sync", version: "1.0.0" },
          { capabilities: {} }
        );

        // Set a timeout for connection to avoid hanging the boot process
        const connectPromise = client.connect(transport);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000));
        
        await Promise.race([connectPromise, timeoutPromise]);

        const { tools } = await client.listTools();
        
        for (const tool of tools) {
          const safeName = `${serverName}_${tool.name}`.replace(/-/g, '_');
          const tsDefinition = this.generateToolInterface(tool.name, tool.description || '', tool.inputSchema as unknown as McpToolSchema);

          await prisma.tool.upsert({
            where: { name: safeName },
            update: {
              description: `[MCP: ${serverName}] ${tool.description}`,
              instruction: tsDefinition,
              schema: JSON.stringify(tool.inputSchema),
              isEnabled: true,
              serverId: serverName
            },
            create: {
              name: safeName,
              description: `[MCP: ${serverName}] ${tool.description}`,
              instruction: tsDefinition,
              schema: JSON.stringify(tool.inputSchema),
              isEnabled: true,
              serverId: serverName
            }
          });
          stats.tools++;
        }
        stats.servers++;
        console.log(`[McpSync] ✅ Synced ${tools.length} tools from ${serverName}`);

      } catch (err) {
        console.warn(`[McpSync] ⚠️ Failed to sync ${serverName}:`, err instanceof Error ? err.message : err);
        stats.errors++;
      } finally {
        if (client) {
            try { 
              // Give it a tiny moment for any trailing data to flush before killing the process
              await new Promise(resolve => setTimeout(resolve, 100));
              await client.close(); 
            } catch {}
        }
      }
    }
    return stats;
  }

  private static simpleSchemaToTs(schema: McpToolSchema, indentLevel = 0): string {
    const indent = '  '.repeat(indentLevel);
    
    if (!schema) return 'any';
    
    if (schema.type === 'string') {
       if (schema.enum) {
           return (schema.enum as string[]).map((e: string) => `'${e}'`).join(' | ');
       }
       return 'string';
    }
    
    if (schema.type === 'number' || schema.type === 'integer') return 'number';
    if (schema.type === 'boolean') return 'boolean';
    
    if (schema.type === 'array') {
        const itemType = this.simpleSchemaToTs(schema.items as McpToolSchema, indentLevel);
        return `Array<${itemType}>`;
    }
    
    if (schema.type === 'object' || schema.properties) {
        if (!schema.properties) return '{}';
        
        const lines: string[] = [];
        lines.push('{');
        
        for (const [key, prop] of Object.entries(schema.properties)) {
            const propSchema = prop as McpToolSchema;
            const isRequired = schema.required?.includes(key) ?? false;
            const q = isRequired ? '' : '?';
            const tsType = this.simpleSchemaToTs(propSchema, indentLevel + 1);
            
            if (propSchema.description) {
                lines.push(`${indent}  // ${propSchema.description}`);
            }
            lines.push(`${indent}  ${key}${q}: ${tsType};`);
        }
        
        lines.push(`${indent}}`);
        return lines.join('\n');
    }
    
    return 'any';
  }

  private static generateToolInterface(toolName: string, description: string, inputSchema: McpToolSchema): string {
      const pascalName = toolName
          .split('_')
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join('') + 'Tool';

      const argsType = this.simpleSchemaToTs(inputSchema, 1);
      
      return `
type ${pascalName} = {
  // ${description.replace(/\n/g, '\n  // ')}
  ${toolName}: (args: ${argsType}) => Promise<any>;
};
`.trim();
  }
}
