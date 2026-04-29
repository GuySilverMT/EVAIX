import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'directory' | 'superNode';
  roleId: string; // 'api', 'service', 'db', 'config'
  parentId?: string;
  imports: string[];
  path: string;
  data?: {
      department: string;
      label?: string;      // ReactFlow needs label in data often
      type?: string;       // ReactFlow needs type in data often
      roleId?: string;
      filePath?: string;
  };
  position: { x: number; y: number; };
}

export class CodeGraphService {
  
  // Find Monorepo Root
  private async findRoot(start: string): Promise<string> {
    let curr = start;
    while (curr !== path.parse(curr).root) {
      try {
        const files = await fs.readdir(curr);
        if (files.includes('pnpm-workspace.yaml') || files.includes('turbo.json')) return curr;
        curr = path.dirname(curr);
      } catch { break; }
    }
    return start;
  }

  async generateGraph(inputPath?: string): Promise<GraphNode[]> {
    const root = inputPath || await this.findRoot(process.cwd());
    console.log(`[Graph] Scanning Backend at: ${root}`);
    
    const nodes: GraphNode[] = [];
    
    // Scan specific backend targets only
    const targets = ['apps/api/src', 'apps/ui/src', 'packages/api-contract/src', 'apps/api/prisma'];
    
    for (const target of targets) {
        const targetPath = path.join(root, target);
        try {
            await this.scanDir(targetPath, root, nodes);
        } catch (e) { console.warn(`Skipping ${target}:`, e); }
    }
    
    return nodes;
  }

  private async scanDir(curr: string, root: string, nodes: GraphNode[]) {
    const entries = await fs.readdir(curr, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(curr, entry.name);

      if (entry.isDirectory()) {
        nodes.push({
          id: fullPath,
          label: entry.name,
          type: 'directory',
          roleId: 'folder',
          path: fullPath,
          imports: [],
          position: { x: 0, y: 0 },
          data: {
              label: entry.name,
              type: 'folder',
              roleId: 'folder',
              filePath: fullPath,
              department: 'folder'
          }
        });
        await this.scanDir(fullPath, root, nodes);
      } else if (/\.(ts|tsx|prisma|json|sql)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.map')) {
        
        const imports: string[] = [];
        let role = 'config';

        // Role Detection
        if (entry.name.includes('router')) role = 'api';
        else if (entry.name.includes('service')) role = 'service';
        else if (entry.name.endsWith('.prisma')) role = 'db';
        else if (fullPath.includes('/pages/')) role = 'page';
        else if (/^[A-Z]/.test(entry.name)) role = 'component'; // React Components usually start with Capital
        else if (entry.name.startsWith('use')) role = 'hook';
        
        // Parse Imports for TS files
        if (entry.name.endsWith('.ts')) {
            const content = await fs.readFile(fullPath, 'utf-8');
            const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const imp = match[1];
                // Resolve relative imports to absolute paths for linking
                if (imp.startsWith('.')) {
                    const resolved = path.resolve(path.dirname(fullPath), imp);
                    // Try to match exact file or index.ts
                    imports.push(resolved); 
                }
            }
        }

        // Department Detection
        let department = 'backend'; // Default to backend
        if (fullPath.includes('apps/ui')) department = 'frontend';
        else if (fullPath.includes('apps/api') || fullPath.includes('packages/api-contract')) department = 'backend';
        
        if (role === 'db') department = 'database';

        nodes.push({
          id: fullPath,
          label: entry.name,
          type: 'superNode', // Use superNode for custom rendering
          roleId: role,
          parentId: path.dirname(fullPath),
          imports,
          path: fullPath,
          data: {
              department: department,
              label: entry.name,
              type: role,
              roleId: role,
              filePath: fullPath
          },
          position: { x: 0, y: 0 }
        });
      }
    }
  }
}

export const codeGraphService = new CodeGraphService();
