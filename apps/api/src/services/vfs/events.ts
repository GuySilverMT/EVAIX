import { EventEmitter } from 'events';
import { IVfsProvider } from './IVfsProvider.js';

// Create a new EventEmitter instance to be used as the event bus
const eventEmitter = new EventEmitter();

/**
 * Emits a FILE_WRITE event.
 * @param provider - The VFS provider instance.
 * @param filePath - The path of the file that was written.
 * @param content - The content of the file.
 */
export const emitFileWriteEvent = (provider: IVfsProvider, filePath: string, content: Buffer) => {
  eventEmitter.emit('FILE_WRITE', { provider, filePath, content });
};

/**
 * Subscribes to the FILE_WRITE event.
 * @param listener - The function to be called when the event is emitted.
 */
export const onFileWrite = (listener: (data: { provider: IVfsProvider; filePath: string; content: Buffer }) => void) => {
  eventEmitter.on('FILE_WRITE', listener);
};
