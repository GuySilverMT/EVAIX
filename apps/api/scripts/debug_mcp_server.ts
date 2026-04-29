
import { RegistryClient } from '../src/services/mcp-registry-client.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const serverName = process.argv[2];
  if (!serverName) {
    console.error('Usage: npx tsx apps/api/scripts/debug_mcp_server.ts <server_name>');
    process.exit(1);
  }

  console.log(`🔍 Probing server: ${serverName}...`);
  
  const registry = new RegistryClient();
  
  try {
    const config = await registry.getServerConfig(serverName);
    console.log('📄 Configuration:', JSON.stringify(config, null, 2));

    console.log('🔌 Connecting...');
    const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
    });

    const client = new Client(
        { name: "debug-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);
    console.log('✅ Connected.');

    console.log('🛠️  Listing tools...');
    const { tools } = await client.listTools();
    console.log(`🎉 Found ${tools.length} tools:`);
    tools.forEach(t => console.log(`   - ${t.name}: ${t.description?.substring(0, 50)}...`));

    await client.close();

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main();
