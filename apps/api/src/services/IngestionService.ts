import { onFileWrite } from './vfs/events.js';
import * as path from 'path';
import fs from 'fs/promises';
import { IVfsProvider } from './vfs/IVfsProvider.js';
import { vectorStore, chunkText, createEmbedding } from './vector.service.js';
import { fileIndexRepository } from '../repositories/FileIndexRepository.js';
import crypto from 'crypto';
import ignore from 'ignore';
import { getWebSocketService } from './websocket.singleton.js';

interface IgnoreFilter {
  ignores(path: string): boolean;
}

type PdfParser = (content: Buffer) => Promise<{ text: string }>;

class IngestionService {
  private pdfParse: PdfParser | null = null;
  private ignoreFilter: IgnoreFilter | null = null;
  private readonly repoRoot = process.cwd();
  private readonly textExtensions = ['.ts', '.js', '.tsx', '.jsx', '.md', '.json', '.css', '.html', '.txt', '.yaml', '.yml', '.sql'];
  private readonly binaryExtensions = ['.pdf', '.docx', '.png'];

  constructor() {
    this.subscribeToVfsEvents();
    // Initialize ignoreFilter synchronously with a placeholder
    // Will be properly initialized when needed
    this.ignoreFilter = ignore() as unknown as IgnoreFilter;
    void this.initializeIgnoreFilter()
      .then(() => {
        // Start a full repository ingest on initialization so the project root stays indexed across restarts
        // this.ingestRepository(this.repoRoot).catch(err => {
        //   console.error('[IngestionService] Failed to ingest repository on startup:', err);
        // });
      })
      .catch(err => {
        console.warn('Failed to initialize ignore filter:', err);
        this.ignoreFilter = ignore() as unknown as IgnoreFilter; // fallback to empty ignore
        // Still attempt to ingest even if ignore couldn't be read
        // this.ingestRepository(this.repoRoot).catch(_e => console.error('[IngestionService] Failed to ingest repository on startup (fallback):', _e));
      });
  }

  private async initializeIgnoreFilter(): Promise<void> {
    try {
      const gitignoreContent = await this.readGitIgnore();
      this.ignoreFilter = ignore().add(gitignoreContent) as unknown as IgnoreFilter;
    } catch (error) {
      console.warn('Failed to read .gitignore. Indexing all files.', error);
      this.ignoreFilter = ignore() as unknown as IgnoreFilter; // Allow all files if .gitignore can't be read
    }
  }

