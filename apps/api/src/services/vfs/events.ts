import { EventEmitter } from 'events';
import { IVfsProvider } from './IVfsProvider.js';

// Create a new EventEmitter instance to be used as the event bus
const eventEmitter = new EventEmitter();

import { prisma } from '../../db.js';
import * as path from 'path';

/**
 * Emits a FILE_WRITE event.
 * @param provider - The VFS provider instance.
 * @param filePath - The path of the file that was written.
 * @param content - The content of the file.
 */
export const emitFileWriteEvent = async (provider: IVfsProvider, filePath: string, content: Buffer) => {
  let workspaceId: string | undefined = undefined;

  try {
    // Attempt to extract the project name from the path, e.g., apps/[projectName]
    const match = filePath.match(/apps\/([^\/]+)/);
    if (match && match[1]) {
      const projectName = match[1];
      const workspace = await prisma.workspace.findFirst({
        where: { name: projectName }
      });
      if (workspace) {
        workspaceId = workspace.id;
      }
    }
  } catch (error) {
    console.error("Error resolving workspaceId for VFS event:", error);
  }

  eventEmitter.emit('FILE_WRITE', { provider, filePath, content, workspaceId });
};

/**
 * Subscribes to the FILE_WRITE event.
 * @param listener - The function to be called when the event is emitted.
 */
export const onFileWrite = (listener: (data: { provider: IVfsProvider; filePath: string; content: Buffer; workspaceId?: string }) => void) => {
  eventEmitter.on('FILE_WRITE', listener);
};
