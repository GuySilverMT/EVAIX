import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { SkillFinderService } from '../services/SkillFinderService.js';
import { prisma } from '../db.js';
import yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

const t = initTRPC.create();

export const skillRouter = t.router({
  import: t.procedure
    .input(z.object({
      url:
  search: t.procedure
    .input(z.object({
      query: z.string(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      const service = new SkillFinderService();
      return service.searchSkills(input.query, input.limit);
    }),
});