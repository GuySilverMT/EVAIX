# Mastra Agents

Agents in Mastra are autonomous entities designed to perform specific tasks. They are model-agnostic and support system instructions, tool execution, and standard chat models.

## Defining an Agent
To define an agent, import `Agent` from `@mastra/core/agent` and instantiate it:

```typescript
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: 'You are a helpful assistant.',
  model: openai('gpt-4o'),
  tools: {
    // Registered tools go here
  }
});
```

## Model Resolution
Use standard AI SDK providers. In EVAIX, we wrap the model with `provider.chat('model-name')` to ensure standard chat completions format.
