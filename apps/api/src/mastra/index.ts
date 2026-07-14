import { Mastra } from '@mastra/core';
import { deepResearchAnalyst } from './agents/deep-research-analyst.js';

export const mastra = new Mastra({
  agents: {
    deepResearchAnalyst,
  },
});
