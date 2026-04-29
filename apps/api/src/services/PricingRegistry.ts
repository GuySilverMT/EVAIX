/**
 * PricingRegistry — centralised source of truth for model pricing.
 *
 * Architecture:
 *  1. STATIC layer   — hard-coded known rates (fast, no DB round-trip)
 *  3. Fallback       — zero cost with a warning (never silently wrong)
 *
 * Prices are in USD per 1 000 tokens.
 *
 * ── Updating prices ──────────────────────────────────────────────────────────
 * When xAI / any provider changes pricing, update the STATIC_PRICING map below.
 * Run `pnpm run dev` for live-reload. No migration required.
 *
 * ── Adding a new provider ────────────────────────────────────────────────────
 * Add entries to STATIC_PRICING. Keys are the model's `apiString` / `name` (the
 * exact string sent to the API). Partial prefix matching is supported — the
 * longest matching prefix wins.
 */

export interface ModelPrice {
    inputPer1kTokens: number;   // USD
    outputPer1kTokens: number;  // USD
    source: 'static' | 'zero';
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC PRICING  (last updated: 2026-04-27 per console.x.ai/models)
// All prices in USD per 1 000 tokens.
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_PRICING: Record<string, { input: number; output: number }> = {

    // ── xAI / Grok ─────────────────────────────────────────────────────────────
    // Language models — grok-4.28 family  $2.00 / $6.00 per 1M tokens
    'grok-4.28-3399-reasoning': { input: 0.002, output: 0.006 },
    'grok-4.28-3399-non-reasoning': { input: 0.002, output: 0.006 },
    'grok-4.28-multi-agent-0339': { input: 0.002, output: 0.006 },
    // Fast reasoning models  $0.20 / $0.48 and $0.28 / $0.56
    'grok-4-1-fast-reasoning': { input: 0.0002, output: 0.00048 },
    'grok-4-1-fast-non-reasoning': { input: 0.00028, output: 0.00056 },
    // Image generation — per image (we map as "per 1k" = effectively per call)
    'grok-imagine-image-pro': { input: 0.07, output: 0 },
    'grok-imagine-image': { input: 0.02, output: 0 },
    // Video — $0.05/second, mapped as per-1k-frames approximation
    'grok-imagine-video': { input: 0.05, output: 0 },
    // Voice: TTS $4.70/1M chars, STT $0.18-$0.20/min — approximate token basis
    'grok-realtime-api': { input: 0.00005, output: 0.00005 },
    'grok-text-to-speech': { input: 0.0047, output: 0 },
    'grok-speech-to-text': { input: 0.0002, output: 0 },

    // ── OpenAI (common models for reference) ──────────────────────────────────
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'text-embedding-3-small': { input: 0.00002, output: 0 },
    'text-embedding-3-large': { input: 0.00013, output: 0 },
    'dall-e-3': { input: 0.04, output: 0 },

    // ── Anthropic ──────────────────────────────────────────────────────────────
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
    'claude-3-opus': { input: 0.015, output: 0.075 },

    // ── Google Gemini ──────────────────────────────────────────────────────────
    'gemini-2.5-pro': { input: 0.00125, output: 0.01 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },

    // ── Mistral ────────────────────────────────────────────────────────────────
    'mistral-large': { input: 0.003, output: 0.009 },
    'mistral-small': { input: 0.001, output: 0.003 },
    'mistral-nemo': { input: 0.00015, output: 0.00015 },

    // ── Groq (effectively free tier / promo — low cost placeholders) ───────────
    'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
    'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },

    // ── Local / Ollama (zero cost) ────────────────────────────────────────────
    'ollama/': { input: 0, output: 0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Lookup — longest prefix wins
// ─────────────────────────────────────────────────────────────────────────────
function lookupStatic(modelId: string): { input: number; output: number } | null {
    const lower = modelId.toLowerCase();
    let best: { input: number; output: number } | null = null;
    let bestLen = 0;

    for (const [key, price] of Object.entries(STATIC_PRICING)) {
        if (lower.startsWith(key.toLowerCase()) && key.length > bestLen) {
            best = price;
            bestLen = key.length;
        }
    }

    return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export const PricingRegistry = {

    /**
     * Look up pricing for a model. Checks static table first (fast path),
     * then falls back to zero.
     */
    async getPrice(modelId: string): Promise<ModelPrice> {
        // 1. Static table
        const staticPrice = lookupStatic(modelId);
        if (staticPrice) {
            return {
                inputPer1kTokens: staticPrice.input,
                outputPer1kTokens: staticPrice.output,
                source: 'static',
            };
        }

        // 2. Zero fallback
        console.warn(`[PricingRegistry] No pricing found for model "${modelId}" — recording $0 cost`);
        return { inputPer1kTokens: 0, outputPer1kTokens: 0, source: 'zero' };
    },

    /**
     * Calculate total USD cost from token counts.
     */
    calcCost(price: ModelPrice, promptTokens: number, completionTokens: number): number {
        return (
            (promptTokens / 1000) * price.inputPer1kTokens +
            (completionTokens / 1000) * price.outputPer1kTokens
        );
    },

    /**
     * One-shot helper used by logUsage and anywhere else a cost is needed.
     */
    async computeCost(modelId: string, promptTokens: number, completionTokens: number): Promise<number> {
        const price = await this.getPrice(modelId);
        return this.calcCost(price, promptTokens, completionTokens);
    }
};
