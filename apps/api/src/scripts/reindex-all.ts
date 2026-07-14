import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { fileWatcherService } from '../services/FileWatcherService.js';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { chunkText } from '../services/vector.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APPS_API_ROOT = path.join(__dirname, '../../');

function findWorkspaceRoot(): string {
  let current = APPS_API_ROOT;
  while (true) {
    const pnpmWorkspace = path.join(current, 'pnpm-workspace.yaml');
    if (existsSync(pnpmWorkspace)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return APPS_API_ROOT;
}

const root = findWorkspaceRoot();

async function scanDir(dir: string, fileList: string[] = []): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await scanDir(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }
  } catch (e) {
    // ignore
  }
  return fileList;
}

async function main() {
  console.log('[Reindexer] Starting full scan and re-indexing of all codebase files...');
  
  // Initialize ignore filter first
  await (fileWatcherService as any).initializeIgnoreFilter();

  const pathsToWatch = [
    path.join(root, 'apps'),
    path.join(root, 'packages'),
    path.join(root, 'agents'),
    path.join(root, 'apps/api/data/agents')
  ];

  const allFiles: string[] = [];
  for (const p of pathsToWatch) {
    console.log(`[Reindexer] Scanning ${p}...`);
    await scanDir(p, allFiles);
  }

  console.log(`[Reindexer] Scanned ${allFiles.length} total files. Filtering processable files...`);

  const processableFiles: string[] = [];
  for (const file of allFiles) {
    const ext = path.extname(file).toLowerCase();
    const isIgnoredByWatcher = (fileWatcherService as any).shouldIgnore(file);
    const isProcessable = await (fileWatcherService as any).isProcessableFile(file, ext);
    if (!isIgnoredByWatcher && isProcessable) {
      processableFiles.push(file);
    }
  }

  console.log(`[Reindexer] Found ${processableFiles.length} processable files to index.`);

  let count = 0;
  for (const file of processableFiles) {
    count++;
    console.log(`[Reindexer] [${count}/${processableFiles.length}] Processing ${path.basename(file)}...`);
    try {
      const content = await fs.readFile(file, 'utf-8');
      const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
      const chunks = chunkText(content);
      const vectors = await (fileWatcherService as any).createVectorsForChunks(file, chunks, hash);
      if (vectors.length > 0) {
        await (fileWatcherService as any).storeVectorsAndIndex(file, vectors, hash);
      }
    } catch (err: any) {
      console.error(`[Reindexer] Failed to index ${file}:`, err.message);
    }
  }

  console.log('[Reindexer] ✅ Full re-indexing complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('[Reindexer] Fatal error:', err);
  process.exit(1);
});
