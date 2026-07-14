import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { AVAILABLE_MASTRA_TOOLS, MCP_TOOL_SCHEMAS } from '../mcp-server.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { fileURLToPath } from 'node:url';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APPS_API_ROOT = path.join(__dirname, '../../../');

export async function syncOpenWebUIBridge() {
  console.log('[PythonBridge] Starting generation of EVAIX bridge...');

  const toolsToInject: any[] = [];

  const formatTitle = (str: string) => {
    return str
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // 1. Generate Primitive Tools
  for (const [toolId, tool] of Object.entries(AVAILABLE_MASTRA_TOOLS)) {
    const safeName = toolId.replace(/[^a-zA-Z0-9_]/g, '_');
    const toolTitle = `EVAIX Tool: ${formatTitle(toolId)}`;
    const dbId = `evaix_tool_${toolId}`;

    const zodSchema = MCP_TOOL_SCHEMAS[toolId];
    let specParams = { type: 'object', properties: {}, required: [] };
    let pythonParams = 'self';
    let kwargsBuilder = '{}';

    if (zodSchema) {
      const jsonSchema: any = zodToJsonSchema(zodSchema);
      specParams = {
        type: 'object',
        properties: jsonSchema.properties || {},
        required: jsonSchema.required || []
      };

      const keys = Object.keys(jsonSchema.properties || {});
      if (keys.length > 0) {
        pythonParams = 'self, ' + keys.map(k => `${k}: str = ""`).join(', ');
        kwargsBuilder = '{' + keys.map(k => `"${k}": ${k}`).join(', ') + '}';
      }
    }

    const spec = {
      name: safeName,
      description: tool.description || `Execute ${toolId} primitive tool.`,
      parameters: specParams
    };

    const pythonCode = `"""
title: ${toolTitle}
author: EVAIX System
version: 1.0.0
"""
import requests
import json

class Tools:
    def __init__(self):
        self.base_url = "http://host.docker.internal:4000/api/v1/bridge/invoke"

    def ${safeName}(${pythonParams}) -> str:
        """
        ${tool.description || `Execute ${toolId} primitive tool.`}
        """
        try:
            parsed_args = ${kwargsBuilder}
            res = requests.post(self.base_url, json={"action_type": "tool", "id": "${toolId}", "args": parsed_args})
            return res.json().get("result", str(res.text))
        except Exception as e:
            return f"Error: {e}"
`;

    toolsToInject.push({
      id: dbId,
      name: toolTitle,
      content: pythonCode,
      specs: JSON.stringify([spec]),
      description: tool.description || `Execute ${toolId} primitive tool.`
    });
  }

  // 2. Role Architect Agent — hardcoded MCP tool (TypeScript Mastra agent, not .md-based)
  // Calls the ask_role_architect tool registered directly in mcp-server.ts via StreamableHTTP.
  const roleArchitectSpec = {
    name: 'ask_role_architect',
    description: 'Ask the EVAIX Role Architect to design or scaffold a new AI agent role. Describe the agent you want and it will generate and register the .md configuration automatically.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'A description of the agent role to create, e.g. "Create a SQL query assistant that can read and explain database schemas."'
        }
      },
      required: ['prompt']
    }
  };

  const roleArchitectPython = `"""
title: EVAIX Agent: Role Architect
author: EVAIX System
version: 2.0.0
"""
import requests
import json

class Tools:
    def __init__(self):
        self.base_url = "http://host.docker.internal:4000/api/v1/bridge/invoke"

    def ask_role_architect(self, prompt: str, __event__: dict = None) -> str:
        """
        Ask the EVAIX Role Architect to design and scaffold a new AI agent role.
        The architect will research existing patterns, draft the role configuration,
        and write the .md file which auto-registers in OpenWebUI within ~300ms.
        :param prompt: A description of the agent role to create or modify.
        """
        try:
            model_id = __event__.get("model", "") if __event__ else ""
            res = requests.post(
                self.base_url,
                json={"action_type": "architect", "prompt": prompt, "model": model_id},
                timeout=120
            )
            data = res.json()
            return data.get("result", str(res.text))
        except Exception as e:
            return f"Error: {e}"
`;

  toolsToInject.push({
    id: 'evaix_agent_role_architect',
    name: 'EVAIX Agent: Role Architect',
    content: roleArchitectPython,
    specs: JSON.stringify([roleArchitectSpec]),
    description: roleArchitectSpec.description
  });

  // 3. Dynamic Agent Tools — auto-registered from apps/api/data/agents/*.md
  // Populated at runtime by the FileWatcher as agents are created by the Role Architect.
  const agentsDir = path.join(APPS_API_ROOT, 'data/agents');
  let agentFiles: string[] = [];
  try {
    agentFiles = await fs.readdir(agentsDir);
  } catch (e) { /* ignore if dir doesn't exist yet */ }

  for (const file of agentFiles) {
    if (!file.endsWith('.md') && !file.endsWith('.json')) continue;

    const id = file.replace('.md', '').replace('.json', '').toLowerCase().replace(/[^a-z0-9-_]/g, '_');
    let name = id.split(/[_-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let description = `Invoke the ${name} agent.`;

    try {
      const raw = await fs.readFile(path.join(agentsDir, file), 'utf-8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const fm = JSON.parse(JSON.stringify({ parsed: match[1] })); // avoid yaml dep
        const nameMatch = match[1].match(/^name:\s*(.+)$/m);
        if (nameMatch) name = nameMatch[1].trim();
        const instrIdx = raw.indexOf('---', 3);
        if (instrIdx !== -1) {
          const body = raw.slice(instrIdx + 3).trim();
          if (body) description = body.slice(0, 150).replace(/\n/g, ' ') + '...';
        }
      }
    } catch (e) { /* ignore read errors */ }

    const safeName = `invoke_${id.replace(/-/g, '_')}`;
    const toolTitle = `EVAIX Agent: ${name}`;
    const dbId = `evaix_agent_${id}`;

    const spec = {
      name: safeName,
      description,
      parameters: {
        type: 'object',
        properties: { prompt: { type: 'string', description: 'The task or question for the agent.' } },
        required: ['prompt']
      }
    };

    const pythonCode = `"""
title: ${toolTitle}
author: EVAIX System
version: 1.0.0
"""
import requests
import json

class Tools:
    def __init__(self):
        self.base_url = "http://host.docker.internal:4000/api/v1/bridge/invoke"

    def ${safeName}(self, prompt: str, __event__: dict = None) -> str:
        """
        ${description}
        :param prompt: The task or question.
        """
        try:
            model_id = __event__.get("model", "") if __event__ else ""
            res = requests.post(self.base_url, json={"action_type": "agent", "id": "${id}", "prompt": prompt, "model": model_id})
            return res.json().get("result", str(res.text))
        except Exception as e:
            return f"Error: {e}"
`;

    toolsToInject.push({
      id: dbId,
      name: toolTitle,
      content: pythonCode,
      specs: JSON.stringify([spec]),
      description
    });
  }

  // Inject into SQLite
  const dbPath = '/home/guy/.local/share/containers/storage/volumes/evaix_openwebui_data/_data/webui.db';

  const toolsJsonPath = path.join(APPS_API_ROOT, '.tmp_tools_to_inject.json');
  await fs.writeFile(toolsJsonPath, JSON.stringify(toolsToInject), 'utf-8');

  const injectScript = `
import sqlite3
import time
import json
import sys

db_path = "${dbPath}"
tools_json_path = "${toolsJsonPath}"

with open(tools_json_path, "r", encoding="utf-8") as f:
    tools = json.load(f)

now = int(time.time())

conn = sqlite3.connect(db_path)
c = conn.cursor()

valid_ids = [t['id'] for t in tools]
valid_ids.append('dummy_to_keep_list_non_empty')

placeholders = ','.join('?' for _ in valid_ids)
c.execute(f"DELETE FROM tool WHERE (id LIKE 'evaix_%' OR id = 'evaix_bridge') AND id NOT IN ({placeholders})", valid_ids)

for t in tools:
    tool_id = t['id']
    name = t['name']
    content = t['content']
    specs = t['specs']
    meta = json.dumps({"description": t['description'], "name": name})

    c.execute("SELECT id FROM tool WHERE id = ?", (tool_id,))
    if c.fetchone():
        c.execute("UPDATE tool SET content = ?, specs = ?, meta = ?, updated_at = ? WHERE id = ?", 
                  (content, specs, meta, now, tool_id))
    else:
        c.execute("INSERT INTO tool (id, user_id, name, content, specs, meta, valves, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  (tool_id, '', name, content, specs, meta, '{}', now, now))

conn.commit()
conn.close()
print(f"Successfully synced {len(tools)} individual tools into OpenWebUI.")
`;

  const scriptPath = path.join(APPS_API_ROOT, '.tmp_inject.py');
  await fs.writeFile(scriptPath, injectScript, 'utf-8');

  try {
    const { stdout } = await execPromise(`python3 ${scriptPath}`);
    console.log(`[PythonBridge] ✅ ${stdout.trim()}`);
  } catch (err: any) {
    console.error('[PythonBridge] ❌ Failed to inject tools into SQLite:', err.message);
  } finally {
    // Cleanup
    await fs.unlink(scriptPath).catch(() => { });
    await fs.unlink(toolsJsonPath).catch(() => { });
  }
}
