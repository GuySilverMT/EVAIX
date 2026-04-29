import fs from 'fs/promises';
import path from 'path';
import { IVfsProvider, FileEntry } from './IVfsProvider.js';
import { emitFileWriteEvent } from './events.js';

export class LocalProvider implements IVfsProvider {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }

  private resolvePath(relativePath: string): string {
    // 1. If it's already an absolute path that is within our root, trust it
    if (path.isAbsolute(relativePath)) {
      const resolved = path.resolve(relativePath);
      if (resolved.startsWith(this.rootPath)) {
        return resolved;
      }
    }

    // 2. Otherwise, treat it as relative to rootPath for VFS scoping
    const sanitizedRelative = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    const resolved = path.resolve(this.rootPath, sanitizedRelative);
    
    // Ensure the resolved path is within the rootPath (fencing)
    // We add a separator to ensure we don't match /home/guy-old with /home/guy
    const rootWithTrailing = this.rootPath.endsWith(path.sep) ? this.rootPath : this.rootPath + path.sep;
    if (!resolved.startsWith(this.rootPath) && resolved !== this.rootPath) {
       throw new Error(`Access denied: Path '${relativePath}' is outside the allowable scope.`);
    }
    
    return resolved;
  }

  async list(dirPath: string): Promise<FileEntry[]> {
    const fullPath = this.resolvePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    return entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath, entry.name), // Return relative path
      // Size would require a separate stat call, skipping for performance unless needed
    }));
  }

  async read(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async write(filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, contentBuffer);

    // Emit the file write event for ingestion
    emitFileWriteEvent(this, filePath, contentBuffer);
  }

  async mkdir(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
