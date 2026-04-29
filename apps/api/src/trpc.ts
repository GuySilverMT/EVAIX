import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { prisma } from './db.js';
import { vfsSessionService } from './services/vfsSession.service.js';

/**
 * 1. CONTEXT
 * Defines the "contexts" available in the backend API.
 */
export const createTRPCContext = () => {
  return {
    prisma,
    // ✅ FIX: explicit null instead of 'as any'
    session: null, 
    vfsSession: vfsSessionService,
    auth: undefined as { userId: string } | undefined,
  };
};

/**
 * 2. CONTEXT TYPE
 * Infers the type directly from the function above.
 * This ensures the type always matches the implementation.
 */
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * 3. INITIALIZATION
 */
const t = initTRPC.context<Context>().create({ transformer: superjson });

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure.use(async ({ ctx, next }) => {
  return next({
    ctx: {
      ...ctx,
      // Ensure these exist for downstream usage
      auth: ctx.auth,
      vfsSession: ctx.vfsSession,
    },
  });
});
export const protectedProcedure = t.procedure;