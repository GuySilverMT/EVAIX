import { prisma } from '../db.js';

export interface FileIndexRow {
  filePath: string;
  contentHash: string;
  updatedAt: Date;
}

export class FileIndexRepository {
  /**
   * Get file index entry by path
   */
  async getByFilePath(filePath: string): Promise<FileIndexRow | null> {
    const results = await prisma.$queryRawUnsafe<FileIndexRow[]>(
      `SELECT "filePath", "contentHash", "updatedAt" FROM "FileIndex" WHERE "filePath" = $1 LIMIT 1`,
      filePath
    );
    return results[0] || null;
  }

  /**
   * Upsert file index entry
   */
  async upsert(filePath: string, hash: string): Promise<number> {
    return prisma.$executeRawUnsafe(
      `INSERT INTO "FileIndex" ("filePath", "contentHash", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT ("filePath") DO UPDATE SET "contentHash" = EXCLUDED."contentHash", "updatedAt" = CURRENT_TIMESTAMP`,
      filePath,
      hash
    );
  }

  /**
   * Delete file index and its associated vector embeddings
   */
  async delete(filePath: string): Promise<void> {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "FileIndex" WHERE "filePath" = $1`,
      filePath
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "VectorEmbedding" WHERE "filePath" = $1`,
      filePath
    );
  }

  /**
   * Clear all embeddings for a file without deleting the index (if needed)
   */
  async deleteVectorsByFilePath(filePath: string): Promise<number> {
    return prisma.$executeRawUnsafe(
      `DELETE FROM "VectorEmbedding" WHERE "filePath" = $1`,
      filePath
    );
  }
}

export const fileIndexRepository = new FileIndexRepository();
