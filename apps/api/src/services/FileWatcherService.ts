import * as chokidar from 'chokidar';
import * as path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileIndexRepository } from '../repositories/FileIndexRepository.js';
import { vectorStore, chunkText, createEmbedding } from './vector.service.js';
import { getWebSocketService } from './websocket.singleton.js';
import ignore from 'ignore';

/**
 * FileWatcherService
 * 
 * Watches the filesystem for changes and automatically re-indexes modified files.
 * Uses content hashing to avoid re-indexing unchanged files.
 */
class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private readonly textExtensions = ['.ts', '.js', '.tsx', '.jsx', '.md', '.json', '.css', '.html', '.txt', '.yaml', '.yml', '.sql', '.prisma'];
  private readonly highValueExtensions = ['.ts', '.tsx', '.js', '.jsx', '.md', '.prisma'];
  private isIndexing = false;
  private indexQueue: Set<string> = new Set();
  private projectRoot: string = process.cwd();
  private ignoreFilter = ignore();

  private broadcastEvent(event: any) {
    try {
      getWebSocketService()?.broadcast(event);
    } catch {
      // Ignore WS errors
    }
  }

  private shouldIgnore(filePath: string): boolean {
    // 1. Always ignore certain patterns regardless of .gitignore
    if (
      filePath.includes('.git') ||
      filePath.includes('.domoreai/shadow') ||
      filePath.endsWith('.log') ||
      filePath.endsWith('.sqlite') ||
      filePath.endsWith('.db') ||
      filePath.includes('/tmp/')
    ) {
      return true;
    }

    // 2. Use .gitignore rules
    const relPath = path.relative(this.projectRoot, filePath);
    if (relPath && this.ignoreFilter.ignores(relPath)) {
      return true;
    }

    // 3. Fallback to basic node_modules/dist/build check for robustness
    return (
      filePath.includes('node_modules') ||
      filePath.includes('/dist/') ||
      filePath.includes('/build/') ||
      filePath.includes('/.next/') ||
      filePath.includes('/.turbo/')
    );
  }

  private setupEventHandlers(rootPath: string | string[]) {
    if (!this.watcher) return;

    // File added or changed
    this.watcher.on('add', (filePath: string) => { void this.handleFileChange(filePath, 'added'); });
    this.watcher.on('change', (filePath: string) => { void this.handleFileChange(filePath, 'changed'); });

    // File deleted
    this.watcher.on('unlink', (filePath: string) => { void this.handleFileDelete(filePath); });

    this.watcher.on('error', (error: unknown) => {
      console.error('[FileWatcher] ❌ Error:', error);
    });

    this.watcher.on('ready', () => {
      console.log('[FileWatcher] ✅ Ready and watching for changes');
      this.broadcastEvent({
        type: 'filewatcher.ready',
        path: rootPath
      });
    });
  }

  /**
   * Start watching a directory for file changes
   */
  async startWatching(rootPath: string | string[]) {
    // Initialize ignore filter before starting
    await this.initializeIgnoreFilter();

    if (this.watcher) {
      console.log('[FileWatcher] Already watching. Stopping previous watcher...');
      await this.stopWatching();
    }

    console.log(`[FileWatcher] 👁️  Starting file watcher for: ${rootPath}`);

    this.watcher = chokidar.watch(rootPath, {
      ignored: (filePath: string) => this.shouldIgnore(filePath),
      persistent: true,
      ignoreInitial: false, // Trigger 'add' for existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.setupEventHandlers(rootPath);
  }

  /**
   * Stop watching
   */
  async stopWatching() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('[FileWatcher] 🛑 Stopped watching');
    }
  }

  /**
   * Start watching the entire project root automatically
   */
  async startAutomatedWatching() {
    const apiDir = process.cwd();
    this.projectRoot = path.resolve(apiDir, '../../');
    
    // Specifically watch high-value directories to avoid root-level noise
    const pathsToWatch = [
      path.join(this.projectRoot, 'apps'),
      path.join(this.projectRoot, 'packages'),
      path.join(this.projectRoot, 'agents')
    ];

    console.log(`[FileWatcher] 🤖 Initializing automated watching for: ${pathsToWatch.join(', ')}`);
    await this.startWatching(pathsToWatch);
  }

  /**
   * Initialize the ignore filter from .gitignore
   */
  private async initializeIgnoreFilter() {
    try {
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      this.ignoreFilter = ignore().add(content);
      console.log('[FileWatcher] 🛡️  Loaded .gitignore rules');
    } catch (err) {
      console.warn('[FileWatcher] ⚠️  Could not load .gitignore, using defaults:', err);
      this.ignoreFilter = ignore();
    }
  }

  private async isProcessableFile(filePath: string, ext: string): Promise<boolean> {
    // Only process text files
    if (!this.textExtensions.includes(ext)) {
      return false;
    }

    // SMART FILTERING: Skip noise files that are technically text but unhelpful for embeddings
    const fileName = path.basename(filePath);
    const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize for cross-platform matching
    
    if (
      fileName === 'package-lock.json' || 
      fileName === 'pnpm-lock.yaml' || 
      fileName === 'yarn.lock' ||
      normalizedPath.includes('/node_modules/') ||
      normalizedPath.includes('/dist/') ||
      normalizedPath.includes('/build/') ||
      normalizedPath.includes('/.next/') ||
      normalizedPath.includes('/.turbo/')
    ) {
      return false;
    }

    // Further restrict JSON files: only small config files are worth embedding
    if (ext === '.json') {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > 50 * 1024) { // Skip JSON > 50KB (likely data, not config)
          return false;
        }
      } catch {
        // Skip if stat fails
        return false;
      }
    }

    // Skip hidden files/directories (except .prisma which we explicitly included)
    if (path.basename(filePath).startsWith('.') && ext !== '.prisma') {
      return false;
    }

    return true;
  }

  /**
   * Handle file change (add or modify)
   */
  private async handleFileChange(filePath: string, changeType: 'added' | 'changed') {
    const ext = path.extname(filePath).toLowerCase();

    if (!(await this.isProcessableFile(filePath, ext))) {
      return;
    }

    console.log(`[FileWatcher] 📝 File ${changeType}: ${path.basename(filePath)}`);
    
    this.broadcastEvent({
      type: 'filewatcher.change',
      file: path.basename(filePath),
      filePath,
      changeType
    });

    // Add to queue and process
    this.indexQueue.add(filePath);
    void this.processQueue();
  }

  /**
   * Handle file deletion
   */
  private async handleFileDelete(filePath: string) {
    console.log(`[FileWatcher] 🗑️  File deleted: ${path.basename(filePath)}`);
    
    try {
      // Remove from FileIndex and VectorEmbedding
      await fileIndexRepository.delete(filePath);

      console.log(`[FileWatcher] ✅ Removed ${filePath} from index`);
      
      this.broadcastEvent({
        type: 'filewatcher.delete',
        file: path.basename(filePath),
        filePath
      });
    } catch (error) {
      console.error(`[FileWatcher] ❌ Error removing ${filePath} from index:`, error);
    }
  }

  /**
   * Process the index queue
   */
  private async processQueue() {
    if (this.isIndexing || this.indexQueue.size === 0) {
      return;
    }

    this.isIndexing = true;

    try {
      while (this.indexQueue.size > 0) {
        const filePath = this.indexQueue.values().next().value;
        if (!filePath) break;
        
        this.indexQueue.delete(filePath);

        try {
          // Check file size before reading
          const stats = await fs.stat(filePath);
          if (stats.size > 2 * 1024 * 1024) { // 2MB limit
            console.log(`[FileWatcher] ⏭️  Skipping ${path.basename(filePath)} — too large (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            continue;
          }

          const content = await fs.readFile(filePath, 'utf-8');
          await this.indexFile(filePath, content);
        } catch (error) {
          console.error(`[FileWatcher] ❌ Error indexing ${filePath}:`, error);
        }
      }
    } finally {
      this.isIndexing = false;

      // Process any files that were added while we were indexing
      if (this.indexQueue.size > 0) {
        void this.processQueue();
      }
    }
  }

  private async createVectorsForChunks(filePath: string, chunks: string[], hash: string): Promise<any[]> {
    const vectors = [];
    const isHighValue = this.highValueExtensions.includes(path.extname(filePath).toLowerCase());
    
    for (let i = 0; i < chunks.length; i++) {
      // If not high value and many chunks, maybe we should skip or limit
      if (!isHighValue && chunks.length > 50) {
        console.log(`[FileWatcher] ⏩ Skipping excessive chunks for low-value file: ${path.basename(filePath)}`);
        break;
      }

      const chunk = chunks[i];
      try {
        const embedding = await createEmbedding(chunk);
        vectors.push({
          id: `${filePath}#${i}`,
          vector: embedding,
          metadata: {
            filePath,
            chunk,
            contentHash: hash,
          },
        });
        
        // Progress log for large files
        if (chunks.length > 5 && (i + 1) % 5 === 0) {
          console.log(`[FileWatcher] ⏳ Progress for ${path.basename(filePath)}: ${i + 1}/${chunks.length} chunks...`);
        }
      } catch (err) {
        console.error(`[FileWatcher] ❌ Failed to embed chunk ${i} of ${filePath}:`, err);
      }
    }
    return vectors;
  }

  private async storeVectorsAndIndex(filePath: string, vectors: any[], hash: string) {
    // Delete old vectors for this file
    try {
      await fileIndexRepository.deleteVectorsByFilePath(filePath);
    } catch (err) {
      console.warn(`[FileWatcher] Could not delete old vectors for ${filePath}:`, err);
    }

    // Add new vectors
    await vectorStore.add(vectors);
    console.log(`[FileWatcher] 💾 Stored ${vectors.length} vectors for ${path.basename(filePath)}`);

    // Update FileIndex
    try {
      await fileIndexRepository.upsert(filePath, hash);
      console.log(`[FileWatcher] 🔖 Updated FileIndex for ${path.basename(filePath)}`);
      
      this.broadcastEvent({
        type: 'filewatcher.indexed',
        file: path.basename(filePath),
        filePath,
        chunks: vectors.length,
        hash
      });
    } catch (err) {
      console.warn(`[FileWatcher] Failed to update FileIndex for ${filePath}:`, err);
    }
  }

  /**
   * Index a single file (same logic as IngestionAgent)
   */
  private async indexFile(filePath: string, content: string) {
    // Compute content hash to detect unchanged files
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

    try {
      const existing = await fileIndexRepository.getByFilePath(filePath);

      if (existing && existing.contentHash === hash) {
        console.log(`[FileWatcher] ⏭️  Skipping ${path.basename(filePath)} — content unchanged`);
        return;
      }
    } catch (err) {
      console.warn(`[FileWatcher] Could not check FileIndex for ${filePath}:`, err);
      // fall through to re-embed
    }

    console.log(`[FileWatcher] 🔄 Re-indexing ${path.basename(filePath)}...`);

    const chunks = chunkText(content);
    console.log(`[FileWatcher] 📦 Created ${chunks.length} chunks`);

    // Process chunks SEQUENTIALLY to avoid overloading the model context/queue
    const vectors = await this.createVectorsForChunks(filePath, chunks, hash);

    if (vectors.length === 0) {
      console.warn(`[FileWatcher] ⚠️ No vectors created for ${filePath}`);
      return;
    }

    await this.storeVectorsAndIndex(filePath, vectors, hash);
  }

  /**
   * Get watcher status
   */
  getStatus() {
    return {
      isWatching: this.watcher !== null,
      isIndexing: this.isIndexing,
      queueSize: this.indexQueue.size,
    };
  }
}

export const fileWatcherService = new FileWatcherService();
