import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '../db.js';

/**
 * Scans for raw JSON files saved by ProviderManager
 * and creates/populates tables from the JSON data
 */
export async function autoLoadRawJsonFiles() {
  try {
    const rootDir = process.cwd();
    const latestModelsDir = join(rootDir, 'latest_models');
    console.log(`[JsonLoader] 🔍 Scanning ${latestModelsDir} for provider JSON files...`);

    const files = await readdir(latestModelsDir);
    const jsonFiles = files.filter(f =>
      f.match(/^(google|mistral|openrouter|groq|ollama|nvidia|cerebras)_models_.*\.json$/)
    );

    if (jsonFiles.length === 0) {
      console.log('[JsonLoader] ℹ️ No provider JSON files found in', latestModelsDir);
      return;
    }

    console.log(`[JsonLoader] ✓ Found ${jsonFiles.length} latest model files: ${jsonFiles.join(', ')}`);

    for (const file of jsonFiles) {
      try {
        const filepath = join(latestModelsDir, file);
        const content = await readFile(filepath, 'utf-8');
        const jsonData = JSON.parse(content);

        const match = file.match(/^(\w+)_models_/);
        if (!match) continue;

        const providerType = match[1];
        const tableName = `raw_${providerType}_models`;
        const rows = Array.isArray(jsonData) ? jsonData : [jsonData];

        console.log(`[JsonLoader] 📊 Creating table ${tableName} with ${rows.length} rows...`);

        // Extract all unique keys
        const keysSet = new Set<string>();
        rows.forEach(obj => {
          if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(k => keysSet.add(k));
          }
        });

        const keys = Array.from(keysSet).sort();
        if (keys.length === 0) {
          console.warn(`[JsonLoader] ⚠️ No keys in ${file}`);
          continue;
        }

        // Drop existing table
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);

        // FIX: Handle 'id' collision - rename 'id' to 'model_id' to avoid conflict with PK
        const columnDefs = keys.map(k => {
          if (k === 'id') return `"model_id" TEXT`;
          return `"${k}" TEXT`;
        }).join(', ');

        const createSql = `CREATE TABLE "${tableName}" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          _loaded_at TIMESTAMP DEFAULT NOW(),
          ${columnDefs}
        )`;

        await prisma.$executeRawUnsafe(createSql);
    //     console.log(`[JsonLoader] ✅ Created table ${tableName}`);

        // Insert all rows
        let inserted = 0;
        for (const row of rows) {
          const cols = keys.map(k => {
            if (k === 'id') return `"model_id"`;
            return `"${k}"`;
          }).join(', ');

          const vals = keys.map(k => {
            const v = (row as Record<string, unknown>)[k];
            // Use JSON.stringify for all non-string values to avoid [object Object] warnings.
            const s = (typeof v === 'string' ? v : JSON.stringify(v === undefined ? null : v)).replace(/'/g, "''");
            if (v !== null && typeof v === 'object') {
                return `'${s}'::jsonb`;
            }
            return `'${s}'`;
          }).join(', ');

          await prisma.$executeRawUnsafe(`INSERT INTO "${tableName}" (${cols}) VALUES (${vals})`);
          inserted++;
        }

        // console.log(`[JsonLoader] ✅ Inserted ${inserted} rows into ${tableName}`);
      } catch (err) {
        console.error(`[JsonLoader] ✗ Failed to load ${file}:`, (err as Error).message);
      }
    }

    // console.log('[JsonLoader] ✅ Raw JSON load complete');
  } catch (err) {
    console.error('[JsonLoader] ❌ Error:', (err as Error).message);
  }
}
