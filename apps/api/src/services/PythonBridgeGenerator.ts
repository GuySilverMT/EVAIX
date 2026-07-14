import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { AVAILABLE_MASTRA_TOOLS } from '../mcp-server.js';
import yaml from 'js-yaml';

const execPromise = promisify(exec);

export async function syncOpenWebUIBridge() {
  console.log('[PythonBridge] Starting generation of EVAIX bridge...');
  
  const agentsDir = path.join(process.cwd(), 'apps/api/data/agents');
  let agentFiles: string[] = [];
  try {
    agentFiles = await fs.readdir(agentsDir);
  } catch (e) {
    // ignore
  }

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

    const spec = {
      name: safeName,
      description: tool.description || `Execute ${toolId} primitive tool.`,
      parameters: {
        type: "object",
        properties: {
          args: {
            type: "string",
            description: "JSON string containing all arguments required for the tool."
          }
        },
        required: ["args"]
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

    def ${safeName}(self, args: str) -> str:
        """
        ${tool.description || `Execute ${toolId} primitive tool.`}
        :param args: JSON string of arguments.
        """
        try:
            parsed_args = json.loads(args) if isinstance(args, str) else args
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

  // 2. Generate Agent Tools
  for (const file of agentFiles) {
    if (!file.endsWith('.md') && !file.endsWith('.json')) continue;
    
    const id = file.replace('.md', '').replace('.json', '').toLowerCase().replace(/[^a-z0-9-_]/g, '_');
    let name = formatTitle(id);
    let description = `Invoke the ${id} agent.`;

    const content = await fs.readFile(path.join(agentsDir, file), 'utf-8');
    if (file.endsWith('.md')) {
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        try {
          const frontmatter = yaml.load(match[1]) as any;
          name = frontmatter.name || name;
          if (frontmatter.instructions) description = frontmatter.instructions.slice(0, 150).replace(/\n/g, ' ') + '...';
        } catch(e){}
      }
    }

    const safeName = `invoke_${id}`;
    const toolTitle = `EVAIX Agent: ${name}`;
    const dbId = `evaix_agent_${id}`;

    const spec = {
      name: safeName,
      description: description,
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The task or question for the agent."
          }
        },
        required: ["prompt"]
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

    def ${safeName}(self, prompt: str) -> str:
        """
        ${description}
        :param prompt: The task or question.
        """
        try:
            res = requests.post(self.base_url, json={"action_type": "agent", "id": "${id}", "prompt": prompt})
            return res.json().get("result", str(res.text))
        except Exception as e:
            return f"Error: {e}"
`;

    toolsToInject.push({
      id: dbId,
      name: toolTitle,
      content: pythonCode,
      specs: JSON.stringify([spec]),
      description: description
    });
  }

  // Inject into SQLite
  const dbPath = '/home/guy/.local/share/containers/storage/volumes/evaix_openwebui_data/_data/webui.db';
  
  const toolsJsonPath = path.join(process.cwd(), '.tmp_tools_to_inject.json');
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

  const scriptPath = path.join(process.cwd(), '.tmp_inject.py');
  await fs.writeFile(scriptPath, injectScript, 'utf-8');

  try {
    const { stdout } = await execPromise(`python3 ${scriptPath}`);
    console.log(`[PythonBridge] ✅ ${stdout.trim()}`);
  } catch (err: any) {
    console.error('[PythonBridge] ❌ Failed to inject tools into SQLite:', err.message);
  } finally {
    // Cleanup
    await fs.unlink(scriptPath).catch(()=>{});
    await fs.unlink(toolsJsonPath).catch(()=>{});
  }
}
