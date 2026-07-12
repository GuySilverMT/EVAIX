/**
 * @file tools/filesystem.ts
 * @description Mastra-native wrappers for the .domoreai filesystem tool signatures.
 * Maps 1:1 to operations in .domoreai/tools/filesystem_examples.md.
 *
 * NOTE: execute() receives a ToolExecutionContext — input params are on ctx.context.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as nodePath from 'path';

export const filesystemReadFile = createTool({
  id: 'filesystem_read_file',
  description: 'Reads the entire content of a specified file as UTF-8 text. Accepts absolute paths.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to read.'),
  }),
  execute: async (ctx) => {
    const { path: filePath } = ctx.context;
    const content = await fs.readFile(filePath, 'utf-8');
    return { content, path: filePath };
  },
});

export const filesystemWriteFile = createTool({
  id: 'filesystem_write_file',
  description: 'Writes content to a file. Creates parent directories if missing. Overwrites if exists.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to write.'),
    content: z.string().describe('UTF-8 content to write.'),
  }),
  execute: async (ctx) => {
    const { path: filePath, content } = ctx.context;
    await fs.mkdir(nodePath.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  },
});

export const filesystemListFiles = createTool({
  id: 'filesystem_list_files',
  description: 'Lists files and directories within a directory. Optionally recursive.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the directory to list.'),
    includeNested: z.boolean().optional().default(false),
    maxEntries: z.number().optional().default(50),
  }),
  execute: async (ctx) => {
    const { path: dirPath, includeNested, maxEntries } = ctx.context;
    const entries: string[] = [];
    const limit = maxEntries ?? 50;

    async function walk(dir: string, depth: number) {
      if (entries.length >= limit) return;
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        if (entries.length >= limit) break;
        const full = nodePath.join(dir, item.name);
        entries.push(full);
        if (item.isDirectory() && includeNested && depth < 5) {
          await walk(full, depth + 1);
        }
      }
    }

    await walk(dirPath, 0);
    return { entries, count: entries.length };
  },
});

export const filesystemDeleteFile = createTool({
  id: 'filesystem_delete_file',
  description: 'Deletes a specific file at the given absolute path.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to delete.'),
  }),
  execute: async (ctx) => {
    const { path: filePath } = ctx.context;
    await fs.unlink(filePath);
    return { success: true, path: filePath };
  },
});

export const filesystemCreateDirectory = createTool({
  id: 'filesystem_create_directory',
  description: 'Creates a directory, including any necessary parent directories.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path of the directory to create.'),
    create_parents: z.boolean().optional().default(true),
  }),
  execute: async (ctx) => {
    const { path: dirPath, create_parents } = ctx.context;
    await fs.mkdir(dirPath, { recursive: create_parents ?? true });
    return { success: true, path: dirPath };
  },
});
