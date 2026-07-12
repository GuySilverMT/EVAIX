/**
 * @file tools/git.ts
 * @description Mastra-native wrappers for the .domoreai git tool signatures.
 * Maps to .domoreai/tools/git_examples.md. Uses Node child_process — no new server.
 *
 * NOTE: execute() receives a ToolExecutionContext — input params are on ctx.context.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(execFile);

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout, stderr } = await execAsync('git', args, { cwd });
  return (stdout + stderr).trim();
}

export const gitStatus = createTool({
  id: 'git_status',
  description: 'Returns the git status of a repository at the given absolute path.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
  }),
  execute: async (ctx) => {
    const { path } = ctx.context;
    const output = await git(['status', '--short'], path);
    return { output, path };
  },
});

export const gitAdd = createTool({
  id: 'git_add',
  description: 'Stages files in a git repository for commit. Use ["."] to stage all.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    files: z.array(z.string()).describe('List of file paths to stage.'),
  }),
  execute: async (ctx) => {
    const { path, files } = ctx.context;
    const output = await git(['add', ...files], path);
    return { output, path, files };
  },
});

export const gitCommit = createTool({
  id: 'git_commit',
  description: 'Creates a git commit with a message in the specified repository.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    message: z.string().describe('The commit message.'),
  }),
  execute: async (ctx) => {
    const { path, message } = ctx.context;
    const output = await git(['commit', '-m', message], path);
    return { output, path };
  },
});

export const gitBranchList = createTool({
  id: 'git_branch_list',
  description: 'Lists all local and remote branches in the repository.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
  }),
  execute: async (ctx) => {
    const { path } = ctx.context;
    const output = await git(['branch', '-a'], path);
    return { output, path };
  },
});

export const gitDiff = createTool({
  id: 'git_diff',
  description: 'Shows the diff of unstaged or staged changes in the repository.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the git repository.'),
    staged: z.boolean().optional().default(false).describe('If true, show staged diff.'),
  }),
  execute: async (ctx) => {
    const { path, staged } = ctx.context;
    const args = staged ? ['diff', '--cached'] : ['diff'];
    const output = await git(args, path);
    return { output, path };
  },
});
