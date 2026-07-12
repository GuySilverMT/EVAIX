import { Mastra } from '@mastra/core';
import { roleArchitect } from './agents/role-architect.js';

export const mastra = new Mastra({
  agents: {
    roleArchitect,
  },
});
