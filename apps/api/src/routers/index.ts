import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.js';
import { modelRouter } from './model.router.js';
import { dataRefinementRouter } from './dataRefinement.router.js';
import { apiExplorerRouter } from './apiExplorer.router.js';
import { orchestratorRouter } from './orchestrator.router.js';
import { orchestrationManagementRouter } from './orchestrationManagement.router.js';
import { usageRouter } from './usage.router.js';
import { browserRouter } from './browser.router.js';
import { projectRouter } from './project.router.js';
import { contextRouter } from './context.router.js';
import { workspaceRouter } from './workspace.router.js';
import { codeGraphRouter } from './codeGraph.router.js';
import { volcanoRouter } from './volcano.router.js';
import { ingestionRouter } from './ingestion.router.js';
import { agentRouter } from './agent.router.js';
import { systemHealthRouter } from './systemHealth.router.js';
import { toolRouter } from './tool.router.js';
import { schemaRouter } from './schema.router.js';
import { nebulaRouter } from './nebula.router.js';
import { voiceRouter } from './voice.router.js';
import { basetoolRouter } from './basetool.router.js';
import { providerModelRouter } from './providerModel.router.js';
import { bookmarkRouter } from './bookmark.router.js';
import { skillRouter } from './skill.router.js';



export const appRouter = createTRPCRouter({
  agent: agentRouter,
  ingestion: ingestionRouter,
  project: projectRouter,
  codeGraph: codeGraphRouter,
  git: gitRouter,
  providers: providerRouter,
  roles: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  model: modelRouter,
  dataRefinement: dataRefinementRouter,
  apiExplorer: apiExplorerRouter,
  context: contextRouter,
  orchestrator: orchestratorRouter,
  orchestrationManagement: orchestrationManagementRouter,
  usage: usageRouter,
  browser: browserRouter,
  workspace: workspaceRouter,
  volcano: volcanoRouter,
  systemHealth: systemHealthRouter,
  tool: toolRouter,
  schema: schemaRouter,
  nebula: nebulaRouter,
  voice: voiceRouter,
  basetool: basetoolRouter,
  providerModel: providerModelRouter,
  bookmark: bookmarkRouter,

});

export type AppRouter = typeof appRouter;