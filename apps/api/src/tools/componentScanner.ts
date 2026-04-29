import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export const getComponentRegistrySpec = async () => {
  // Fix for ESM: define __dirname manually
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // apps/api/src/tools/componentScanner.ts
  // ../ -> tools
  // ../ -> src
  // ../ -> api
  // ../ -> apps
  // ../ -> root
  // apps/ui -> root/apps/ui

  const rootPath = path.resolve(__dirname, '../../../../apps/ui/src/components');
  const uiPath = path.join(rootPath, 'ui');

  const components: { name: string; importPath: string }[] = [];

  // Helper to scan directory
  const scanDir = async (dir: string, importPrefix: string) => {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const f of files) {
        if (f.isFile() && f.name.endsWith('.tsx')) {
          const name = f.name.replace('.tsx', '');
          components.push({
            name,
            importPath: `${importPrefix}/${name}`
          });
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}`, error);
    }
  };

  // Scan generic components
  await scanDir(rootPath, '@/components');

  // Scan UI components
  await scanDir(uiPath, '@/components/ui');

  return JSON.stringify(components, null, 2);
};
