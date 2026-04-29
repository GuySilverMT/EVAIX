import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export class LanguageServerService {
    async validateTypeScript(code: string, fileName = 'validate.ts'): Promise<{ errors: string[]; isValid: boolean }> {
        const tempDir = path.join(os.tmpdir(), `lsp-validate-${crypto.randomUUID()}`);
        const safeFileName = path.basename(fileName) || 'validate.ts';
        const filePath = path.join(tempDir, safeFileName);
        const tsConfigPath = path.join(tempDir, 'tsconfig.json');

        try {
            await fs.mkdir(tempDir, { recursive: true });

            // Write code to temp file
            await fs.writeFile(filePath, code);

            // Create minimal tsconfig
            const tsConfig = {
                compilerOptions: {
                    target: 'ES2020',
                    module: 'commonjs',
                    strict: true,
                    esModuleInterop: true,
                    skipLibCheck: true,
                    forceConsistentCasingInFileNames: true,
                    noEmit: true,
                },
                include: [fileName],
            };
            await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));

            // Run tsc --noEmit
            const { stdout, stderr } = await execAsync(`cd ${tempDir} && npx tsc --noEmit --project tsconfig.json`);

            const errors = stderr.trim().split('\n').filter(line => line.includes('error TS'));
            const isValid = errors.length === 0;

            if (!isValid) {
                console.log('TS Errors:', errors);
            }

            return { errors, isValid };
        } catch (error) {
            console.error('Validation error:', error);
            return { errors: ['Validation failed: ' + (error as Error).message], isValid: false };
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        }
    }

    async generateFeedback(errors: string[]): Promise<string> {
        // Simple feedback generator, can be enhanced with AI
        if (errors.length === 0) return 'Code is valid!';
        return `Fix these TypeScript errors:\n${errors.join('\n')}\nRegenerate the code accordingly.`;
    }
}