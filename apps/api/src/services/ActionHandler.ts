import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class ActionHandler {
  async executeActionsFromText(text: string, workspaceRoot: string) {
    const actions = [];

    const fileRegex = /```write:(.*?)[\n\r]+([\s\S]*?)```/g;
    let match;
    while ((match = fileRegex.exec(text)) !== null) {
      const relativePath = match[1].trim();
      const content = match[2];

      // [SAFE-FAIL] Wrap individual file writes
      try {
        await this.writeFile(workspaceRoot, relativePath, content);
        actions.push({ type: 'write', path: relativePath, status: 'success' });
      } catch (err: any) {
        console.error(`[ActionHandler] Failed to write ${relativePath}:`, err.message);
        actions.push({ type: 'write', path: relativePath, status: 'error', error: err.message });
      }
    }

    const cmdRegex = /```bash:(.*?)[\n\r]+([\s\S]*?)```/g;
    while ((match = cmdRegex.exec(text)) !== null) {
      const command = match[2].trim();
      // [SAFE-FAIL] runCommand already handles try/catch internally, but we ensure output matches structure
      const output = await this.runCommand(workspaceRoot, command);
      actions.push({ type: 'command', command, output });
    }

    return actions;
  }

  private async writeFile(root: string, relPath: string, content: string) {
    const fullPath = path.join(root, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    console.log(`[ActionHandler] 📝 Wrote file: ${relPath}`);
  }

  private async runCommand(root: string, command: string) {
    try {
      console.log(`[ActionHandler] 💻 Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { cwd: root });
      return stdout || stderr;
    } catch (e: any) {
      return `Execution Error: ${e.message}`;
    }
  }

  async executeNativeTool(toolName: string, args: any) {
    console.log(`[ActionHandler] 🛠️ Executing native tool: ${toolName}`);
    // In a real implementation, this would look up the tool in NativeToolsRegistry
    // and call its handler. For now, we provide a hook that can be mocked or extended.

    // Example logic for webScraper if it were integrated here:
    if (toolName === 'webScraper') {
      const { webScraperTool } = await import('../tools/webScraper.js');
      return await webScraperTool.handler(args);
    }

    throw new Error(`Native tool ${toolName} not implemented in ActionHandler`);
  }
}
