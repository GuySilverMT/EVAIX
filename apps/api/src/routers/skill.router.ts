import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { SkillFinderService } from '../services/SkillFinderService.js';
import { prisma } from '../db.js';
import yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import { McpToolSyncService } from '../services/McpToolSyncService.js';
import { Prisma } from '@prisma/client';

const t = initTRPC.create();

export const skillRouter = t.router({
  import: t.procedure
    .input(z.object({
      url: z.string(),
      name: z.string(),
      category: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const { url, name, category } = input;
      const service = new SkillFinderService();

      // Step A: Download and install
      const { slug, destinationPath } = await service.downloadAndInstallSkill(url, name);

      // Step B: Create DB Record
      await prisma.mcpServer.upsert({
        where: { name: slug },
        update: {
            command: 'node',
            args: ['run.js'],
            status: 'active'
        },
        create: {
            name: slug,
            command: 'node',
            args: ['run.js'],
            status: 'active'
        }
      });

      // Step C: Sync Server
      const syncResult = await McpToolSyncService.syncServer(slug);

      // Step D: Read SKILL.md and replace tool names
      let skillMdContent = '';
      const skillMdPath = path.join(destinationPath, 'SKILL.md');
      try {
        skillMdContent = await fs.readFile(skillMdPath, 'utf-8');
      } catch (e) {
        console.warn(`Failed to read SKILL.md for ${slug}:`, e);
      }

      // Remove frontmatter to get instructions
      const frontmatterMatch = skillMdContent.match(/---\s*\n([\s\S]*?)\n---/);
      let instructions = skillMdContent;
      if (frontmatterMatch) {
          instructions = skillMdContent.replace(frontmatterMatch[0], '').trim();
      }

      // Replace occurrences of generic tool names if we know them
      if (syncResult.success && syncResult.tools) {
          for (const syncedTool of syncResult.tools) {
             const originalToolName = syncedTool.name.replace(`${slug}_`, '');
             const regex = new RegExp(`\\b${originalToolName}\\b`, 'g');
             instructions = instructions.replace(regex, syncedTool.name);
          }
      }

      // Step E: Upsert Role and connect Tools
      const categoryName = category || 'Imported Skills';
      const roleCategory = await prisma.roleCategory.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName }
      });

      const role = await prisma.role.upsert({
          where: { name: slug },
          update: {
              basePrompt: instructions || `You are an AI assistant using the ${slug} skill.`,
              categoryId: roleCategory.id,
              description: `Imported skill: ${slug}`
          },
          create: {
              name: slug,
              basePrompt: instructions || `You are an AI assistant using the ${slug} skill.`,
              categoryId: roleCategory.id,
              description: `Imported skill: ${slug}`
          }
      });

      // Connect tools via RoleTool
      if (syncResult.success && syncResult.tools) {
          await prisma.roleTool.deleteMany({ where: { roleId: role.id } });
          for (const syncedTool of syncResult.tools) {
             const toolRecord = await prisma.tool.findUnique({ where: { name: syncedTool.name } });
             if (toolRecord) {
                 await prisma.roleTool.create({
                     data: { roleId: role.id, toolId: toolRecord.id }
                 }).catch(e => {
                     console.warn(`Failed to create RoleTool for ${syncedTool.name}:`, e);
                 });
             }
          }
      }

      return role;
    }),
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