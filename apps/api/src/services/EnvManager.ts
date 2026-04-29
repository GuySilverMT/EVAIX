import fs from 'fs';
import path from 'path';

export class EnvManager {
    /**
     * Updates an environment variable in both .env and .env.local in the monorepo root.
     * Hot-swaps the current process.env as well.
     */
    static async updateEnvVariable(key: string, value: string) {
        if (!key || !value) return;

        // Escape key for regex usage
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Determine monorepo root more robustly
        let root = process.cwd();
        while (root !== '/' && !fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))) {
            const parent = path.dirname(root);
            if (parent === root) break;
            root = parent;
        }

        const envPaths = [
            path.join(root, '.env'),
            path.join(root, '.env.local')
        ];

        console.log(`[EnvManager] 📝 Syncing ${key} to environment files at ${root}...`);

        for (const envPath of envPaths) {
            try {
                if (!fs.existsSync(envPath)) {
                    console.log(`[EnvManager] ℹ️ File not found: ${envPath}`);
                    continue;
                }

                const content = fs.readFileSync(envPath, 'utf8');
                const lines = content.split('\n');
                let found = false;

                // Match both KEY=VALUE and KEY = VALUE
                const regex = new RegExp(`^\\s*${escapedKey}\\s*=`);

                const newLines = lines.map(line => {
                    if (regex.test(line)) {
                        found = true;
                        return `${key}=${value}`;
                    }
                    return line;
                });

                if (!found) {
                    console.log(`[EnvManager] ➕ Appending new key to ${path.basename(envPath)}`);
                    newLines.push(`${key}=${value}`);
                }

                let finalContent = newLines.join('\n');
                if (!finalContent.endsWith('\n')) finalContent += '\n';

                fs.writeFileSync(envPath, finalContent, 'utf8');

            } catch (error) {
                console.error(`[EnvManager] ❌ Failed to write to ${envPath}:`, error);
            }
        }

        // Hot-swap in current process
        process.env[key] = value;
        console.log(`[EnvManager] 🚀 Process variable ${key} updated in memory.`);
    }
}
