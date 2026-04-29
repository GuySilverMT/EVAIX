import { prisma } from '../db.js';
import { createVolcanoAgent } from './VolcanoAgent.js';
import { Job } from '@prisma/client';

export class JobScheduler {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs: number = 5000) {
    if (this.isRunning) return;
    console.log('[CEO] Starting Corporate Heartbeat...');
    this.isRunning = true;
    this.interval = setInterval(() => this.cycle(), intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.isRunning = false;
  }

  private async cycle() {
    try {
      const pendingJobs = await prisma.job.findMany({
        where: { status: 'not_started' },
        take: 5
      });

      for (const job of pendingJobs) {
        // Check if job has a dependency
        // dependsOnJobId removed
        // if (job.dependsOnJobId) ...

        console.log(`[JobScheduler] 🟢 Starting Job: ${job.id}`);
        await this.executeJob(job);
      }

    } catch (error: any) {
        // Handle "relation does not exist" - likely not needed with Prisma as it throws different codes,
        // but keeping safe catch.
      console.error('[JobScheduler] 🔴 Cycle Error:', error);
    }
  }

  private async executeJob(job: Job) {
    await prisma.job.update({
        where: { id: job.id },
        data: {
            status: 'in_progress',
            startedAt: new Date()
        }
    });

    try {
      const agent = await createVolcanoAgent({
        roleId: job.roleId || 'general_worker',
        modelId: null,
        isLocked: false,
        temperature: 0.7,
        maxTokens: 4096,
        userGoal: job.description || ''
      });

      // generate() returns result string? Agent methods vary.
      // createVolcanoAgent returns an Agent interface.
      const result = await agent.generate(job.description || '');

      await prisma.job.update({
        where: { id: job.id },
        data: {
            status: 'completed',
            completedAt: new Date(),
            output: (typeof result === 'object' ? result : { text: result }) as any
        }
      });

      console.log(`[JobScheduler] ✅ Job Completed: ${job.id}`);

    } catch (error) {
      console.error(`[JobScheduler] ❌ Job Failed: ${job.id}`, error);
      await prisma.job.update({
        where: { id: job.id },
        data: {
            status: 'failed',
            completedAt: new Date(),
            // logs: ... could append error
        }
      });
    }
  }
}

export const scheduler = new JobScheduler();
