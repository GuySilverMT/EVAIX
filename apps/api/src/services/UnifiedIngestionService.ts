import { chunkText, createEmbedding, vectorStore } from './vector.service.js';
import { v4 as uuidv4 } from 'uuid';

export class UnifiedIngestionService {

  static async processContent(payload: {
    source: string;
    content: string;
    type: string;
    metadata?: any
  }): Promise<void> {
    const chunks = chunkText(payload.content);
    const vectors = [];

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk);
      vectors.push({
        id: uuidv4(),
        vector: embedding,
        metadata: {
          ...payload.metadata,
          source: payload.source,
          type: payload.type,
          chunk: chunk
        }
      });
    }

    await vectorStore.add(vectors);
  }
  
  static async ingestAllModels(modelsDir?: string, _force: boolean = false): Promise<void> {
    // [DEPRECATED] 
    // This used to load 2025 snapshot files from `latest_models`.
    // We now rely 100% on the live `ProviderManager.syncModelsToRegistry()` which runs
    // immediately after this service in `index.ts`.
    // Keeping this method signature to avoid breaking imports, but it is now a no-op.
    
    console.log('[UnifiedIngestionService] ⚡ Skipping legacy file ingestion (Using live Registry Sync instead).');
  }


}
