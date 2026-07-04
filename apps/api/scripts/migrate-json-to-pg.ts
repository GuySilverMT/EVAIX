/**
 * @file migrate-json-to-pg.ts
 * @description Migration script to transfer vector embeddings from JSON to PostgreSQL
 * 
 * This script reads the vectorEmbeddings.json file and bulk-inserts the data
 * into the agent_dna table with pgvector support.
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://myuser:mypassword@127.0.0.1:5432/mydb';

// Path to the JSON file
const jsonFilePath = join(__dirname, '../apps/api/.evaix/vectorEmbeddings.json');

interface VectorData {
  id: string;
  content: string;
  filePath: string;
  metadata: {
    filePath: string;
    chunk: string;
    contentHash: string;
  };
  workspaceId: string | null;
  vector: number[];
}

interface EmbeddingFile {
  vectors: VectorData[];
}

async function migrateJsonToPostgres() {
  console.log('🚀 Starting vector migration from JSON to PostgreSQL...');
  
  const sql = postgres(connectionString);
  
  try {
    // Check if the table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'agent_dna'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.error('❌ agent_dna table does not exist. Please run init-vector-db.sql first.');
      process.exit(1);
    }
    
    console.log('✅ agent_dna table exists');
    
    // Read and parse the JSON file
    console.log('📖 Reading vector embeddings JSON file...');
    const jsonData = readFileSync(jsonFilePath, 'utf-8');
    const data: EmbeddingFile = JSON.parse(jsonData);
    
    console.log(`📊 Found ${data.vectors.length} vector embeddings to migrate`);
    
    // Prepare batch insert
    const batchSize = 10; // Reduced batch size for stability
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < data.vectors.length; i += batchSize) {
      const batch = data.vectors.slice(i, i + batchSize);
      
      try {
        // Build insert query with proper vector casting using SQL template
        for (const vectorData of batch) {
          const vectorString = vectorData.vector.join(',');
          
          await sql.unsafe(`
            INSERT INTO agent_dna (agent_id, chunk_content, embedding)
            VALUES (
              '${(vectorData.id || '').replace(/'/g, "''")}',
              '${(vectorData.content.replace(/'/g, "''"))}',
              ARRAY[${vectorString}]::vector
            )
            ON CONFLICT DO NOTHING
          `);
          successCount++;
        }
        
        if (successCount % 100 === 0) {
          console.log(`📈 Progress: ${successCount}/${data.vectors.length} embeddings migrated`);
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${i}-${i + batchSize}:`, error);
        errorCount += batch.length;
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`📊 Successfully migrated: ${successCount} embeddings`);
    console.log(`❌ Failed: ${errorCount} embeddings`);
    
    // Verify the migration
    const countResult = await sql`SELECT COUNT(*) as count FROM agent_dna`;
    console.log(`🔍 Total embeddings in database: ${countResult[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migration
migrateJsonToPostgres().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
