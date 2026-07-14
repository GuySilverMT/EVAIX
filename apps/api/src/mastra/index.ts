import { Mastra } from '@mastra/core';
import { roleArchitectAgent } from '../services/MastraRoleArchitect.js';

export const mastra = new Mastra({
  agents: {
    roleArchitectAgent,
  },
});
