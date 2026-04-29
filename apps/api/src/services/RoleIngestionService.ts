import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

interface AgentData {
  id?: string;
  name: string;
  description: string;
  tools: string[];
  category?: string;
  systemPrompt: string;
}

/**
 * Parses frontmatter and body from markdown agent files
 */
function parseMarkdownAgent(content: string): AgentData {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('Invalid markdown: missing frontmatter');
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.substring(frontmatterMatch[0].length).trim();

  const parseFrontmatterField = (key: string): string | string[] => {
    const regex = new RegExp(`^${key}:\\s*(.*)$`, 'm');
    const match = frontmatter.match(regex);
    if (!match) return key === 'tools' ? [] : '';

    const value = match[1].trim();
    if (key === 'tools') {
      return value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }
    return value;
  };

  return {
    id: parseFrontmatterField('id') as string,
    name: parseFrontmatterField('name') as string,
    description: parseFrontmatterField('description') as string,
    tools: parseFrontmatterField('tools') as string[],
    category: (parseFrontmatterField('category') as string) || 'Uncategorized',
    systemPrompt: body,
  };
}

const TOOL_MAPPING: Record<string, string[]> = {
  'read': ['filesystem'],
  'write': ['filesystem'],
  'edit': ['filesystem'],
  'multiEdit': ['filesystem'],
  'grep': ['filesystem'],
  'bash': ['terminal'],
  'shell': ['terminal'],
  'command': ['terminal'],
  'browser': ['browser'],
  'http': ['browser'],
  'web': ['browser'],
  'git': ['meta'],
  'system': ['meta'],
  'meta': ['meta'],
};

function filterAvailableTools(tools: string[], systemToolNames: Set<string>): string[] {
  const mapped = new Set<string>();
  
  for (const tool of tools) {
    const normalized = tool.toLowerCase();
    const mappedTools = TOOL_MAPPING[normalized];
    
    if (mappedTools) {
      mappedTools.forEach((t) => {
        if (systemToolNames.has(t)) {
          mapped.add(t);
        }
      });
    } else {
      const snakeTool = normalized.replace(/-/g, '_');
      if (systemToolNames.has(normalized)) {
        mapped.add(normalized);
      } else if (systemToolNames.has(snakeTool)) {
        mapped.add(snakeTool);
      }
    }
  }
  
  return Array.from(mapped);
}

function shouldNeedReasoning(description: string, systemPrompt: string): boolean {
  const reasoningKeywords = ['analysis', 'complex', 'reasoning', 'planning', 'strategy', 'research', 'architect'];
  const combined = `${description} ${systemPrompt}`.toLowerCase();
  return reasoningKeywords.some((keyword) => combined.includes(keyword));
}

export async function ingestAgentLibrary(
  agentsDir: string,
  prismaClient: PrismaClient
): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
  const stats = { created: 0, updated: 0, failed: 0, errors: [] as string[] };

  try {
    const files = await fs.readdir(agentsDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const dbTools = await prismaClient.tool.findMany({ select: { name: true } });
    const systemToolNames = new Set(dbTools.map(t => t.name));

    console.log(`Found ${mdFiles.length} agent files in ${agentsDir}`);

    for (const file of mdFiles) {
      try {
        const filePath = path.join(agentsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const agentData = parseMarkdownAgent(content);

        if (!agentData.name || !agentData.systemPrompt) {
          stats.failed++;
          stats.errors.push(`${file}: missing name or system prompt`);
          continue;
        }

        const filteredTools = filterAvailableTools(agentData.tools, systemToolNames);
        const needsReasoning = shouldNeedReasoning(agentData.description, agentData.systemPrompt);

        const categoryName = agentData.category || 'Uncategorized';
        const category = await prismaClient.roleCategory.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName }
        });

        const existing = await prismaClient.role.findFirst({
          where: { OR: [{ name: agentData.name }, { id: agentData.id as string }] },
        });

        if (existing) {
          await prismaClient.role.update({
            where: { id: existing.id },
            data: {
              name: agentData.name,
              basePrompt: agentData.systemPrompt,
              tools: {
                deleteMany: {},
                create: filteredTools.map(t => ({ toolId: t }))
              },
              categoryId: category.id,
              metadata: {
                needsReasoning: needsReasoning,
              } as Prisma.JsonObject,
            },
          });
          stats.updated++;
        } else {
           await prismaClient.role.create({
             data: {
                id: agentData.id as string || undefined,
                name: agentData.name,
                basePrompt: agentData.systemPrompt,
                categoryId: category.id,
                metadata: {
                  needsReasoning: needsReasoning,
                  minContext: 4096,
                  maxContext: 128000,
                } as Prisma.JsonObject,
                tools: {
                  create: filteredTools.map(t => ({ toolId: t }))
                }
              },
           });
           stats.created++;
        }

        console.log(`✓ Ingested role: ${agentData.name}`);
      } catch (error) {
        stats.failed++;
        stats.errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    stats.errors.push(`Directory error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return stats;
}

async function findPackageJsonFiles(rootPath: string): Promise<string[]> {
  const packageJsonFiles: string[] = [];
  
  async function scan(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name === 'package.json') {
          packageJsonFiles.push(fullPath);
        }
      }
    } catch (error) {
       console.warn(`Could not read directory ${dirPath}:`, error);
    }
  }
  
  await scan(rootPath);
  return packageJsonFiles;
}

async function getTopFiles(dirPath: string, limit: number = 20): Promise<string[]> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries
            .filter(e => e.isFile() && !e.name.startsWith('.'))
            .map(e => e.name)
            .slice(0, limit);
    } catch {
        return [];
    }
}

export async function onboardProject(
  rootPath: string,
  _prisma: PrismaClient
): Promise<{ 
  scanned: number; 
  departments: number; 
  rolesCreated: number; 
  rolesUpdated: number;
  errors: string[];
}> {
  const stats = { scanned: 0, departments: 0, rolesCreated: 0, rolesUpdated: 0, errors: [] as string[] };

  try {
    const packageJsonFiles = await findPackageJsonFiles(rootPath);
    stats.scanned = packageJsonFiles.length;

    for (const pkgPath of packageJsonFiles) {
      try {
        const dirPath = path.dirname(pkgPath);
        const content = await fs.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(content) as { name?: string };
        
        await getTopFiles(dirPath);
        console.log(`  ⏭️  Skipping AI Recruitment for ${pkg.name || 'project'} (Policy: Volcano Architecture Only)`);
      } catch (error) {
        stats.errors.push(`Failed ${pkgPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    stats.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return stats;
}
