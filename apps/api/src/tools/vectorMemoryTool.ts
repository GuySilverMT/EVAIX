/**
 * @file vectorMemoryTool.ts
 * @description Agentic memory tooling for vector similarity search using PostgreSQL pgvector
 * 
 * This tool provides a standard interface for agents to query the agent_dna table
 * for semantic search and memory retrieval without relying on file-system JSON access.
 */

import postgres from 'postgres';
import { z } from 'zod';

// Database connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://myuser:mypassword@127.0.0.1:5432/mydb';

// Create a postgres connection
const sql = postgres(connectionString);

/**
 * Schema for vector search query parameters
 */
export const VectorSearchSchema = z.object({
  query: z.string().describe('The search query text to find similar memories for'),
  agentId: z.string().optional().describe('Optional agent ID to filter memories by agent'),
  limit: z.number().min(1).max(100).default(10).describe('Maximum number of results to return'),
  threshold: z.number().min(0).max(1).default(0.7).describe('Similarity threshold (0-1, higher = more similar)'),
});

export type VectorSearchParams = z.infer<typeof VectorSearchSchema>;

/**
 * Schema for storing new memories
 */
export const StoreMemorySchema = z.object({
  agentId: z.string().describe('The agent ID that owns this memory'),
  content: z.string().describe('The text content to store as memory'),
  embedding: z.array(z.number()).length(1536).describe('1536-dimensional vector embedding'),
});

export type StoreMemoryParams = z.infer<typeof StoreMemorySchema>;

/**
 * Vector Memory Tool Class
 * Provides methods for semantic search and memory storage
 */
export class VectorMemoryTool {
  /**
   * Perform semantic search on stored memories
   * 
   * @param params - Search parameters including query text and optional filters
   * @returns Array of similar memories with similarity scores
   */
  async searchMemories(params: VectorSearchParams) {
    const { query, agentId, limit, threshold } = params;
    
    try {
      // First, we need to generate an embedding for the query
      // This would typically call an embedding service
      // For now, we'll use a placeholder approach
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Build the similarity search query
      const results = await sql`
        SELECT 
          id,
          agent_id,
          chunk_content,
          1 - (embedding <=> ${queryEmbedding}::vector) as similarity
        FROM agent_dna
        WHERE ${agentId ? sql`agent_id = ${agentId}` : sql`1 = 1`}
          AND 1 - (embedding <=> ${queryEmbedding}::vector) >= ${threshold}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT ${limit}
      `;
      
      return {
        success: true,
        results: results.map(row => ({
          id: row.id,
          agentId: row.agent_id,
          content: row.chunk_content,
          similarity: row.similarity,
        })),
        count: results.length,
      };
    } catch (error) {
      console.error('Vector search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
        count: 0,
      };
    }
  }

  /**
   * Store a new memory with its embedding
   * 
   * @param params - Memory storage parameters
   * @returns Success status and inserted record ID
   */
  async storeMemory(params: StoreMemoryParams) {
    const { agentId, content, embedding } = params;
    
    try {
      const result = await sql`
        INSERT INTO agent_dna (agent_id, chunk_content, embedding)
        VALUES (${agentId}, ${content}, ${embedding}::vector)
        RETURNING id
      `;
      
      return {
        success: true,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Memory storage failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all memories for a specific agent
   * 
   * @param agentId - The agent ID to retrieve memories for
   * @param limit - Maximum number of memories to return
   * @returns Array of memories for the agent
   */
  async getAgentMemories(agentId: string, limit: number = 100) {
    try {
      const results = await sql`
        SELECT id, agent_id, chunk_content, created_at, updated_at
        FROM agent_dna
        WHERE agent_id = ${agentId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return {
        success: true,
        memories: results.map(row => ({
          id: row.id,
          agentId: row.agent_id,
          content: row.chunk_content,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        count: results.length,
      };
    } catch (error) {
      console.error('Failed to retrieve agent memories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        memories: [],
        count: 0,
      };
    }
  }

  /**
   * Delete a specific memory by ID
   * 
   * @param memoryId - The ID of the memory to delete
   * @returns Success status
   */
  async deleteMemory(memoryId: string) {
    try {
      await sql`DELETE FROM agent_dna WHERE id = ${memoryId}`;
      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate embedding for text (placeholder implementation)
   * In production, this would call an embedding service like OpenAI's text-embedding-3-small
   * 
   * @param text - The text to generate an embedding for
   * @returns 1536-dimensional vector array
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Integrate with actual embedding service
    // For now, return a zero vector as placeholder
    console.warn('Embedding generation not implemented - using placeholder zero vector');
    return new Array(1536).fill(0);
  }

  /**
   * Clean up database connection
   */
  async cleanup() {
    await sql.end();
  }
}

/**
 * Singleton instance for use across the application
 */
export const vectorMemoryTool = new VectorMemoryTool();

/**
 * Tool definition for Mastra/agent framework integration
 */
export const vectorMemoryToolDefinition = {
  name: 'vector_memory_search',
  description: 'Search through stored memories using semantic similarity search',
  parameters: VectorSearchSchema,
  execute: async (params: VectorSearchParams) => {
    return await vectorMemoryTool.searchMemories(params);
  },
};

export const storeMemoryToolDefinition = {
  name: 'store_memory',
  description: 'Store a new memory with its vector embedding',
  parameters: StoreMemorySchema,
  execute: async (params: StoreMemoryParams) => {
    return await vectorMemoryTool.storeMemory(params);
  },
};

export const getAgentMemoriesToolDefinition = {
  name: 'get_agent_memories',
  description: 'Retrieve all memories for a specific agent',
  parameters: z.object({
    agentId: z.string().describe('The agent ID to retrieve memories for'),
    limit: z.number().min(1).max(100).default(100).describe('Maximum number of memories to return'),
  }),
  execute: async (params: { agentId: string; limit: number }) => {
    return await vectorMemoryTool.getAgentMemories(params.agentId, params.limit);
  },
};
