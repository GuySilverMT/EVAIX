
import { prisma } from '../db.js';

async function main() {
  try {
    console.log('Creating VectorEmbedding table if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VectorEmbedding" (
        "id" TEXT NOT NULL,
        "vector" TEXT,
        "content" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VectorEmbedding_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Table created (vector stored as TEXT/JSON for now).');
    
    console.log('Creating index...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VectorEmbedding_filePath_idx" ON "VectorEmbedding"("filePath");
    `);
    console.log('Index created.');

    console.log('Creating FileIndex table if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FileIndex" (
        "filePath" TEXT NOT NULL,
        "contentHash" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FileIndex_pkey" PRIMARY KEY ("filePath")
      );
    `);
    console.log('FileIndex table created.');

  } catch (error) {
    console.error('Failed to setup vector DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
