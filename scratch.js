import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';

const liteLlmProvider = createOpenAI({
  baseURL: process.env.LITELLM_API_BASE || 'http://localhost:8080/v1',
  apiKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-key',
});

const agent = new Agent({
  id: "test",
  name: "Test",
  instructions: "You are a planning agent. Make a plan.",
  model: liteLlmProvider.chat("openrouter/minimax/minimax-m2.5")
});

async function run() {
  console.log("Running...");
  const res = await agent.generate("test");
  console.log("Response text:", res.text);
}
run().catch(console.error);
