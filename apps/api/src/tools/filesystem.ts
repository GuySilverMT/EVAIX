import fs from 'fs/promises';
import path from 'path';

export const createFsTools = (rootPath: string = process.cwd()) => {
  const resolvePath = (relativePath: string) => {
    const resolved = path.resolve(rootPath, relativePath);
    if (!resolved.startsWith(rootPath)) {
      throw new Error(`Access denied: Path '${relativePath}' is outside the allowable scope.`);
    }
    return resolved;
  };

  return {
    readFile: async ({ path: filePath }: { path: string }) => {
      return await fs.readFile(resolvePath(filePath), 'utf-8');
    },
    writeFile: async ({ path: filePath, content }: { path: string, content: string }) => {
      const fullPath = resolvePath(filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
      return { success: true };
    },
    listFiles: async ({ path: dirPath }: { path: string }) => {
      const fullPath = resolvePath(dirPath);
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      return files.map(f => ({ name: f.name, isDir: f.isDirectory() }));
    }
  };
};

export const fsTools = createFsTools();
