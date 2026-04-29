import * as fs from 'fs/promises';
import * as path from 'path';
import yaml from 'js-yaml';

export interface SkillInfo {
    id: string;
    name: string;
    description: string;
    category: string[];
    tags: string[];
    files: string[];
}

export class SkillFinderService {
    private skillsDir = path.join(process.cwd(), 'skills');

    async searchSkills(query: string, limit = 10, category?: string, tag?: string): Promise<SkillInfo[]> {
        const skillDirs = (await fs.readdir(this.skillsDir, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => path.join(this.skillsDir, dirent.name));
        const skills: SkillInfo[] = [];

        for (const dir of skillDirs) {
            const skillId = path.basename(dir);
            const skillMdPath = path.join(dir, 'SKILL.md');

            try {
                const content = await fs.readFile(skillMdPath, 'utf-8');
                const frontmatterMatch = content.match(/---\\s*\\n([\\s\\S]*?)\\n---/);
                const frontmatterStr = frontmatterMatch ? frontmatterMatch[1] : '';
                let frontmatter;
                try {
                    frontmatter = yaml.load(frontmatterStr, { schema: yaml.JSON_SCHEMA }) as any;
                } catch (e) {
                    console.warn(`Failed to parse YAML for ${skillId}:`, e);
                    frontmatter = {};
                }
                frontmatter = frontmatter || {};
                const name = frontmatter.name || skillId;
                const description = frontmatter.description || 'No description';
                const categories = Array.isArray(frontmatter.category) ? frontmatter.category.map((c: any) => String(c)) : frontmatter.category ? [String(frontmatter.category)] : [];
                const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map((t: any) => String(t)) : frontmatter.tags ? [String(frontmatter.tags)] : [];
                // Filter
                if (query && !name.toLowerCase().includes(query.toLowerCase()) && !description.toLowerCase().includes(query.toLowerCase())) continue;
                if (category && !categories.some((c: string) => c.toLowerCase() === category.toLowerCase())) continue;
                if (tag && !tags.some((t: string) => t.toLowerCase() === tag.toLowerCase())) continue;
                // Get files
                const files = await fs.readdir(dir);
                const fileNames = files.filter(f => !f.startsWith('.'));
                skills.push({ id: skillId, name, description, category: categories, tags, files: fileNames });
            } catch (error) {
                console.warn(`Failed to parse skill ${skillId}:`, error);
            }

            if (skills.length >= limit) break;
        }

        return skills;
    }

    async getSkill(id: string): Promise<{ metadata: Record<string, any>; files: Record<string, string> } | null> {
        const skillDir = path.join(this.skillsDir, id);
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        try {
            const content = await fs.readFile(skillMdPath, 'utf-8');
            const frontmatterMatch = content.match(/---\\s*\\n([\\s\\S]*?)\\n---/);
            const frontmatterStr = frontmatterMatch ? frontmatterMatch[1] : '';
            let metadata;
            try {
                metadata = yaml.load(frontmatterStr, { schema: yaml.JSON_SCHEMA }) as Record<string, any>;
            } catch (e) {
                console.warn(`Failed to parse YAML for ${id}:`, e);
                metadata = {};
            }
            metadata = metadata || {};
            // Get all files
            const files = await fs.readdir(skillDir);
            const fileContents: Record<string, string> = {};
            for (const file of files) {
                if (file.startsWith('.')) continue;
                const filePath = path.join(skillDir, file);
                fileContents[file] = await fs.readFile(filePath, 'utf-8');
            }

            return { metadata, files: fileContents };
        } catch (error) {
            console.error(`Failed to get skill ${id}:`, error);
            return null;
        }
    }
}