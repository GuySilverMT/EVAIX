import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function run() {
  const transport = new SSEClientTransport(new URL("http://localhost:9099/sse"));
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  
  await client.connect(transport);
  console.log("Connected to MCP Server!");
  
  const tools = await client.listTools();
  console.log(`Found ${tools.tools.length} tools.`);
  for (const tool of tools.tools) {
    console.log(`- ${tool.name}: ${tool.description}`);
  }
  
  await transport.close();
}
run().catch(console.error);
