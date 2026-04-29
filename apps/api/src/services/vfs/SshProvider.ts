import Client from 'ssh2-sftp-client';
import path from 'path';
import { IVfsProvider, FileEntry } from './IVfsProvider.js';
import { emitFileWriteEvent } from './events.js';

export class SshProvider implements IVfsProvider {
  private client: Client;
  private rootPath: string;

  constructor(client: Client, rootPath: string = '.') {
    this.client = client;
    this.rootPath = rootPath;
  }

  private resolvePath(relativePath: string): string {
    // Always use posix for SSH as it's the standard for SFTP
    // If rootPath is absolute (e.g. /home/user), join works.
    // If rootPath is relative (e.g. .), join works.
    return path.posix.join(this.rootPath, relativePath);
  }

  async list(dirPath: string): Promise<FileEntry[]> {
    const fullPath = this.resolvePath(dirPath);
    const list = await this.client.list(fullPath);
    return list.map((item: any) => ({
      name: item.name,
      type: item.type === 'd' ? 'directory' : 'file',
      path: path.posix.join(dirPath, item.name),
      size: item.size
    }));
  }

  async read(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    const buffer = await this.client.get(fullPath);
    if (buffer instanceof Buffer) {
      return buffer.toString('utf-8');
    }
    throw new Error('Unexpected return type from sftp.get');
  }

  async write(filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    const dir = path.posix.dirname(fullPath);
    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    
    // Ensure directory exists
    const dirExists = await this.client.exists(dir);
    if (!dirExists) {
        await this.client.mkdir(dir, true);
    }
    
    await this.client.put(contentBuffer, fullPath);

    // Emit the file write event for ingestion
    emitFileWriteEvent(this, filePath, contentBuffer);
  }

  async mkdir(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);
    await this.client.mkdir(fullPath, true);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);
    const result = await this.client.exists(fullPath);
    return !!result; // exists returns false | 'd' | '-' etc.
  }
}
