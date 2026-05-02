import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.js';
import { modelRouter } from './model.router.js';
import { dataRefinementRouter } from './dataRefinement.router.js';
import { usageRouter } from './usage.router.js';
import { contextRouter } from './context.router.js';
import { codeGraphRouter } from './codeGraph.router.js';
import { volcanoRouter } from './volcano.router.js';
import { ingestionRouter } from './ingestion.router.js';
import { agentRouter } from './agent.router.js';
import { systemHealthRouter } from './systemHealth.router.js';
import { toolRouter } from './tool.router.js';
import { schemaRouter } from './schema.router.js';
import { basetoolRouter } from './basetool.router.js';
import { providerModelRouter } from './providerModel.router.js';
import { skillRouter } from './skill.router.js';



export const appRouter = createTRPCRouter({
  agent: agentRouter,
  ingestion: ingestionRouter,
  codeGraph: codeGraphRouter,
  git: gitRouter,
  providers: providerRouter,
  roles: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  model: modelRouter,
  dataRefinement: dataRefinementRouter,
  context: contextRouter,
  usage: usageRouter,
  volcano: volcanoRouter,
  systemHealth: systemHealthRouter,
  tool: toolRouter,
  schema: schemaRouter,
  basetool: basetoolRouter,
  providerModel: providerModelRouter,
  skill: skillRouter,

});

export type AppRouter = typeof appRouter;