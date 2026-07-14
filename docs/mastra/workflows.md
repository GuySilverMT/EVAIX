# Mastra Workflows

Workflows allow chaining actions and agent tasks sequentially or in parallel.

## Creating a Workflow
Workflows are built using steps that specify their inputs, outputs, and dependencies:

```typescript
import { Workflow } from '@mastra/core';

const myWorkflow = new Workflow({
  id: 'my-workflow',
  steps: [
    {
      id: 'step1',
      execute: async () => ({ value: 42 })
    }
  ]
});
```
