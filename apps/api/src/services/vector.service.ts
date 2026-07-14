export interface Vector {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  similarity?: number;
}

import { promises as fs, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findWorkspaceRoot(): string {
  let current = __dirname;
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = dirname(current);
  }
  return join(__dirname, '../../../'); // fallback
}

const APPS_API_ROOT = join(findWorkspaceRoot(), 'apps/api');

interface DbVectorResult {
  id: string;
  content: string;
  filePath: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export class PgVectorStore {
  private getStoragePath(): string {
    return join(APPS_API_ROOT, '.evaix/vectorEmbeddings.json');
  }

  private async readStore(): Promise<Record<string, any>> {
    try {
      const content = await fs.readFile(this.getStoragePath(), 'utf-8');
      return JSON.parse(content);
    } catch {
      return { vectors: [] };
    }
  }

  private async writeStore(data: Record<string, any>): Promise<void> {
    const dir = join(APPS_API_ROOT, '.evaix');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.getStoragePath(), JSON.stringify(data, null, 2), 'utf-8');
  }

  async add(vectors: Vector[]) {
    const store = await this.readStore();
    const existing = Array.isArray(store.vectors) ? store.vectors : [];
    const byId = new Map(existing.map((item: any) => [item.id, item]));

    for (const v of vectors) {
      const workspaceId = v.metadata.workspaceId as string | undefined || null;
      const row = {
        id: v.id,
        content: (v.metadata.chunk as string) || '',
        filePath: (v.metadata.filePath as string) || '',
        metadata: v.metadata,
        workspaceId,
        vector: v.vector,
      };
      byId.set(v.id, row);
    }

    await this.writeStore({ vectors: Array.from(byId.values()) });
    console.log(`Added ${vectors.length} vectors to JSON vector store.`);
  }

  async search(queryVector: number[], topK: number, filters?: { workspaceId?: string }): Promise<Vector[]> {
    const store = await this.readStore();
    const vectors = Array.isArray(store.vectors) ? store.vectors : [];
    const workspaceId = filters?.workspaceId;

    const filtered = workspaceId
      ? vectors.filter((item: any) => item.workspaceId === workspaceId)
      : vectors;

    const scored = filtered
      .map((item: any) => ({
        ...item,
        similarity: this.cosineSimilarity(queryVector, item.vector || []),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return this.mapResults(scored as DbVectorResult[]);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length) return 0;
    const maxLength = Math.max(a.length, b.length);
    const vecA = a.length < maxLength ? [...a, ...new Array<number>(maxLength - a.length).fill(0)] : a;
    const vecB = b.length < maxLength ? [...b, ...new Array<number>(maxLength - b.length).fill(0)] : b;

    const dot = vecA.reduce((sum, value, index) => sum + value * (vecB[index] || 0), 0);
    const normA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
    const normB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
    if (!normA || !normB) return 0;
    return dot / (normA * normB);
  }

  private mapResults(results: DbVectorResult[]): Vector[] {
    return results.map((r) => ({
      id: r.id,
      vector: [],
      metadata: { ...r.metadata, chunk: r.content, filePath: r.filePath },
      similarity: r.similarity,
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

import { ProviderManager } from './ProviderManager.js';
import { OllamaProvider } from '../utils/OllamaProvider.js';
import { OpenAIProvider } from '../utils/OpenAIProvider.js';
import type { FeatureExtractionPipeline } from '@xenova/transformers';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { pipeline, env } = require('@xenova/transformers');

// Disable local models to fetch from huggingface if not cached
env.allowLocalModels = false;

class EmbeddingPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: Promise<FeatureExtractionPipeline> | null = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      // @ts-ignore - type definitions might have a mismatch with actual kwargs supported
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createEmbedding = async (text: string, retryCount = 5): Promise<number[]> => {
  if (!text || !text.trim()) {
    return new Array<number>(384).fill(0);
  }

  // If text is too large for the model's context, truncate it.
  const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;

  let lastError: any = null;

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      // 2. Try ProviderManager providers (LiteLLM, OpenAI, etc.)
      const litellmProvider = ProviderManager.getProvider('litellm-router') || ProviderManager.getProvider('openai');
      if (litellmProvider && litellmProvider instanceof OpenAIProvider) {
        const configuredModel = process.env.LITELLM_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
        return await litellmProvider.generateEmbedding(truncatedText, configuredModel);
      }

      const provider = ProviderManager.getProvider('local');
      if (provider && provider instanceof OllamaProvider) {
        return await provider.generateEmbedding(truncatedText);
      }

      // 3. Default to transformers.js pipeline
      const extractor = await EmbeddingPipeline.getInstance();
      if (!extractor) throw new Error('Failed to initialize EmbeddingPipeline');
      const output = await extractor(truncatedText, { pooling: 'mean', normalize: true });
      const rawVector = Array.from(output.data) as number[];
      if (rawVector.length !== 384) {
        // Fallback or truncate/pad if model unexpectedly changed, but transformers all-MiniLM is strictly 384.
        const fixed = new Array<number>(384).fill(0);
        for(let i=0; i<Math.min(384, rawVector.length); i++) fixed[i] = rawVector[i];
        return fixed;
      }
      return rawVector;

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
  return new Array<number>(384).fill(0);
};
