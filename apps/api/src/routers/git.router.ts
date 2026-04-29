import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';

import { simpleGit } from 'simple-git';

const git = simpleGit();

export const gitRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    try {
        const status = await git.status();
        const branch = await git.branch();
        return { 
            branch: branch.current, 
            clean: status.isClean(),
            files: status.files
        };
    } catch (e) {
        console.error("Git Status Error", e);
        return { branch: 'unknown', clean: false, error: (e as Error).message };
    }
  }),

  commit: protectedProcedure
    .input(z.object({ message: z.string(), files: z.array(z.string()).optional() }))
    .mutation(async ({ input }) => {
      try {
          if (input.files && input.files.length > 0) {
              await git.add(input.files);
          } else {
              await git.add('.');
          }
          const result = await git.commit(input.message);
          return { hash: result.commit, summary: result.summary };
      } catch (e) {
          throw new Error(`Commit Failed: ${(e as Error).message}`);
      }
    }),
    
  log: protectedProcedure
    .input(z.object({ file: z.string().optional(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
         const options = [
             '--max-count', String(input.limit),
             ...(input.file ? [input.file] : [])
         ];
         const log = await git.log(options);
         return log.all;
    })
});
