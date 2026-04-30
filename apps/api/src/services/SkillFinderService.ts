import * as fs from 'fs/promises';
import * as path from 'path';
import yaml from 'js-yaml';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

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

    async downloadAndInstallSkill(urlOrId: string, customSlug?: string): Promise<{ slug: string; destinationPath: string }> {
        const generateSlugFromUrl = (url: string) => {
            const parts = url.split('/');
            let lastPart = parts[parts.length - 1];
            if (lastPart.endsWith('.zip')) {
                lastPart = lastPart.slice(0, -4);
            }
            return lastPart.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() || 'unknown-skill';
        };

        const slug = customSlug || generateSlugFromUrl(urlOrId);
        const destinationPath = path.join(this.skillsDir, slug);

        try {
            await fs.mkdir(destinationPath, { recursive: true });

            const tmpZipPath = path.join(process.cwd(), `${slug}-temp.zip`);

            // Download
            const curlProcess = child_process.spawnSync('curl', ['-L', '-o', tmpZipPath, urlOrId]);
            if (curlProcess.status !== 0) {
                throw new Error(`Failed to download skill from ${urlOrId}: ${curlProcess.stderr?.toString()}`);
            }

            // Extract
            const unzipProcess = child_process.spawnSync('unzip', ['-o', tmpZipPath, '-d', destinationPath]);
            if (unzipProcess.status !== 0) {
                throw new Error(`Failed to extract skill from ${tmpZipPath}: ${unzipProcess.stderr?.toString()}`);
            }

            // Clean up zip
            await fs.unlink(tmpZipPath).catch(() => {});

            // If the zip contains a single directory, move its contents up
            const files = await fs.readdir(destinationPath);
            if (files.length === 1) {
                const singleItemPath = path.join(destinationPath, files[0]);
                const stat = await fs.stat(singleItemPath);
                if (stat.isDirectory()) {
                    const innerFiles = await fs.readdir(singleItemPath);
                    for (const innerFile of innerFiles) {
                        await fs.rename(
                            path.join(singleItemPath, innerFile),
                            path.join(destinationPath, innerFile)
                        );
                    }
                    await fs.rm(singleItemPath, { recursive: true, force: true });
                }
            }

            // Install dependencies if package.json exists
            const packageJsonPath = path.join(destinationPath, 'package.json');
            try {
                await fs.access(packageJsonPath);
                console.log(`Installing dependencies for skill: ${slug}`);
                child_process.spawnSync('npm', ['install', '--production'], { cwd: destinationPath, stdio: 'inherit' });
            } catch (e) {
                // No package.json, skip install
            }

            return { slug, destinationPath };
        } catch (error) {
            console.error(`Failed to download and install skill from ${urlOrId}:`, error);
            throw error;
        }
    }
}