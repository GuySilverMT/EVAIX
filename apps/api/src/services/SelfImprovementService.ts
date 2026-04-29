import fs from 'fs/promises';
import path from 'path';
import { UnifiedIngestionService } from './UnifiedIngestionService.js';

export class SelfImprovementService {
  private readonly ROOT_PATH = process.cwd(); // Targets the execution root (usually ./ in docker or project root)

  // Configuration for the "Ouroboros" scope
  private readonly TARGET_EXTENSIONS = ['.ts', '.js', '.json', '.md'];
  private readonly IGNORED_DIRS = ['node_modules', 'dist', '.git', 'coverage', 'apps/api/dist'];

  /**
   * The Entry Point: Orchestrates the self-improvement cycle.
   * Currently scoped to Step 1: Ingestion.
   */
  async autoImprove(): Promise<any> {
    console.log('🐍 Ouroboros Loop Initiated: Beginning Self-Ingestion.');

    try {
      // Step 1: Index the current codebase to update the Vector Store context
      const fileCount = await this.indexCodebase();

      console.log(`✅ Self-Ingestion Complete. Indexed ${fileCount} files.`);

      // Placeholder for Steps 2 & 3 (Assessment & Rewrite)
      // await this.assessCodeQuality();
      // await this.applyRefinements();

      return { status: 'success', indexedFiles: fileCount };

    } catch (error) {
      console.error('❌ Ouroboros Loop Failed:', error);
      // In the future, this triggers the Rollback mechanism
      throw error;
    }
  }

  /**
   * Recursively crawls the file system and feeds data to the Ingestion Service.
   */
  private async indexCodebase(dir: string = this.ROOT_PATH): Promise<number> {
    let processedCount = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Guardrails: Skip ignored directories
      if (entry.isDirectory()) {
        if (this.IGNORED_DIRS.includes(entry.name)) continue;
        // Skip hidden directories (starting with .)
        if (entry.name.startsWith('.')) continue;

        processedCount += await this.indexCodebase(fullPath);
        continue;
      }

      // Filter: Only ingest relevant source code and documentation
      if (this.isValidFileType(entry.name)) {
        await this.ingestFile(fullPath);
        processedCount++;
      }
    }

    return processedCount;
  }

  /**
   * Reads the file and pushes it to UnifiedIngestionService.
   * Wraps the ingestion to ensure the system doesn't crash on a single bad file.
   */
  private async ingestFile(filePath: string): Promise<void> {
    try {
      // We assume UnifiedIngestionService handles the logic of chunking and embedding
      // We pass metadata 'isSystemSelfReflection: true' to distinguish these embeddings
      await this.ingestFileContent(filePath);
    } catch (err: any) {
      console.warn(`Failed to ingest file: ${filePath}`, err.message);
    }
  }

  /**
   * Helper to bridge fs to the ingestion service.
   * Assumes UnifiedIngestionService has a generic 'processContent' or similar.
   */
  private async ingestFileContent(filePath: string) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.ROOT_PATH, filePath);

    // Call the existing service.
    await UnifiedIngestionService.processContent({
      source: relativePath,
      content: content,
      type: 'codebase',
      metadata: {
        isSelfReflection: true,
        absolutePath: filePath,
        extension: path.extname(filePath)
      }
    });
  }

  private isValidFileType(filename: string): boolean {
    const ext = path.extname(filename);
    return this.TARGET_EXTENSIONS.includes(ext);
  }
}
