import { AgentRuntime } from './src/services/AgentRuntime.js';

async function run() {
  const runtime = new AgentRuntime();
  
  console.log("🚀 Submitting request to Role Architect...");
  const result = await runtime.executeRoleArchitect(
    "I need a highly aggressive Quality Assurance auditor agent. It should check code and find faults. Give it access to any filesystem tools we have."
  );
  
  console.log("\n💬 Architect Response:");
  console.log(result.text);
}

run().catch(console.error);
