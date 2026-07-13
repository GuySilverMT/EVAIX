import fs from 'fs';
import path from 'path';

// Node.js 20+ feature check - safe fallback if needed, though package.json says ^20.12.12
const { openAsBlob, existsSync, mkdirSync, writeFileSync, readFileSync } = fs;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class UnstructuredIngestionService {
  private static SHADOW_DIR = path.join(process.cwd(), '.domoreai/shadow');
  private static UNSTRUCTURED_API_URL = process.env.UNSTRUCTURED_API_URL || 'https://api.unstructured.io/general/v0/general';
  private static UNSTRUCTURED_API_KEY = process.env.UNSTRUCTURED_API_KEY;

  constructor() {
    this.ensureShadowDir();
  }

  private ensureShadowDir() {
    if (!existsSync(UnstructuredIngestionService.SHADOW_DIR)) {
      mkdirSync(UnstructuredIngestionService.SHADOW_DIR, { recursive: true });
    }
  }

  /**
   * Ingests a file: sends it to Unstructured API and saves the result as a shadow file.
   * Uses streaming (via openAsBlob) to prevent memory crashes on large files.
   * @param filePath Absolute path to the file to ingest.
   * @returns The path to the created shadow file.
   */
  async ingestFile(filePath: string): Promise<string> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      console.log(`[UnstructuredIngestionService] Ingesting file: ${filePath}`);

      // 1. Prepare form data using efficient Node.js Blob (Node 20+)
      // This prevents loading the entire file into V8 heap memory.
      // If fs.openAsBlob is missing (older Node), fallback would be needed,
      // but package.json requires Node 20+.
      const blob = await openAsBlob(filePath);
      const fileName = path.basename(filePath);
      const formData = new FormData();
      formData.append('files', blob, fileName);

      const headers: Record<string, string> = {};
      if (UnstructuredIngestionService.UNSTRUCTURED_API_KEY) {
        headers['unstructured-api-key'] = UnstructuredIngestionService.UNSTRUCTURED_API_KEY;
      }

      console.log(`[UnstructuredIngestionService] Sending to ${UnstructuredIngestionService.UNSTRUCTURED_API_URL}...`);
      
      const response = await this.fetchWithRetry(UnstructuredIngestionService.UNSTRUCTURED_API_URL, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      const data = await response.json();
      console.log(`[UnstructuredIngestionService] Received ${Array.isArray(data) ? data.length : 0} elements.`);

      // 2. Save as Shadow File
      const shadowFileName = `${fileName}.json`;
      const shadowFilePath = path.join(UnstructuredIngestionService.SHADOW_DIR, shadowFileName);
      
      writeFileSync(shadowFilePath, JSON.stringify(data, null, 2));
      console.log(`[UnstructuredIngestionService] Shadow file saved: ${shadowFilePath}`);

      return shadowFilePath;

    } catch (error) {
      console.error('[UnstructuredIngestionService] Error ingesting file:', error);
      throw error;
    }
  }

  /**
   * Helper to perform fetch with exponential backoff retries.
   */
  private async fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          // Don't retry client errors (4xx), except maybe 429
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
          }
          throw new Error(`API Server Error: ${response.status} ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        console.warn(`[UnstructuredIngestionService] Attempt ${attempt + 1}/${retries + 1} failed: ${error instanceof Error ? error.message : String(error)}`);

        if (attempt < retries) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Retrieves the content of a shadow file.
   */
  getShadowFile(fileName: string): any {
    const shadowFilePath = path.join(UnstructuredIngestionService.SHADOW_DIR, fileName);
    if (!existsSync(shadowFilePath)) {
      return null;
    }
    return JSON.parse(readFileSync(shadowFilePath, 'utf-8'));
  }
}

export const unstructuredIngestionService = new UnstructuredIngestionService();
