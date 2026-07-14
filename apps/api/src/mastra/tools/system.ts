import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CodePatchService } from '../../services/CodePatchService.js';

const execAsync = promisify(exec);

// Helper to resolve workspace root
async function findWorkspaceRoot(): Promise<string> {
  let root = process.cwd();
  while (root !== "/" && !(await fs.stat(path.join(root, "pnpm-workspace.yaml")).catch(() => false))) {
    const parent = path.dirname(root);
    if (parent === root) break;
    root = parent;
  }
  return root;
}

// Helper to resolve path relative to workspace root with boundary check
async function resolvePath(relativePath: string): Promise<string> {
  const root = await findWorkspaceRoot();
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root)) {
    throw new Error(`Access denied: Path '${relativePath}' is outside the allowable workspace boundary.`);
  }
  return resolved;
}

// 1. Read File Tool
export const readFileTool = createTool({
  id: 'read_file',
  description: 'Read the text content of a file in the workspace.',
  inputSchema: z.object({
    path: z.string().describe('The path of the file to read (relative to workspace root), e.g. "apps/api/src/index.ts"')
  }),
  execute: async ({ path: filePath }) => {
    try {
      const fullPath = await resolvePath(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return { success: true, content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});

// 2. Write File Tool
export const writeFileTool = createTool({
  id: 'write_file',
  description: 'Write text content to a new file. Fails if the file already exists (use patch_file to modify existing files).',
  inputSchema: z.object({
    path: z.string().describe('The path of the file to create (relative to workspace root), e.g. "apps/api/src/new-helper.ts"'),
    content: z.string().describe('The content to write to the file.')
  }),
  execute: async ({ path: filePath, content }) => {
    try {
      const fullPath = await resolvePath(filePath);
      try {
        await fs.access(fullPath);
        return { success: false, error: `File '${filePath}' already exists. To modify existing code, you MUST use the patch_file tool instead of write_file.` };
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
      }
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});

// 3. Patch File Tool
export const patchFileTool = createTool({
  id: 'patch_file',
  description: 'Modify an existing file using a robust Find & Replace block mechanism.',
  inputSchema: z.object({
    path: z.string().describe('The path of the file to patch (relative to workspace root)'),
    search_string: z.string().describe('The exact block of code to search for.'),
    replace_string: z.string().describe('The new block of code to replace the search string with.')
  }),
  execute: async ({ path: filePath, search_string, replace_string }) => {
    try {
      const fullPath = await resolvePath(filePath);
      let content = await fs.readFile(fullPath, 'utf-8');

      if (content.includes(search_string)) {
        content = content.replace(search_string, replace_string);
      } else {
        const normalizedContent = content.replace(/\r\n/g, '\n');
        const normalizedSearchLines = search_string.replace(/\r\n/g, '\n').split('\n');
        const contentLines = normalizedContent.split('\n');

        let matchIdx = -1;
        for (let i = 0; i <= contentLines.length - normalizedSearchLines.length; i++) {
          let isMatch = true;
          for (let j = 0; j < normalizedSearchLines.length; j++) {
            if (contentLines[i + j].trim() !== normalizedSearchLines[j].trim()) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            matchIdx = i;
            break;
          }
        }

        if (matchIdx !== -1) {
          const beforeMatch = contentLines.slice(0, matchIdx);
          const afterMatch = contentLines.slice(matchIdx + normalizedSearchLines.length);
          content = [...beforeMatch, replace_string, ...afterMatch].join('\n');
        } else {
          return { success: false, error: `Search string not found in file '${filePath}'. Make sure you are providing the exact block to search for.` };
        }
      }

      await fs.writeFile(fullPath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});

// 4. List Files Tool
export const listFilesTool = createTool({
  id: 'list_files',
  description: 'List directories and files in a directory path.',
  inputSchema: z.object({
    path: z.string().describe('The directory path to list (relative to workspace root), e.g. "apps/api"')
  }),
  execute: async ({ path: dirPath }) => {
    try {
      const fullPath = await resolvePath(dirPath);
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      return {
        success: true,
        files: files.map(f => ({ name: f.name, isDir: f.isDirectory() }))
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});

// 5. Terminal Execute Tool
export const terminalExecuteTool = createTool({
  id: 'terminal_execute',
  description: 'Run a bash command in the project root workspace.',
  inputSchema: z.object({
    command: z.string().describe('The bash command to execute.'),
    cwd: z.string().optional().describe('Optional working directory relative to the workspace root.')
  }),
  execute: async ({ command, cwd }) => {
    const sudoPass = process.env.SUDO_PASS;
    let finalCommand = command;
    const isSudo = command.includes('sudo');

    if (isSudo) {
      if (!sudoPass) {
        return {
          status: 'error',
          stdout: '',
          stderr: 'SUDO_PASS environment variable is not set. Cannot execute sudo command.',
          exitCode: 1
        };
      }
      const strippedCommand = command.replace(/sudo\s+/g, '');
      finalCommand = `echo "${sudoPass}" | sudo -S ${strippedCommand}`;
    }

    const maskPassword = (text: string) => {
      if (!sudoPass) return text;
      return text.split(sudoPass).join('********');
    };

    try {
      const root = await findWorkspaceRoot();
      const targetCwd = cwd ? path.resolve(root, cwd) : root;
      const { stdout, stderr } = await execAsync(finalCommand, { cwd: targetCwd, timeout: 45000 });
      return {
        status: 'success',
        stdout: stdout ? maskPassword(stdout.toString().trim()) : '',
        stderr: stderr ? maskPassword(stderr.toString().trim()) : '',
        exitCode: 0
      };
    } catch (error: any) {
      if (error.signal === 'SIGTERM' || error.killed) {
        return {
          status: 'error',
          stdout: '',
          stderr: 'Process stalled for > 45s (Watchdog). Retrying with npx recommended.',
          exitCode: 124
        };
      }
      return {
        status: 'error',
        stdout: error.stdout ? maskPassword(String(error.stdout).trim()) : '',
        stderr: error.stderr ? maskPassword(String(error.stderr).trim()) : maskPassword(error.message || 'Unknown error'),
        exitCode: typeof error.code === 'number' ? error.code : 1
      };
    }
  }
});

// 6. TypeScript Interpreter Tool
export const typescriptInterpreterTool = createTool({
  id: 'typescript_interpreter',
  description: 'Execute raw TypeScript code inside a safe local sandbox shim. End code with console.log() to return results.',
  inputSchema: z.object({
    code: z.string().describe('The TypeScript code to execute. Must end with console.log() to return data.'),
    timeout: z.number().optional().default(30000).describe('Optional timeout in milliseconds (max 60000)')
  }),
  execute: async ({ code, timeout = 30000 }) => {
    const maxTimeout = Math.min(timeout, 60000);
    const root = await findWorkspaceRoot();
    const tempDir = path.join(root, '.temp', 'ts-interpreter');
    await fs.mkdir(tempDir, { recursive: true });

    const fileName = `agent_${Date.now()}_${Math.random().toString(36).substring(7)}.ts`;
    const filePath = path.join(tempDir, fileName);

    const SAFETY_SHIM = `
const __logs = [];
const __actions = [];
const __tree = { nodes: { root: { id: 'root', children: [] } } };

const nebula = {
  addNode: (parentId, nodeOrFragment) => {
    if (!nebula.getNode(parentId) && parentId !== 'root') {
      throw new Error(\`Parent Node "\${parentId}" does not exist.\`);
    }
    if (nodeOrFragment.type === 'Fragment') {
        __actions.push({ action: 'ingest', parentId, rawJsx: nodeOrFragment.rawJsx });
        return 'fragment_root';
    }
    const id = nodeOrFragment.props?.id || 'node_' + Math.random().toString(36).substr(2, 9);
    __tree.nodes[id] = { id, parentId, ...nodeOrFragment, children: [] };
    if (__tree.nodes[parentId]) __tree.nodes[parentId].children.push(id);
    __actions.push({ action: 'addNode', parentId, node: { ...nodeOrFragment, props: { ...nodeOrFragment.props, id } } });
    return id;
  },
  updateNode: (nodeId, update) => {
    if (!nebula.getNode(nodeId)) throw new Error(\`Node "\${nodeId}" does not exist.\`);
    __actions.push({ action: 'updateNode', nodeId, update });
  },
  moveNode: (nodeId, targetParentId, index) => {
    if (!nebula.getNode(nodeId)) throw new Error(\`Node "\${nodeId}" does not exist.\`);
    __actions.push({ action: 'moveNode', nodeId, targetParentId, index });
  },
  deleteNode: (nodeId) => {
    if (!nebula.getNode(nodeId)) throw new Error(\`Node "\${nodeId}" does not exist.\`);
    __actions.push({ action: 'deleteNode', nodeId });
  },
  setTheme: (theme) => {
    __actions.push({ action: 'setTheme', theme });
  },
  getNode: (id) => __tree.nodes[id]
};

const ast = { parse: (jsx) => ({ type: 'Fragment', rawJsx: jsx }) };
const tree = __tree;

const patch = async (targetFile, findBlock, replaceBlock) => {
  __actions.push({ action: 'patch', targetFile, findBlock, replaceBlock });
};

const console = {
  log: (...args) => {
    __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  },
  error: (...args) => {
    __logs.push("ERROR: " + args.join(' '));
  }
};
`;

    const wrappedCode = `
${SAFETY_SHIM}
try {
  ${code}
} catch (err) {
  console.log("ERROR: " + (err as Error).message);
}
if (__actions.length > 0) {
  process.stdout.write("\\n---NEBULA_RESULT---\\n" + JSON.stringify({ actions: __actions, logs: __logs }) + "\\n");
} else {
  process.stdout.write(__logs.join("\\n"));
}
`;

    try {
      await fs.writeFile(filePath, wrappedCode, 'utf-8');
      const { stdout, stderr } = await execAsync(
        `npx tsx ${filePath}`,
        { 
          timeout: maxTimeout,
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'sandbox' }
        }
      );

      let finalOutput = stdout.trim();
      let resultActions: any[] = [];

      if (stdout.includes('---NEBULA_RESULT---')) {
        const parts = stdout.split('---NEBULA_RESULT---');
        try {
          const structured = JSON.parse(parts[1].trim()) as { actions: any[]; logs: string[] };
          resultActions = structured.actions;
          finalOutput = structured.logs.join('\n');

          for (const action of resultActions) {
            if (action.action === 'patch') {
              try {
                await CodePatchService.ApplyPatch(action.targetFile, action.findBlock, action.replaceBlock);
                finalOutput += `\n✅ Successfully applied patch to ${action.targetFile}`;
              } catch (patchErr: any) {
                finalOutput += `\n❌ Failed to apply patch to ${action.targetFile}: ${patchErr.message}`;
              }
            }
          }
        } catch (e: any) {
          finalOutput += `\nError parsing result: ${e.message}`;
        }
      }

      if (stderr) {
        return { success: false, error: stderr, output: finalOutput };
      }
      return { success: true, output: finalOutput, actions: resultActions };
    } catch (error: any) {
      if (error.killed && error.signal === 'SIGTERM') {
        return { success: false, error: `Execution timeout (${maxTimeout}ms exceeded).` };
      }
      return { success: false, error: error.message, stderr: error.stderr, stdout: error.stdout };
    } finally {
      try {
        await fs.unlink(filePath);
      } catch (_) {}
    }
  }
});
