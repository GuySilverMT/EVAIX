import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc.js';
import { backupService } from '../services/BackupService.js';
import { Surveyor } from '../services/Surveyor.js';
import { providerEventLog } from './providers.router.js';

/**
 * SYSTEM HEALTH ROUTER
 * 
 * Exposes backup and model health services to the UI
 */
export const systemHealthRouter = createTRPCRouter({
  // ===== BACKUP OPERATIONS =====
  
  createBackup: protectedProcedure
    .input(z.object({
      type: z.enum(['manual', 'hourly', 'daily', 'weekly', 'pre-operation']).default('manual'),
      reason: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      return await backupService.createBackup(input.type, input.reason);
    }),

  listBackups: publicProcedure
    .query(async () => {
      return await backupService.listBackups();
    }),

  restoreBackup: protectedProcedure
    .input(z.object({
      filePath: z.string()
    }))
    .mutation(async ({ input }) => {
      return await backupService.restore(input.filePath);
    }),

  // ===== MODEL HEALTH OPERATIONS =====

  getModelHealth: publicProcedure
    .query(async () => {
      // return await persistentModelDoctor.checkHealth();
      return { status: 'healthy', models: [] };
    }),

  healModelsNow: protectedProcedure
    .mutation(async () => {
      // return await persistentModelDoctor.healNow();
      return { healed: 0, failed: 0 };
    }),

  surveyModels: protectedProcedure
    .mutation(async () => {
      return await Surveyor.surveyAll();
    }),

  getDoctorStatus: publicProcedure
    .query(() => {
      // return persistentModelDoctor.getStatus();
      return { healthy: true, issues: [] };
    }),

  getBackupServiceStatus: publicProcedure
    .query(() => {
      return {
        isRunning: true,
        lastBackup: null
      };
    }),

  // ── Observability log ring buffer for the navbar ticker ──────────────────
  // Returns the last `limit` log entries. Frontend polls every 5s.
  // V2 will push these over WebSocket once volume warrants it.
  getLogs: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(({ input }) => {
      const slice = providerEventLog.slice(-input.limit);
      return slice.reverse(); // newest first
    }),
});
