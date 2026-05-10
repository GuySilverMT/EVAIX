import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { z } from 'zod';

export const orchestrationManagementRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    return { status: 'stub' };
  })
});
