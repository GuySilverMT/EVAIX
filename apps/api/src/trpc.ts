import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { prisma } from './db.js';
import { vfsSessionService } from './services/vfsSession.service.js';

/**
 * 1. CONTEXT
 * Defines the "contexts" available in the backend API.
 */
export const createTRPCContext = (opts?: { req?: any; res?: any }) => {
  let auth: { userId: string } | undefined = undefined;

  if (opts?.req?.headers?.authorization) {
    const authHeader = opts.req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      // Basic mock token validation - in real app, verify JWT here
      auth = { userId: 'default-user' };
    }
  }

  return {
    prisma,
    session: null,
    vfsSession: vfsSessionService,
    auth,
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

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' });
  }
  return next({
    ctx: {
      auth: ctx.auth,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);