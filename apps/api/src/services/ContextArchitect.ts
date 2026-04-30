import { RoleIntent } from './RoleFactoryService.js';
import { executeJsonMode } from './architectHelpers.js';
import * as Constants from './roleFactoryConstants.js';

export interface ContextConfig {
    strategy: string[];
    permissions: string[];
    vectorSpaces?: string[];
}

export async function contextArchitect(modelId: string, intent: RoleIntent): Promise<ContextConfig> {
    const prompt = `
    Define context retrieval strategy and permissions.
    Intent: ${intent.description}

    ## JSON Schema:
    {
        "strategy": ["LOCUS_FOCUS", "EXPLORATORY", "HYBRID", "TIME_SERIES"],
        "permissions": ["READ", "WRITE", "EXECUTE", "ALL", "NONE"],
        "vectorSpaces": string[] // Optional e.g., ["frontend_docs", "api_specs"]
    }
    `;
    return await executeJsonMode<ContextConfig>(modelId, prompt, "Context");
}

export function getContextFallback(intent: RoleIntent): ContextConfig {
    return {
        strategy: ["HYBRID"],
        permissions: ["READ"]
    };
}
