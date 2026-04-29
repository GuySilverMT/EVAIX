import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { AstTransformer, CodeGenerator } from '@repo/nebula';

/**
 * Nebula Router
 * Handles server-side operations for Nebula UI Builder
 * This keeps Node.js-only dependencies (like TypeScript compiler) on the server
 */
export const nebulaRouter = createTRPCRouter({
  /**
   * Parse JSX/TSX code into a Nebula Tree
   */
  parseJsx: publicProcedure
    .input(
      z.object({
        code: z.string(),
        preservedComponents: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const transformer = new AstTransformer();
      
      if (input.preservedComponents) {
        transformer.setPreservedComponents(input.preservedComponents);
      }
      
      const tree = transformer.parse(input.code);
      return tree;
    }),

  /**
   * Generate JSX/TSX code from a Nebula Tree
   */
  generateCode: publicProcedure
    .input(
      z.object({
        tree: z.any(), // NebulaTree type
      })
    )
    .mutation(async ({ input }) => {
      const generator = new CodeGenerator();
      const code = generator.generate(input.tree);
      return { code };
    }),
});
