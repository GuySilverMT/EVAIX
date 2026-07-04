-- EVAIX Vector Database Schema Recovery
-- This script initializes the agent_dna table with pgvector support
-- for agentic memory and semantic search capabilities

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create agent_dna table for storing vector embeddings
CREATE TABLE IF NOT EXISTS agent_dna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW index for fast cosine similarity search
-- HNSW (Hierarchical Navigable Small World) is optimized for vector similarity
CREATE INDEX IF NOT EXISTS agent_dna_embedding_idx 
ON agent_dna 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index on agent_id for filtering by agent
CREATE INDEX IF NOT EXISTS agent_dna_agent_id_idx 
ON agent_dna (agent_id);

-- Add comments for documentation
COMMENT ON TABLE agent_dna IS 'Stores vector embeddings for agentic memory and semantic search';
COMMENT ON COLUMN agent_dna.id IS 'Unique identifier for each memory chunk';
COMMENT ON COLUMN agent_dna.agent_id IS 'Identifier for the agent that owns this memory';
COMMENT ON COLUMN agent_dna.chunk_content IS 'Text content of the memory chunk';
COMMENT ON COLUMN agent_dna.embedding IS '384-dimensional vector embedding (OpenAI text-embedding-3-small)';
COMMENT ON INDEX agent_dna_embedding_idx IS 'HNSW index for fast cosine similarity search';

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_agent_dna_updated_at 
    BEFORE UPDATE ON agent_dna 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
