/**
 * FileIndexRepository - JSON-based file index storage
 * Replaces previous Prisma $queryRawUnsafe / $executeRawUnsafe implementation
 */

import { jsonDataStore } from '../utils/jsonDataStore.js';

export interface FileIndexRow {
  filePath: string;
  contentHash: string;
  updatedAt: string;
}

export class FileIndexRepository {
  /**
   * Get file index entry by path
   */
  async getByFilePath(filePath: string): Promise<FileIndexRow | null> {
    try {
      const data = await jsonDataStore.getFileIndex();
      const file = data.files?.find((f: FileIndexRow) => f.filePath === filePath);
      return file || null;
    } catch (error) {
      console.error('Error getting file index:', error);
      return null;
    }
  }

  /**
   * Upsert file index entry
   */
  async upsert(filePath: string, hash: string): Promise<number> {
    try {
      const data = await jsonDataStore.getFileIndex();
      const files = data.files || [];
      const existingIndex = files.findIndex((f: FileIndexRow) => f.filePath === filePath);

      if (existingIndex >= 0) {
        files[existingIndex] = {
          filePath,
          contentHash: hash,
          updatedAt: new Date().toISOString(),
        };
      } else {
        files.push({
          filePath,
          contentHash: hash,
          updatedAt: new Date().toISOString(),
        });
      }

      await jsonDataStore.saveFileIndex({ files });
      return 1;
    } catch (error) {
      console.error('Error upserting file index:', error);
      return 0;
    }
  }

  /**
   * Delete file index and its associated vector embeddings
   */
  async delete(filePath: string): Promise<void> {
    try {
      const data = await jsonDataStore.getFileIndex();
      const files = data.files?.filter((f: FileIndexRow) => f.filePath !== filePath) || [];
      await jsonDataStore.saveFileIndex({ files });
    } catch (error) {
      console.error('Error deleting file index:', error);
    }
  }

  /**
   * Clear all embeddings for a file without deleting the index (if needed)
   */
  async deleteVectorsByFilePath(filePath: string): Promise<number> {
    // In JSON store, we don't track embeddings separately; just log this call
    console.debug(`[FileIndexRepository] deleteVectorsByFilePath called for ${filePath}`);
    return 0;
  }
}

export const fileIndexRepository = new FileIndexRepository();
