/**
 * db.ts — Prisma has been removed.
 *
 * This stub exports a `prisma` object typed as `any` so all existing
 * `import { prisma } from '../db.js'` call-sites compile and start up without
 * crashing during the progressive migration to JSON-file reads.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const makeNoopModel = (name: string) => ({
  findMany:    async (..._args: any[]) => { console.warn(`[db stub] ${name}.findMany — returning []`); return []; },
  findFirst:   async (..._args: any[]) => { console.warn(`[db stub] ${name}.findFirst — returning null`); return null; },
  findUnique:  async (..._args: any[]) => { console.warn(`[db stub] ${name}.findUnique — returning null`); return null; },
  create:      async (..._args: any[]) => { console.warn(`[db stub] ${name}.create — returning {}`); return {}; },
  createMany:  async (..._args: any[]) => { console.warn(`[db stub] ${name}.createMany — returning {count:0}`); return { count: 0 }; },
  update:      async (..._args: any[]) => { console.warn(`[db stub] ${name}.update — returning {}`); return {}; },
  updateMany:  async (..._args: any[]) => { console.warn(`[db stub] ${name}.updateMany — returning {count:0}`); return { count: 0 }; },
  upsert:      async (..._args: any[]) => { console.warn(`[db stub] ${name}.upsert — returning {}`); return {}; },
  delete:      async (..._args: any[]) => { console.warn(`[db stub] ${name}.delete — returning {}`); return {}; },
  deleteMany:  async (..._args: any[]) => { console.warn(`[db stub] ${name}.deleteMany — returning {count:0}`); return { count: 0 }; },
  count:       async (..._args: any[]) => { console.warn(`[db stub] ${name}.count — returning 0`); return 0; },
  aggregate:   async (..._args: any[]) => { console.warn(`[db stub] ${name}.aggregate — returning {}`); return {}; },
  groupBy:     async (..._args: any[]) => { console.warn(`[db stub] ${name}.groupBy — returning []`); return []; },
});

export const prisma: any = {
  $connect:          async () => {},
  $disconnect:       async () => {},
  $transaction:      async (fn: (tx: any) => Promise<any>) => fn(prisma),
  $executeRaw:       async (..._args: any[]) => { console.warn('[db stub] $executeRaw called — no-op'); return 0; },
  $executeRawUnsafe: async (..._args: any[]) => { console.warn('[db stub] $executeRawUnsafe called — no-op'); return 0; },
  $queryRaw:         async (..._args: any[]) => { console.warn('[db stub] $queryRaw called — returning []'); return []; },
  $queryRawUnsafe:   async (..._args: any[]) => { console.warn('[db stub] $queryRawUnsafe called — returning []'); return []; },
  model:              makeNoopModel('model'),
  provider:           makeNoopModel('provider'),
  providerConfig:     makeNoopModel('providerConfig'),
  modelCapabilities:  makeNoopModel('modelCapabilities'),
  agentConfig:        makeNoopModel('agentConfig'),
  role:               makeNoopModel('role'),
  roleVariant:        makeNoopModel('roleVariant'),
  roleCategory:       makeNoopModel('roleCategory'),
  roleTool:           makeNoopModel('roleTool'),
  tool:               makeNoopModel('tool'),
  skill:              makeNoopModel('skill'),
  project:            makeNoopModel('project'),
  workspace:          makeNoopModel('workspace'),
  card:               makeNoopModel('card'),
  workOrderCard:      makeNoopModel('workOrderCard'),
  bookmark:           makeNoopModel('bookmark'),
  fileIndex:          makeNoopModel('fileIndex'),
  usageLog:           makeNoopModel('usageLog'),
  modelUsage:         makeNoopModel('modelUsage'),
  agentRun:           makeNoopModel('agentRun'),
  agentStep:          makeNoopModel('agentStep'),
  mcpServer:          makeNoopModel('mcpServer'),
  mcpTool:            makeNoopModel('mcpTool'),
  vectorChunk:        makeNoopModel('vectorChunk'),
  vectorEmbedding:    makeNoopModel('vectorEmbedding'),
  orchestration:      makeNoopModel('orchestration'),
};

export const db = prisma;
export default prisma;
export async function shutdownDb(): Promise<void> { await prisma.$disconnect(); }
