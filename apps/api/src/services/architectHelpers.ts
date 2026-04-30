import { ProviderManager } from './ProviderManager.js';
import * as Constants from './roleFactoryConstants.js';

export async function executeJsonMode<T>(modelId: string, prompt: string, schemaName: string): Promise<T> {
    const providerManager = new ProviderManager();
    const providerId = await resolveProviderForModel(modelId);
    const provider = providerManager.getProvider(providerId);

    if (!provider) {
        throw new Error(`[RoleFactory] Provider ${providerId} not found for model ${modelId}`);
    }

    try {
        const response = await provider.generateCompletion({
            modelId: modelId,
            systemPrompt: "You are the Role Architect. You must return ONLY valid JSON matching the requested schema. No markdown wrapping. No explanations.",
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2, // Low temp for architectural consistency
            maxTokens: Constants.CORTEX_MAX_OUTPUT_TOKENS_DEFAULT,
            responseFormat: { type: 'json_object' } // Force JSON mode
        });

        let jsonStr = response.text.trim();

        // Safety: Strip markdown blocks if the model ignored the system prompt
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonStr.startsWith('```')) {
             jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        // Final safety check: ensure it starts with { or [
        if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }
        }

        return JSON.parse(jsonStr) as T;
    } catch (e: unknown) {
        console.error(`[RoleFactory] ❌ JSON Execution Failed for ${schemaName}:`, e instanceof Error ? e.message : String(e));
        throw e;
    }
}

// Helper to deduce provider from our modelId mapping (e.g., "anthropic:claude-3-5-sonnet")
export async function resolveProviderForModel(modelId: string): Promise<string> {
    // We can infer provider if we follow a convention like `providerId:actualModelId`
    if (modelId.includes(':')) {
        return modelId.split(':')[0];
    }

    // Hardcoded fallbacks if we don't have DB access here
    if (modelId.includes('claude')) return 'anthropic';
    if (modelId.includes('gpt') || modelId.includes('o1') || modelId.includes('o3')) return 'openai';
    if (modelId.includes('gemini')) return 'google';

    return 'openai'; // default
}
