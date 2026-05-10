import { prisma } from '../db.js';

interface RawModelResponse {
  models?: unknown[];
  data?: unknown[]; // OpenAI-compatible standard
  nextPageToken?: string;
}

export class RawModelService {

  static async fetchAndSnapshot(providerConfigId: string) {
    // 1. Get Config
    const config = await prisma.providerConfig.findUnique({
      where: { id: providerConfigId }
    });

    if (!config) throw new Error(`Provider Config ${providerConfigId} not found`);

    // 2. Prepare URL with provider-aware defaults and normalization
    let url = config.baseUrl;
    if (!url) {
      if (config.type === 'openai') url = 'https://api.openai.com/v1';
      else if (config.type === 'openrouter') url = 'https://openrouter.ai/api/v1';
      else if (config.type === 'mistral') url = 'https://api.mistral.ai/v1';
      else if (config.type === 'groq') url = 'https://api.groq.com/openai/v1';
      else if (config.type === 'anthropic') url = 'https://api.anthropic.com/v1';
      else if (config.type === 'ollama') url = 'http://localhost:11434';
      else if (config.type === 'google') url = 'https://generativelanguage.googleapis.com/v1beta';
      else if (config.type === 'nvidia') url = 'https://integrate.api.nvidia.com/v1';
      else if (config.type === 'cerebras') url = 'https://api.cerebras.ai/v1';
      else if (config.type === 'xai') url = 'https://api.x.ai/v1';
      else if (config.type === 'deepseek') url = 'https://api.deepseek.com';
    }

    // Normalize Ollama URL (strip trailing /v1 if present)
    const looksLikeOllama = config.type === 'ollama' || /:11434(\/|$)/.test(url || '');
    if (looksLikeOllama && url) {
      url = url.replace(/\/?v1\/?$/, '');
    }

    // Remove trailing slash and add endpoint
    url = url?.replace(/\/$/, '') || '';

    let fetchUrl = '';
    if (looksLikeOllama) {
      fetchUrl = url.endsWith('/api/tags') ? url : `${url}/api/tags`;
    } else if (config.type === 'google') {
      // CORRECTED: Use the v1 endpoint which provides the full model catalog,
      // not the v1beta endpoint which only lists a small subset.
      fetchUrl = 'https://generativelanguage.googleapis.com/v1/models?pageSize=100';
    } else {
      // OpenAI Compatible
      fetchUrl = url.endsWith('/models') ? url : `${url}/models`;
    }

    console.log(`[RawModelService] Attempting to fetch models from provider endpoint: ${fetchUrl}`);

    // 3. Fetch (Raw)
    const allModels: unknown[] = [];
    let nextUrl: string | undefined = fetchUrl;

    // Resolve API Key
    let apiKey = '';
    const envMappings: Record<string, string> = {
      'google': 'GOOGLE_GENERATIVE_AI_API_KEY',
      'mistral': 'MISTRAL_API_KEY',
      'openrouter': 'OPENROUTER_API_KEY',
      'groq': 'GROQ_API_KEY',
      'nvidia': 'NVIDIA_API_KEY',
      'cerebras': 'CEREBRAS_API_KEY',
      'ollama': 'OLLAMA_API_KEY',
      'xai': 'XAI_API_KEY'
    };

    // Try mapping first, then fall back to convention
    const envVar = envMappings[config.type];
    if (envVar && process.env[envVar]) {
      apiKey = process.env[envVar] || '';
    } else {
      apiKey = process.env[`${config.type.toUpperCase()}_API_KEY`] || '';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (apiKey) {
        if (config.type === 'google') {
          headers['x-goog-api-key'] = apiKey;
        } else if (!looksLikeOllama) {
          headers.Authorization = `Bearer ${String(apiKey)}`;
        }
      }

      // --- PAGINATION LOOP ---
      while (nextUrl) {
        console.log(`[RawModelService] Fetching page: ${nextUrl}`);
        const response = await fetch(nextUrl, {
          headers,
          signal: controller.signal
        });

        if (!response.ok) {
          const txt = await response.text();
          throw new Error(`Provider API Error: ${response.status} ${txt}`);
        }

        const pageJson = await response.json() as RawModelResponse;

        // Extract models from the current page (OpenAI uses 'data', Google/Ollama uses 'models')
        const pageModels = (pageJson.data || pageJson.models || []) as unknown[];
        if (pageModels.length === 0) {
          console.log('[RawModelService] ⚠️ Found 0 models in page. Response keys:', Object.keys(pageJson));
          console.log('[RawModelService] Preview:', JSON.stringify(pageJson).slice(0, 100));
        }
        allModels.push(...pageModels);

        // Check for the next page token
        if (pageJson.nextPageToken) {
          // Construct the URL for the next page
          const baseUrl = fetchUrl.split('?')[0];
          nextUrl = `${baseUrl}?pageSize=100&pageToken=${pageJson.nextPageToken}`;
        } else {
          nextUrl = undefined; // No more pages, exit loop
        }
      }

      // 5. Save to DB (Exact dump)
      // NOTE: RawDataLake table has been replaced by provider-specific tables
      // (raw_google_models, raw_groq_models, etc.) which are created by RawJsonLoader
      // from the JSON files in latest_models/ directory.
      console.log(`[RawModelService] Successfully fetched ${allModels.length} models from ${config.type}`);

      // Return a mock snapshot object for backward compatibility
      return {
        id: `${config.type}-${Date.now()}`,
        provider: config.type,
        rawData: allModels,
        ingestedAt: new Date()
      };

    } catch (error: unknown) {
      clearTimeout(timeoutId);
      console.error(`[RawModelService] Dynamic fetch failed for ${fetchUrl}:`, error);
      const message = error instanceof Error ? error.message : String(error);

      // Fallback to static JSON
      console.log(`[RawModelService] Attempting static fallback for ${config.type}...`);
      try {
        const staticPath = new URL('../../latest_models/models.json', import.meta.url).pathname;
        const staticContent = await import('fs/promises').then(fs => fs.readFile(staticPath, 'utf-8'));
        const allModels = JSON.parse(staticContent);
        const providerModels = allModels.filter((m: any) => m.provider === config.type);

        if (providerModels.length === 0) {
          throw new Error(`No static models found for ${config.type}`);
        }

        console.log(`[RawModelService] Loaded ${providerModels.length} static models for ${config.type}`);

        return {
          id: `${config.type}-static-${Date.now()}`,
          provider: config.type,
          rawData: providerModels,
          ingestedAt: new Date()
        };
      } catch (staticError) {
        console.error(`[RawModelService] Static fallback failed:`, staticError);
        const staticMsg = staticError instanceof Error ? staticError.message : String(staticError);
        throw new Error(`Dynamic and static fetch both failed: ${message}. Static error: ${staticMsg}`);
      }
    }
  }
}

