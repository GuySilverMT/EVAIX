import { ToolDefinition } from '../protocols/LocalProtocol.js';
import { createFsTools } from '../../tools/filesystem.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { browserTools } from '../../tools/browser.js';
import { webScraperTool } from '../../tools/webScraper.js';
// import { complexityTool } from '../../tools/complexityTool.js';
import { terminalTools } from '../../tools/terminal.js';
import { getComponentRegistrySpec } from '../../tools/componentScanner.js';
import { listFilesTree, searchCodebase } from '@repo/mcp-server-vfs';
import { vfsSessionService } from '../vfsSession.service.js';
import { uiArchitectTools } from '../../tools/uiArchitectTools.js';
import { roleArchitectTools } from '../../tools/roleArchitectTools.js';
import { typescriptInterpreterTool } from '../../tools/typescriptInterpreter.js';
import { themeEditorTool } from '../../tools/themeEditor.js';

export function getNativeTools(rootPath: string, fsTools: ReturnType<typeof createFsTools>): ToolDefinition[] {
     return [
         {
             name: themeEditorTool.name,
             handler: themeEditorTool.handler as (args: unknown) => unknown,
             description: themeEditorTool.description,
             input_schema: themeEditorTool.inputSchema as Record<string, unknown>
         },
         // Atomized UI Architect Tools
         ...uiArchitectTools.map(t => ({
             name: t.name,
             handler: t.handler as (args: unknown) => unknown,
             description: t.description,
             input_schema: (t.inputSchema || {}) as Record<string, unknown>
         })),
         // Role Architect Tools
         ...roleArchitectTools.map(t => ({
             name: t.name,
             handler: t.handler as (args: unknown) => unknown,
             description: t.description,
             input_schema: (t.inputSchema || {}) as Record<string, unknown>
         })),
         {
           name: typescriptInterpreterTool.name,
           handler: typescriptInterpreterTool.handler as (args: unknown) => unknown,
           description: typescriptInterpreterTool.description,
           input_schema: typescriptInterpreterTool.inputSchema as Record<string, unknown>
         },
        {
            name: 'read_file',
            handler: async (args: unknown) => fsTools.readFile(args as { path: string }),
            description: 'Read a file',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        },
        {
            name: 'write_file',
            handler: async (args: unknown) => fsTools.writeFile(args as { path: string; content: string }),
            description: 'Write to a file',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    content: { type: 'string' }
                },
                required: ['path', 'content']
            }
        },
        {
            name: 'list_files',
            handler: async (args: unknown) => fsTools.listFiles(args as { path: string }),
            description: 'List files in a directory',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        },
        {
            name: 'browse',
            handler: async (args: unknown) => browserTools.fetchPage(args as { url: string }),
            description: 'Fetch a web page',
            input_schema: {
                type: 'object',
                properties: {
                    url: { type: 'string' }
                },
                required: ['url']
            }
        },
        {
          name: webScraperTool.name,
          handler: async (args: unknown) => webScraperTool.handler(args as { url: string }),
          description: webScraperTool.description,
          input_schema: webScraperTool.input_schema
        },

        {
            name: 'terminal_execute',
            handler: async (args: unknown) => {
                // delegate to the centralized terminal tool implementation
                // Use zod validation instead of casting
                const parsedArgs = terminalTools.execute.inputSchema.parse(args) as { command: string; cwd?: string };
                const handler = terminalTools.execute.handler as (args: { command: string; cwd?: string }) => Promise<unknown>;
                return await handler(parsedArgs);
            },
            description: terminalTools.execute.description,
            input_schema: terminalTools.execute.inputSchema as unknown as Record<string, unknown>
        },
        {
            name: 'search_codebase',
            handler: async (args: unknown) => {
                const typedArgs = args as { query: string };
                const fs = await vfsSessionService.getProvider({ provider: 'local', rootPath: rootPath });
                return searchCodebase(fs, typedArgs.query);
            },
            description: 'Search the codebase for a string',
            input_schema: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                },
                required: ['query']
            }
        },
        {
            name: 'list_files_tree',
            handler: async () => {
                const fs = await vfsSessionService.getProvider({ provider: 'local', rootPath: rootPath });
                return listFilesTree(fs, '/');
            },
            description: 'List files in a tree structure',
            input_schema: {
                type: 'object',
                properties: {},
                required: []
            }
        },
        {
            name: 'scan_ui_components',
            handler: async () => getComponentRegistrySpec(),
            description: 'Returns a list of available UI components and their import paths',
            input_schema: {
                type: 'object',
                properties: {},
                required: []
            }
        },
        {
            name: 'system.context_fetch',
            handler: async (args: unknown) => {
                const { cardId, filePath, lines = 100 } = args as { cardId?: string; filePath?: string; lines?: number };
                if (cardId) {
                    const logPath = path.join(process.cwd(), 'chats', `${cardId}.md`);
                    try {
                        const content = await fs.readFile(logPath, 'utf-8');
                        const logLines = content.split('\n');
                        return logLines.slice(-lines).join('\n');
                    } catch {
                        return "No logs found for this card.";
                    }
                }
                if (filePath) {
                    try {
                        const content = await fs.readFile(path.join(rootPath, filePath), 'utf-8');
                        const fileLines = content.split('\n');
                        return fileLines.slice(-lines).join('\n');
                    } catch {
                        return `Could not read file ${filePath}`;
                    }
                }
                return "Please provide a cardId or filePath.";
            },
            description: 'Fetch the last N lines of context (terminal logs or file content) for a specific card or file.',
            input_schema: {
                type: 'object',
                properties: {
                    cardId: { type: 'string', description: 'The ID of the card to fetch logs from' },
                    filePath: { type: 'string', description: 'Optional: Direct path to a file to tail' },
                    lines: { type: 'number', description: 'Number of lines to fetch (default 100)' }
                }
            }
        }
     ];
}