  private async readGitIgnore(): Promise<string> {
    const localGitignorePath = path.join(this.repoRoot, '.gitignore');
    try {
      return await fs.readFile(localGitignorePath, 'utf-8');
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        // Fallback to monorepo root .gitignore
        const rootGitignorePath = path.resolve(this.repoRoot, '../../.gitignore');
        try {
          return await fs.readFile(rootGitignorePath, 'utf-8');
        } catch {
          throw error; // Throw original error if both fail
        }
      }
      throw error;
    }
  }

  private subscribeToVfsEvents() {
    onFileWrite((data) => {
      void this.handleFileWrite(data.provider, data.filePath, data.content);
    });
  }

  private async handleFileWrite(provider: IVfsProvider, filePath: string, content: Buffer) {
    const fileExtension = path.extname(filePath).toLowerCase();

    if (this.textExtensions.includes(fileExtension)) {
      // Check if the file should be ignored
      const relPath = path.relative(this.repoRoot, filePath);

      // Guard against files outside the repo root to prevent ignore() from crashing
      if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
        return;
      }

      if (this.ignoreFilter && !this.ignoreFilter.ignores(relPath)) {
        const text = content.toString('utf-8');
        await this.indexFile(filePath, text);
      } else if (!this.ignoreFilter) {
        // If ignoreFilter not ready, index anyway
        const text = content.toString('utf-8');
        await this.indexFile(filePath, text);
      }
    } else if (this.binaryExtensions.includes(fileExtension)) {
      try {
        const markdownContent = await this.parseFile(fileExtension, content);
        const shadowFilePath = await this.generateShadowFile(provider, filePath, markdownContent);

        // Check if the file should be ignored
        const relShadowPath = path.relative(this.repoRoot, shadowFilePath);

        // Guard against files outside the repo root
        if (relShadowPath.startsWith('..') || path.isAbsolute(relShadowPath)) {
          return;
        }

        if (this.ignoreFilter && !this.ignoreFilter.ignores(relShadowPath)) {
          await this.indexFile(shadowFilePath, markdownContent);
        } else if (!this.ignoreFilter) {
          // If ignoreFilter not ready, index anyway
          await this.indexFile(shadowFilePath, markdownContent);
        }

      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
  }

  public async ingestRepository(dir: string) {
    console.log(`[IngestionService] 🚀 Scanning directory: ${dir}`);
    try { if (dir === this.repoRoot) getWebSocketService()?.broadcast({ type: 'ingest.start', path: dir }); } catch { /* Ignore */ }
    let totalFiles = 0;
    let processedFiles = 0;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.domoreai' || entry.name === 'dist' || entry.name === '.turbo') {
            console.log(`[IngestionService] ⏭️  Skipping: ${fullPath}`);
            continue;
          }
          await this.ingestRepository(fullPath);
        } else {
          // Check ignore with proper type check
          const rel = path.relative(this.repoRoot, fullPath);

          // Guard against files outside root (shouldn't happen during directory scan but safe to add)
          if (rel.startsWith('..') || path.isAbsolute(rel)) {
            continue;
          }

          if (this.ignoreFilter && this.ignoreFilter.ignores(rel)) {
            const displayName = path.basename(fullPath);
            console.log(`[IngestionService] 🚫 Ignored: ${displayName}`);
            continue;
          }

          const ext = path.extname(fullPath).toLowerCase();
          if (this.textExtensions.includes(ext)) {
            totalFiles++;
            const displayName = path.basename(fullPath);
            console.log(`[IngestionService] 📄 Processing file ${totalFiles}: ${displayName}`);
            try { getWebSocketService()?.broadcast({ type: 'ingest.file.start', file: displayName, filePath: fullPath }); } catch { /* Ignore */ }
            const content = await fs.readFile(fullPath);
            const text = content.toString('utf-8');
            await this.indexFile(fullPath, text);
            processedFiles++;
            console.log(`[IngestionService] ✅ Indexed file ${processedFiles}/${totalFiles}: ${displayName}`);
            try { getWebSocketService()?.broadcast({ type: 'ingest.file.complete', file: displayName, filePath: fullPath, processedFiles, totalFiles }); } catch { /* Ignore */ }
          }
        }
      }
      console.log(`[IngestionService] 🏁 Completed: ${processedFiles}/${totalFiles} files indexed from ${dir}`);
      try { if (dir === this.repoRoot) getWebSocketService()?.broadcast({ type: 'ingest.complete', path: dir, processedFiles, totalFiles }); } catch { /* Ignore */ }
    } catch (err) {
      console.error(`[IngestionService] ❌ Error scanning directory ${dir}:`, err);
    }
  }

  private async indexFile(filePath: string, content: string) {
    // Compute content hash to detect unchanged files
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

    try {
      const existing = await fileIndexRepository.getByFilePath(filePath);

      if (existing && existing.contentHash === hash) {
        console.log(`[IngestionService] ⚠️ Skipping ${filePath} — content unchanged (hash ${hash})`);
        try { getWebSocketService()?.broadcast({ type: 'ingest.file.skipped', file: path.basename(filePath), filePath, hash }); } catch { /* Ignore */ }
        return;
      }
    } catch (err) {
      console.warn(`[IngestionService] Could not check FileIndex for ${filePath}:`, err);
      // fall through to re-embed
    }

    const chunks = chunkText(content);
    console.log(`[IngestionService] 📦 Created ${chunks.length} chunks from ${filePath}`);
    const vectors = await Promise.all(chunks.map(async (chunk, i) => {
      const embedding = await createEmbedding(chunk);
      return {
        id: `${filePath}#${i}`,
        vector: embedding,
        metadata: {
          filePath,
          chunk,
          contentHash: hash,
        },
      };
    }));

    await vectorStore.add(vectors);
    console.log(`[IngestionService] 💾 Stored ${vectors.length} vectors for ${filePath}`);
    try { getWebSocketService()?.broadcast({ type: 'ingest.file.stored', file: path.basename(filePath), filePath, chunks: vectors.length }); } catch { /* Ignore */ }
    // Upsert file hash into FileIndex so future ingests can skip unchanged files
    try {
      await fileIndexRepository.upsert(filePath, hash);
      console.log(`[IngestionService] 🔖 Updated FileIndex for ${filePath} (hash ${hash})`);
      try { getWebSocketService()?.broadcast({ type: 'ingest.file.indexed', file: path.basename(filePath), filePath, hash }); } catch { /* Ignore */ }
    } catch (err) {
      console.warn(`[IngestionService] Failed to update FileIndex for ${filePath}:`, err);
    }
  }

  private async generateShadowFile(provider: IVfsProvider, originalPath: string, markdownContent: string): Promise<string> {
    const originalPathInfo = path.parse(originalPath);
    const shadowFileName = `${originalPathInfo.name}.md`;
    const shadowFilePath = path.join(originalPathInfo.dir, '.domoreai', 'shadow', shadowFileName);

    await provider.write(shadowFilePath, markdownContent);
    console.log(`Shadow file created: ${shadowFilePath}`);
    return shadowFilePath;
  }

  private async parseFile(fileExtension: string, content: Buffer): Promise<string> {
    if (this.textExtensions.includes(fileExtension)) {
      return content.toString('utf-8');
    }

    switch (fileExtension) {
      case '.pdf':
        if (!this.pdfParse) {
          const mod = await import('pdf-parse') as { default?: PdfParser } | PdfParser;
          this.pdfParse = (mod as { default?: PdfParser }).default || (mod as PdfParser);
        }
        if (this.pdfParse) {
          const data = await this.pdfParse(content);
          return data.text;
        }
        return '';
      case '.docx':
        // TODO: Implement DOCX parsing, potentially using a library like 'mammoth'
        console.log('DOCX parsing not yet implemented.');
        return 'DOCX content placeholder';
      case '.png':
        // TODO: Implement PNG parsing using a multimodal LLM
        console.log('PNG parsing not yet implemented.');
        return 'PNG content placeholder';
      default:
        throw new Error(`Unsupported file type for parsing: ${fileExtension}`);
    }
  }
}

export const ingestionService = new IngestionService();
