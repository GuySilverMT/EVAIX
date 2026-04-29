import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import type { SandboxTool } from '../types.js';

const execAsync = promisify(exec);

/**
 * TypeScript Interpreter Tool
 * Allows agents to write and execute TypeScript code safely
 * 
 * SECURITY WARNING: In production, this should run inside a Docker container
 * or Firecracker microVM to prevent malicious code execution.
 */
export const typescriptInterpreterTool: SandboxTool = {
  name: 'typescript_interpreter',
  description: `Execute raw TypeScript code. 
    
    NEBULA CODE MODE v2.0:
    In UI-related roles, you have access to specialized globals:
    - nebula: { addNode(p,n), updateNode(id,u), moveNode(...), deleteNode(id) }
    - ast: { parse(jsx) -> returns fragment }
    - tree: Read-only access to current state
    
    RULES:
    1. Code must end with console.log() to return data
    2. nebula.addNode RETURNS an ID. You MUST capture it.
    3. Use this for calculations or complex UI construction logic.`,
  
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The TypeScript code to execute. Must end with console.log() to return data.',
      },
      timeout: {
        type: 'number',
        description: 'Optional timeout in milliseconds (default: 30000, max: 60000)',
        default: 30000,
      },
    },
    required: ['code'],
  },
  
  handler: async (args: Record<string, unknown>) => {
    const { code, timeout = 30000 } = args as { code: string; timeout?: number };
    const maxTimeout = Math.min(timeout, 60000); // Cap at 60 seconds
    
    // Create a unique temporary file
    const tempDir = path.join(process.cwd(), '.temp', 'ts-interpreter');
    await fs.mkdir(tempDir, { recursive: true });
    
    const fileName = `agent_${Date.now()}_${Math.random().toString(36).substring(7)}.ts`;
    const filePath = path.join(tempDir, fileName);
    
    const SAFETY_SHIM = `
/** 🧠 Nebula Code Mode v2.0 Safety Shim **/
const __logs = [];
const __actions = [];
const __tree = { nodes: { root: { id: 'root', children: [] } } };

// 1. Wrap the Nebula Instance to catch invalid IDs
const nebula = {
  addNode: (parentId, nodeOrFragment) => {
    if (!nebula.getNode(parentId) && parentId !== 'root') {
      throw new Error(\`❌ Safety Check Failed: Parent Node "\${parentId}" does not exist. Did you forget to capture the ID from a previous addNode() call?\`);
    }
    
    // Handle both single nodes and fragments (from ast.parse)
    if (nodeOrFragment.type === 'Fragment') {
        __actions.push({ action: 'ingest', parentId, rawJsx: nodeOrFragment.rawJsx });
        return 'fragment_root'; // Placeholder as fragments usually have multiple roots or managed IDs
    }

    const id = nodeOrFragment.props?.id || 'node_' + Math.random().toString(36).substr(2, 9);
    __tree.nodes[id] = { id, parentId, ...nodeOrFragment, children: [] };
    if (__tree.nodes[parentId]) __tree.nodes[parentId].children.push(id);
    
    __actions.push({ action: 'addNode', parentId, node: { ...nodeOrFragment, props: { ...nodeOrFragment.props, id } } });
    return id;
  },
  updateNode: (nodeId, update) => {
    if (!nebula.getNode(nodeId)) {
      throw new Error(\`❌ Safety Check Failed: Node "\${nodeId}" does not exist. Update failed.\`);
    }
    __actions.push({ action: 'updateNode', nodeId, update });
  },
  moveNode: (nodeId, targetParentId, index) => {
    if (!nebula.getNode(nodeId)) throw new Error(\`❌ Safety Check Failed: Node "\${nodeId}" does not exist.\`);
    __actions.push({ action: 'moveNode', nodeId, targetParentId, index });
  },
  deleteNode: (nodeId) => {
    if (!nebula.getNode(nodeId)) throw new Error(\`❌ Safety Check Failed: Node "\${nodeId}" does not exist.\`);
    __actions.push({ action: 'deleteNode', nodeId });
  },
  setTheme: (theme) => {
    __actions.push({ action: 'setTheme', theme });
  },
  getNode: (id) => __tree.nodes[id]
};

const ast = {
  parse: (jsx) => ({ type: 'Fragment', rawJsx: jsx })
};

const tree = __tree; // Read-only access

// 2. Add a "Log" helper so the agent "sees" what it did
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

// Output final result for processing
if (__actions.length > 0) {
  process.stdout.write("\\n---NEBULA_RESULT---\\n" + JSON.stringify({ actions: __actions, logs: __logs }) + "\\n");
} else {
  process.stdout.write(__logs.join("\\n"));
}
`;

    try {
      // Write the wrapped code to a temporary file
      await fs.writeFile(filePath, wrappedCode, 'utf-8');
      
      process.stdout.write(`[TypeScriptInterpreter] Executing: ${fileName}\n`);
      
      // Execute using tsx with timeout
      const { stdout, stderr } = await execAsync(
        `npx tsx ${filePath}`,
        { 
          timeout: maxTimeout,
          cwd: tempDir,
          env: {
            ...process.env,
            NODE_ENV: 'sandbox',
          }
        }
      );
      
      let finalOutput = stdout.trim();
      let resultActions: unknown[] = [];

      // Check if we have a structured Nebula result
      if (stdout.includes('---NEBULA_RESULT---')) {
        const parts = stdout.split('---NEBULA_RESULT---');
        try {
          const structured = JSON.parse(parts[1].trim()) as { actions: unknown[]; logs: string[] };
          resultActions = structured.actions;
          finalOutput = structured.logs.join('\\n');
        } catch (e) {
          process.stdout.write(`[TypeScriptInterpreter] Failed to parse Nebula result: ${(e as Error).message}\n`);
        }
      }

      // If tsx wrote to stderr, it's an error (e.g., syntax error)
      if (stderr) {
        return [{
          type: 'text',
          text: `❌ Execution Error:\n\nEncountered errors during execution.\n\nStderr: ${stderr}\nStdout: ${finalOutput}`,
        }];
      }

      return [{
        type: 'text',
        text: `✅ Code executed successfully.\n\nOutput:\n${finalOutput}`,
        // Provide the actions back for the runtime to handle if needed
        // In this architecture, we might need to return them as part of the tool result
        meta: resultActions.length > 0 ? { nebula_actions: resultActions } : undefined
      }];
      
    } catch (error: unknown) {
      const execError = error as { message: string; stderr?: string; stdout?: string; killed?: boolean; signal?: string };
      process.stdout.write(`[TypeScriptInterpreter] Execution failed: ${execError.message}\n`);
      
      // Handle timeout
      if (execError.killed && execError.signal === 'SIGTERM') {
        return [{
          type: 'text',
          text: `❌ Execution timeout (${maxTimeout}ms exceeded).\n\nThe code took too long to execute. Consider breaking it into smaller steps.`,
        }];
      }
      
      // Handle execution errors
      return [{
        type: 'text',
        text: `❌ Execution Error:\n\n${execError.message}\n\nStderr: ${execError.stderr || 'N/A'}\nStdout: ${execError.stdout || 'N/A'}`,
      }];
      
    } finally {
      // Cleanup: Delete the temporary file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        process.stdout.write(`[TypeScriptInterpreter] Failed to cleanup ${fileName}: ${(cleanupError as Error).message}\n`);
      }
    }
  },
};

/**
 * Check if a role has permission to use the TypeScript interpreter
 * This is a powerful tool and should only be granted to trusted roles
 */
export async function canUseTypeScriptInterpreter(roleId: string): Promise<boolean> {
  const { prisma } = await import('../db.js');
  
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { tools: { include: { tool: true } } },
  });
  
  // TypeScript interpreter is available if the role includes 'typescript_interpreter' in its tools array
  return role?.tools.some(rt => rt.tool.name === 'typescript_interpreter') || false;
}
