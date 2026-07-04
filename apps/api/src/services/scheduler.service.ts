/**
 * @file scheduler.service.ts
 * @description EVAIX Scheduler - JSON-backed event storage + cron execution daemon.
 *
 * Storage: .userData/scheduler.json (flat file, zero-DB)
 * Execution: cron-schedule TimerBasedCronScheduler (lightweight, no polling)
 */

import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { z } from 'zod';
import { parseCronExpression } from 'cron-schedule';
import { TimerBasedCronScheduler } from 'cron-schedule/schedulers/timer-based.js';

/** Matches the ITimerHandle interface from cron-schedule/dist/utils */
interface ITimerHandle {
  timeoutId?: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const SCHEDULER_FILE = path.join(process.cwd(), '.userData', 'scheduler.json');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(), // ISO String
  end: z.string(),   // ISO String
  /** Standard cron expression (optional – calendar-only events omit this) */
  cron: z.string().optional(),
  /** Payload handed off to the AgentRuntime when the cron fires */
  automationPayload: z
    .object({
      agent: z.string(),
      action: z.string(),
      prompt: z.string().optional(),
    })
    .optional(),
});

export type ScheduledJob = z.infer<typeof JobSchema>;

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

/**
 * Read all jobs from disk.  Returns an empty array on first-run or parse error.
 */
export async function getSchedule(): Promise<ScheduledJob[]> {
  try {
    const raw = await fs.readFile(SCHEDULER_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

/**
 * Atomically write the full job list back to disk, then reload the daemon.
 */
export async function saveSchedule(jobs: ScheduledJob[]): Promise<void> {
  await fs.mkdir(path.dirname(SCHEDULER_FILE), { recursive: true });
  await fs.writeFile(SCHEDULER_FILE, JSON.stringify({ jobs }, null, 2), 'utf-8');
  // Reload the daemon so new crons take effect immediately
  await initSchedulerDaemon();
}

/**
 * Upsert a single job (add or replace by id).
 */
export async function upsertJob(job: ScheduledJob): Promise<void> {
  const jobs = await getSchedule();
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) {
    jobs[idx] = job;
  } else {
    jobs.push(job);
  }
  await saveSchedule(jobs);
}

/**
 * Remove a job by id.
 */
export async function deleteJob(jobId: string): Promise<void> {
  const jobs = await getSchedule();
  await saveSchedule(jobs.filter(j => j.id !== jobId));
}

// ---------------------------------------------------------------------------
// Execution daemon
// ---------------------------------------------------------------------------

/** Opaque handle returned by TimerBasedCronScheduler.setInterval */
let activeHandles: ITimerHandle[] = [];

/**
 * (Re-)initialize the cron daemon.
 *
 * - Tears down all existing timers.
 * - Re-reads scheduler.json.
 * - Spawns a new timer for every job that has both `cron` and `automationPayload`.
 *
 * Call on startup and after every write to scheduler.json.
 */
export async function initSchedulerDaemon(): Promise<void> {
  // 1. Clear existing timers
  activeHandles.forEach(h => TimerBasedCronScheduler.clearTimeoutOrInterval(h));
  activeHandles = [];

  const jobs = await getSchedule();
  const automated = jobs.filter(j => j.cron && j.automationPayload);

  if (automated.length === 0) {
    console.log('[EVAIX-SCHEDULER] No automated jobs found. Daemon idle.');
    return;
  }

  for (const job of automated) {
    try {
      const cronExpr = parseCronExpression(job.cron!);

      const handle = TimerBasedCronScheduler.setInterval(
        cronExpr,
        async () => {
          console.log(`[EVAIX-SCHEDULER] ⏰ Triggering job "${job.title}" (${job.id})`);
          try {
            // Dynamic import avoids circular-dependency issues at module-load time
            const { AgentRuntime } = await import('./AgentRuntime.js');
            const runtime = await AgentRuntime.create(
              process.cwd(),
              [],        // no specific tools – agent can JIT-load
              'Worker',
              'HYBRID_AUTO',
              true       // silenceConfirmation
            );

            const payload = job.automationPayload!;
            const prompt = [
              `Agent: ${payload.agent}`,
              `Action: ${payload.action}`,
              payload.prompt ? `Context: ${payload.prompt}` : '',
            ]
              .filter(Boolean)
              .join('\n');

            // runAgentLoop needs an initialResponse; we do a single no-op pass
            await runtime.runAgentLoop(
              prompt,
              prompt,
              async (retryPrompt: string) => retryPrompt,
              1
            );
          } catch (execErr) {
            console.error(`[EVAIX-SCHEDULER] ❌ Job "${job.id}" failed:`, execErr);
          }
        },
        {
          errorHandler: (err: unknown) =>
            console.error(`[EVAIX-SCHEDULER] Cron error for "${job.id}":`, err),
        }
      );

      activeHandles.push(handle);
      console.log(`[EVAIX-SCHEDULER] ✅ Scheduled "${job.title}" → cron(${job.cron})`);
    } catch (parseErr) {
      console.warn(
        `[EVAIX-SCHEDULER] ⚠️ Invalid cron expression for job "${job.id}" (${job.cron}):`,
        parseErr
      );
    }
  }

  console.log(
    `[EVAIX-SCHEDULER] Daemon active. ${activeHandles.length} timer(s) running.`
  );
}

// ---------------------------------------------------------------------------
// File-watcher for hot-reload
// ---------------------------------------------------------------------------

/**
 * Watch scheduler.json for external changes (e.g. manual edits) and
 * automatically reload the daemon.  Called once from index.ts.
 */
export function watchSchedulerFile(): void {
  // Ensure the file and its parent directory exist before watching
  fs.mkdir(path.dirname(SCHEDULER_FILE), { recursive: true })
    .then(() =>
      fs.writeFile(SCHEDULER_FILE, JSON.stringify({ jobs: [] }, null, 2), {
        flag: 'wx', // Create only if it doesn't exist
      })
    )
    .catch(() => {
      /* file already exists – that's fine */
    });

  // Use a debounce to avoid re-triggering on the write we ourselves just made
  let debounceTimer: NodeJS.Timeout | null = null;

  fssync.watch(path.dirname(SCHEDULER_FILE), (_event, filename) => {
    if (filename !== 'scheduler.json') return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log('[EVAIX-SCHEDULER] 🔄 scheduler.json changed – reloading daemon.');
      void initSchedulerDaemon();
    }, 500);
  });

  console.log('[EVAIX-SCHEDULER] 👁️  Watching scheduler.json for changes.');
}
