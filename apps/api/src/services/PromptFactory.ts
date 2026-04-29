import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '../db.js';

export interface AgentLesson {
  rule: string;
  confidence: number;
}

export interface LessonProvider {
  getLessons(keywords: string[]): Promise<AgentLesson[]>;
}

/**
 * Loads a role's base prompt from the markdown files in apps/api/data/agents/en/
 */
export async function loadRolePrompt(roleName: string): Promise<string> {
  const agentsDir = path.join(process.cwd(), 'data', 'agents', 'en');
  
  // Try to find the markdown file for this role
  // Role names in DB might be like "Backend Developer" but files are "backend-developer.md"
  const normalizedName = roleName.toLowerCase().replace(/\s+/g, '-');
  const filePath = path.join(agentsDir, `${normalizedName}.md`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Extract the body (after frontmatter)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      return content.substring(frontmatterMatch[0].length).trim();
    }
    
    return content;
  } catch {
    // If file doesn't exist, return a default prompt
    console.warn(`[PromptFactory] Role prompt not found for "${roleName}", using default`);
    return `You are a helpful ${roleName}. Assist the user with their request.`;
  }
}

export class PromptFactory {
  constructor(private lessonProvider: LessonProvider) {}

  async build(
    role: string, 
    userQuery: string, 
    memoryConfig?: { useProjectMemory: boolean },
    tools?: string[],
    projectPrompt?: string,
    constitution?: { codeRules?: string; glossary?: Record<string, string> }
  ): Promise<string> {
    // 0. Constitution Layer (Global Rules - Highest Priority)
    let constitutionSection = '';
    if (constitution) {
      if (constitution.codeRules) {
        constitutionSection += `\n## ⚖️ CONSTITUTION - CODE RULES (MUST FOLLOW)\n${constitution.codeRules}\n`;
      }
      if (constitution.glossary && Object.keys(constitution.glossary).length > 0) {
        const glossaryEntries = Object.entries(constitution.glossary)
          .map(([key, value]) => `- **${key}**: ${value}`)
          .join('\n');
        constitutionSection += `\n## 📖 GLOSSARY - PROJECT TERMINOLOGY\n${glossaryEntries}\n`;
      }
    }

    // 1. Load the role's base prompt from markdown
    const rolePrompt = await loadRolePrompt(role);

    // 2. Load Dynamic Layer (The "Learning" Integration)
    let lessons: AgentLesson[] = [];
    
    if (memoryConfig?.useProjectMemory) {
      const keywords = this.extractKeywords(userQuery); 
      lessons = await this.lessonProvider.getLessons(keywords);
    }

    const memoryBlock = lessons.length > 0 
      ? `\n## 🧠 PREVIOUS LESSONS\n${lessons.map(l => `- ${l.rule}`).join('\n')}`
      : '';

    // 3. Load Tool Definitions from DB
    let toolSection = '';
    if (tools && tools.length > 0) {
      try {
        const dbTools = await prisma.tool.findMany({
          where: {
            name: { in: tools },
            isEnabled: true
          },
          select: { name: true, instruction: true }
        });

        if (dbTools.length > 0) {
          const toolDefs = dbTools.map(t => t.instruction).join('\n');
          toolSection = `
## 🛠️ AVAILABLE TOOLS (TYPE DEFINITIONS)
\`\`\`typescript
${toolDefs}
\`\`\`
`;
        }
      } catch (err) {
        console.warn('[PromptFactory] Failed to load tools from DB:', err);
      }
    }

    // 4. Project Specific Prompt
    const projectSection = projectPrompt ? `\n## 🏗️ PROJECT CONTEXT & GUIDELINES\n${projectPrompt}\n` : '';

    // Constitution comes FIRST to ensure it's always visible and enforced
    return `${constitutionSection}${rolePrompt}\n${projectSection}\n${memoryBlock}${toolSection}`;
  }

  private extractKeywords(query: string): string[] {
    // Simple logic: split by space, filter common words
    return query.toLowerCase().split(' ').filter(w => w.length > 3);
  }
}
