import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';

export const dataRefinementRouter = createTRPCRouter({
  createSnapshot: protectedProcedure
    .input(z.object({ description: z.string().optional() }))
    .mutation(async () => {
      return { id: 'stub-snapshot', timestamp: new Date() };
    }),

  listSnapshots: protectedProcedure.query(async () => {
    return [];
  }),

  saveQuery: protectedProcedure
    .input(z.object({ name: z.string(), query: z.string(), description: z.string().optional() }))
    .mutation(async () => {
      return { success: true };
    }),

  getSavedQueries: protectedProcedure.query(async () => {
    return [];
  }),

  deleteQuery: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async () => {
      return { success: true };
    })
});