/**
 * @file schedulerTools.ts
 * @description Agentic tools that give the LLM full CRUD control over the
 * EVAIX calendar and automation schedule.
 *
 * Register these in your agent initialization flow or in the NativeToolsRegistry.
 */

import { z } from 'zod';
import {
  JobSchema,
  getSchedule,
  upsertJob,
  deleteJob,
  initSchedulerDaemon,
  type ScheduledJob,
} from '../services/scheduler.service.js';

// ---------------------------------------------------------------------------
// schedule_agent_job
// ---------------------------------------------------------------------------

export const scheduleAgentJob = {
  name: 'schedule_agent_job',
  description:
    'Adds a new event or automation to the EVAIX weekly calendar. ' +
    'Supply a cron expression and automationPayload to automate agent execution. ' +
    'Omit cron/automationPayload for a plain calendar block.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Unique job ID (use nanoid or UUID)' },
      title: { type: 'string', description: 'Display title shown on the calendar' },
      start: { type: 'string', description: 'ISO 8601 start time' },
      end: { type: 'string', description: 'ISO 8601 end time' },
      cron: {
        type: 'string',
        description: 'Cron expression (e.g. "0 8 * * 5" = every Friday at 8 AM)',
      },
      automationPayload: {
        type: 'object',
        description: 'Agent execution spec (required when cron is set)',
        properties: {
          agent: { type: 'string' },
          action: { type: 'string' },
          prompt: { type: 'string' },
        },
        required: ['agent', 'action'],
      },
    },
    required: ['id', 'title', 'start', 'end'],
  },
  execute: async (input: z.infer<typeof JobSchema>) => {
    const validation = JobSchema.safeParse(input);
    if (!validation.success) {
      return { status: 'error', details: validation.error.flatten() };
    }
    await upsertJob(validation.data);
    return { status: 'success', jobId: validation.data.id };
  },
};

// ---------------------------------------------------------------------------
// list_scheduled_jobs
// ---------------------------------------------------------------------------

export const listScheduledJobs = {
  name: 'list_scheduled_jobs',
  description: 'Returns the full list of calendar events and automations from scheduler.json.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
  execute: async () => {
    const jobs = await getSchedule();
    return { status: 'success', count: jobs.length, jobs };
  },
};

// ---------------------------------------------------------------------------
// delete_scheduled_job
// ---------------------------------------------------------------------------

export const deleteScheduledJob = {
  name: 'delete_scheduled_job',
  description: 'Removes a scheduled event or automation from the EVAIX calendar by its ID.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Job ID to remove' },
    },
    required: ['id'],
  },
  execute: async (input: { id: string }) => {
    await deleteJob(input.id);
    return { status: 'success', deletedId: input.id };
  },
};

// ---------------------------------------------------------------------------
// reload_scheduler_daemon
// ---------------------------------------------------------------------------

export const reloadSchedulerDaemon = {
  name: 'reload_scheduler_daemon',
  description:
    'Forces the cron daemon to reload from scheduler.json. ' +
    'Use after bulk-editing the file directly.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
  execute: async () => {
    await initSchedulerDaemon();
    return { status: 'success', message: 'Scheduler daemon reloaded.' };
  },
};

// ---------------------------------------------------------------------------
// Barrel export for NativeToolsRegistry
// ---------------------------------------------------------------------------

export const schedulerTools = [
  scheduleAgentJob,
  listScheduledJobs,
  deleteScheduledJob,
  reloadSchedulerDaemon,
];
