import { IVfsProvider } from './vfs/IVfsProvider.js';
import { LocalProvider } from './vfs/LocalProvider.js';
import { SshProvider } from './vfs/SshProvider.js';
import Client from 'ssh2-sftp-client';
import { prisma } from '../db.js';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { existsSync } from 'fs';

export class VfsManager {
  private sshConnections: Map<string, Client> = new Map();

  /**
   * Factory method to get the appropriate VFS provider.
   */
  async getProvider(options: { 
    cardId?: string; 
    provider: 'local' | 'ssh'; 
    connectionId?: string;
    rootPath?: string; // Override for raw local access
  }): Promise<IVfsProvider> {
    
    if (options.provider === 'local') {
      const homeDir = os.homedir();
      const monoDir = path.join(homeDir, 'mono');
      const projectHome = existsSync(monoDir) ? monoDir : homeDir;
      
      let fsRoot = options.rootPath || projectHome;

      if (options.cardId) {
        const card = await prisma.workOrderCard.findUnique({
          where: { id: options.cardId },
          include: { workspace: true }
        });
        
        if (card) {
          // The provider root is the workspace root. 
          // The agent will work relative to this, or we can fence strictly to card.relativePath
          // For now, let's fence to the workspace root to allow some movement if needed, 
          // or strictly to the card's path.
          // The plan says: "Determine the rootPath from the WorkOrderCard."
          // Schema does not have relativePath, defaulting to workspace root.
          fsRoot = card.workspace.rootPath;
        }
      }

      return new LocalProvider(fsRoot);
    } 
    
    if (options.provider === 'ssh') {
      if (!options.connectionId) {
        throw new Error("Connection ID is required for SSH provider");
      }
      const client = this.sshConnections.get(options.connectionId);
      if (!client) {
        throw new Error("SSH Session not found or expired");
      }
      // For SSH, we can also apply fencing if a card is involved, 
      // but usually SSH is for the whole remote system unless restricted by the SSH user.
      // We'll default to '.' (home) or root.
      return new SshProvider(client, '.');
    }

    throw new Error(`Unsupported provider: ${options.provider as string}`);
  }

  async createSshConnection(config: { 
    host: string; 
    port?: number; 
    username: string; 
    privateKey?: string; 
    password?: string;
  }): Promise<string> {
    const client = new Client();
    try {
      await client.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        privateKey: config.privateKey,
        password: config.password
      });
      
      const connectionId = crypto.randomUUID();
      this.sshConnections.set(connectionId, client);
      
      // Handle disconnection cleanup
      client.on('close', () => {
        this.sshConnections.delete(connectionId);
      });
      
      return connectionId;
    } catch (error) {
      console.error("SSH Connection failed:", error);
      throw error;
    }
  }

  async closeSshConnection(connectionId: string): Promise<void> {
    const client = this.sshConnections.get(connectionId);
    if (client) {
      await client.end();
      this.sshConnections.delete(connectionId);
    }
  }

  async transferFile(connectionId: string, direction: 'upload' | 'download', localPath: string, remotePath: string): Promise<void> {
    const client = this.sshConnections.get(connectionId);
    if (!client) {
      throw new Error("SSH Session not found");
    }
    
    if (direction === 'upload') {
      await client.fastPut(localPath, remotePath);
    } else {
      await client.fastGet(remotePath, localPath);
    }
  }
}

export const vfsManager = new VfsManager();
// Export alias for backward compatibility if needed, though we should update callers
export const vfsSessionService = vfsManager; 
