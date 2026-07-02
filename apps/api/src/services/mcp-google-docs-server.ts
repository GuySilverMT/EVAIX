import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs/promises';
import * as path from 'path';

// Direct Flat-File/VFS-backed streaming protocol for document operations
const server = new Server(
  {
    name: "google-docs",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const DOCS_DIR = path.join(process.cwd(), '.evaix', 'documents');

async function ensureDocsDir() {
  try {
    await fs.mkdir(DOCS_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "readDocument",
        description: "Pull doc text directly into your context window as zero-padded plain text or raw markdown.",
        inputSchema: {
          type: "object",
          properties: {
            filename: { type: "string" },
          },
          required: ["filename"],
        },
      },
      {
        name: "createDocument",
        description: "Create a new document.",
        inputSchema: {
          type: "object",
          properties: {
            filename: { type: "string" },
            text: { type: "string" },
          },
          required: ["filename", "text"],
        },
      },
      {
        name: "modifyText",
        description: "Perform direct text manipulation by replacing text.",
        inputSchema: {
          type: "object",
          properties: {
            filename: { type: "string" },
            search: { type: "string" },
            replace: { type: "string" },
          },
          required: ["filename", "search", "replace"],
        },
      },
      {
        name: "listDocuments",
        description: "List all documents.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await ensureDocsDir();
  
  if (request.params.name === "readDocument") {
    const filename = String(request.params.arguments?.filename);
    const filePath = path.join(DOCS_DIR, filename);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{ type: "text", text: content }],
      };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error reading file: ${err.message}` }], isError: true };
    }
  }

  if (request.params.name === "createDocument") {
    const filename = String(request.params.arguments?.filename);
    const text = String(request.params.arguments?.text);
    const filePath = path.join(DOCS_DIR, filename);
    try {
      await fs.writeFile(filePath, text, 'utf-8');
      return {
        content: [{ type: "text", text: `Document created at ${filename}` }],
      };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error creating file: ${err.message}` }], isError: true };
    }
  }

  if (request.params.name === "modifyText") {
    const filename = String(request.params.arguments?.filename);
    const search = String(request.params.arguments?.search);
    const replace = String(request.params.arguments?.replace);
    const filePath = path.join(DOCS_DIR, filename);
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      content = content.replace(search, replace);
      await fs.writeFile(filePath, content, 'utf-8');
      return {
        content: [{ type: "text", text: `Document modified successfully.` }],
      };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error modifying file: ${err.message}` }], isError: true };
    }
  }
  
  if (request.params.name === "listDocuments") {
      try {
          const files = await fs.readdir(DOCS_DIR);
          return {
              content: [{ type: "text", text: JSON.stringify(files) }]
          }
      } catch (err: any) {
          return { content: [{ type: "text", text: `Error listing files: ${err.message}` }], isError: true };
      }
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
