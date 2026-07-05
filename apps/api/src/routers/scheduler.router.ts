/**
 * @file scheduler.router.ts
 * @description tRPC + REST router for the EVAIX Scheduler.
 *
 * REST endpoints (consumed by the UI Scheduler component):
 *   GET  /api/scheduler          – list all jobs
 *   POST /api/scheduler          – create / upsert a job
 *   DELETE /api/scheduler/:id    – remove a job
 *
 * tRPC procedures (for internal agent/tool use):
 *   scheduler.list
 *   scheduler.upsert
 *   scheduler.delete
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { JobSchema, getSchedule, upsertJob, deleteJob } from '../services/scheduler.service.js';

// ---------------------------------------------------------------------------
// tRPC Router
// ---------------------------------------------------------------------------

export const schedulerRouter = createTRPCRouter({
  /** List all scheduled jobs */
  list: publicProcedure.query(async () => {
    return getSchedule();
  }),

  /** Create or update a job */
  upsert: publicProcedure
    .input(JobSchema)
    .mutation(async ({ input }) => {
      await upsertJob(input);
      return { status: 'ok', id: input.id };
    }),

  /** Delete a job by id */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteJob(input.id);
      return { status: 'ok' };
    }),
});

// ---------------------------------------------------------------------------
// Express REST handler factory
// ---------------------------------------------------------------------------
// Called from index.ts to mount plain REST routes alongside tRPC.

import type { Express } from 'express';

export function mountSchedulerRestRoutes(app: Express): void {
  /** GET /api/scheduler */
  app.get('/api/scheduler', async (_req, res) => {
    try {
      const jobs = await getSchedule();
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/scheduler – body: ScheduledJob */
  app.post('/api/scheduler', async (req, res) => {
    try {
      const parsed = JobSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid job schema', details: parsed.error.flatten() });
      }
      await upsertJob(parsed.data);
      res.json({ status: 'ok', id: parsed.data.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** DELETE /api/scheduler/:id */
  app.delete('/api/scheduler/:id', async (req, res) => {
    try {
      await deleteJob(req.params.id);
      res.json({ status: 'ok' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
