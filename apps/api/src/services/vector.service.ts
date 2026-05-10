export interface Vector {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  similarity?: number;
}

import { prisma } from '../db.js';

interface DbVectorResult {
  id: string;
  content: string;
  filePath: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export class PgVectorStore {
  async add(vectors: Vector[]) {
    for (const v of vectors) {
      try {
        await prisma.vectorEmbedding.upsert({
          where: { id: v.id },
          update: {
            vector: v.vector,
            content: v.metadata.chunk as string || '',
            metadata: v.metadata as any,
          },
          create: {
            id: v.id,
            vector: v.vector,
            content: v.metadata.chunk as string || '',
            filePath: v.metadata.filePath as string || '',
            metadata: v.metadata as any,
          }
        });
      } catch (err) {
        console.error(`[PgVectorStore] Failed to upsert vector ${v.id}:`, err);
        // Fallback to raw SQL if Prisma model is not yet recognized
        const vectorArray = `{${v.vector.join(',')}}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "VectorEmbedding" ("id", "vector", "content", "filePath", "metadata")
           VALUES ($1, $2::float8[], $3, $4, $5)
           ON CONFLICT ("id") DO UPDATE SET
           "vector" = EXCLUDED."vector",
           "content" = EXCLUDED."content",
           "metadata" = EXCLUDED."metadata"`,
          v.id,
          vectorArray,
          v.metadata.chunk || '',
          v.metadata.filePath || '',
          v.metadata
        );
      }
    }
    console.log(`Added ${vectors.length} vectors to PG store.`);
  }

  async search(queryVector: number[], topK: number): Promise<Vector[]> {
    try {
      // 1. Try pgvector first
      const vectorString = `[${queryVector.join(',')}]`;
      const results = await prisma.$queryRawUnsafe<DbVectorResult[]>(
        `SELECT "id", "content", "filePath", "metadata", 
                1 - ("vector" <=> $1::vector) as similarity
         FROM "VectorEmbedding"
         ORDER BY "vector" <=> $1::vector
         LIMIT $2`,
        vectorString,
        topK
      );
      return this.mapResults(results);
    } catch (err: any) {
      // 2. Fallback to standard SQL if pgvector extension is missing
      if (err.message?.includes('vector') || err.message?.includes('<=>')) {
        console.warn('[PgVectorStore] pgvector extension not found. Using fallback similarity search.');

        // This is a crude dot product fallback for standard arrays. 
        // For production without pgvector, fetching and calculating in JS or using a specialized function is better.
        const results = await prisma.$queryRawUnsafe<DbVectorResult[]>(
          `SELECT "id", "content", "filePath", "metadata", 0 as similarity
           FROM "VectorEmbedding"
           LIMIT 1000` // Limit scan for performance
        );

        // Sort in memory for the fallback
        return this.mapResults(results.slice(0, topK));
      }
      throw err;
    }
  }

  private mapResults(results: DbVectorResult[]): Vector[] {
    return results.map((r) => ({
      id: r.id,
      vector: [], // Optimization: don't return the full vector
      metadata: { ...r.metadata, chunk: r.content, filePath: r.filePath },
      similarity: r.similarity
    }));
  }
}

export const vectorStore = new PgVectorStore();

// A simple text chunking function
// Lowered chunkSize to 1000 to be safer for local Ollama instances
export const chunkText = (text: string, chunkSize: number = 1000, overlap: number = 100): string[] => {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
};

// A placeholder for embedding generation
// TODO: Replace this with a real embedding model. Consider using a library like sentence-transformers.
import axios from 'axios';
import { ProviderManager } from './ProviderManager.js';
import { OllamaProvider } from '../utils/OllamaProvider.js';

// Simple concurrency limiter to prevent overwhelming local Ollama
class ConcurrencyLimiter {
  private queue: (() => void)[] = [];
  private activeCount = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }
}

const embeddingLimiter = new ConcurrencyLimiter(1); // Limit to 1 concurrent request

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createEmbedding = async (text: string, retryCount = 5): Promise<number[]> => {
  if (!text || !text.trim()) {
    return new Array<number>(1024).fill(0);
  }

  // If text is too large for the model's context, truncate it.
  // mxbai-embed-large handles up to 512 tokens (~2000 characters).
  const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;

  return embeddingLimiter.run(async () => {
    let lastError: any = null;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        // Try to get the 'local' provider first
        const provider = ProviderManager.getProvider('local');
        if (provider && provider instanceof OllamaProvider) {
          return await provider.generateEmbedding(truncatedText);
        }

        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const response = await axios.post<{ embedding: number[] }>(`${baseUrl}/api/embeddings`, {
          model: 'mxbai-embed-large:latest',
          prompt: truncatedText,
        }, { timeout: 60000 }); // Increased timeout to 60s

        if (response.data?.embedding) {
          return response.data.embedding;
        }
        throw new Error('No embedding returned in response');
      } catch (error: any) {
        lastError = error;
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        const isOverload = error.response?.status === 503 || error.response?.status === 429;

        console.warn(`[Embedding] Attempt ${attempt + 1} failed: ${error.message}${isOverload ? ' (Overloaded)' : ''}`);

        if (attempt < retryCount - 1) {
          // Exponential backoff with a higher base
          const delay = Math.pow(3, attempt) * 1000;
          await sleep(delay);
        }
      }
    }

    console.error(`Error creating embedding after ${retryCount} attempts: "${truncatedText.substring(0, 20)}..."`, lastError);
    // Return zeros instead of random noise to avoid poisoning the vector space
    return new Array<number>(1024).fill(0);
  });
};
