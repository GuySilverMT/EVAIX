import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PgVectorStore } from '../vector.service.js';

describe('PgVectorStore', () => {
  const storePath = join(process.cwd(), 'apps/api/.evaix/vectorEmbeddings.json');

  beforeEach(async () => {
    await fs.rm(storePath, { force: true });
  });

  afterEach(async () => {
    await fs.rm(storePath, { force: true });
  });

  it('persists vectors to the JSON store and returns them by similarity', async () => {
    const store = new PgVectorStore();
    await store.add([
      { id: '1', vector: [1, 0], metadata: { chunk: 'alpha', workspaceId: 'ws-1' } },
      { id: '2', vector: [0, 1], metadata: { chunk: 'beta', workspaceId: 'ws-1' } },
    ]);

    const results = await store.search([1, 0], 5, { workspaceId: 'ws-1' });

    expect(results[0]?.id).toBe('1');
    expect(results[0]?.metadata.chunk).toBe('alpha');
  });
});
