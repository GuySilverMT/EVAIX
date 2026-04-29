import { RoleIntent } from './RoleFactoryService.js';
import { executeJsonMode } from './architectHelpers.js';
import * as Constants from './roleFactoryConstants.js';

export interface IdentityConfig {
    personaName: string;
    systemPromptDraft: string;
    style: string;
    thinkingProcess: string;
    reflectionEnabled: boolean;
}

export async function identityArchitect(modelId: string, intent: RoleIntent): Promise<IdentityConfig> {
    const prompt = `
    Design the core persona for a new AI Role.
    Input Intent:
    - Name: ${intent.name}
    - Description: ${intent.description}
    - Domain: ${intent.domain}
    - Complexity: ${intent.complexity}

    Determine the personaName, an extensive systemPromptDraft, the communication style, and the required thinking process.
    - If complexity is HIGH, reflectionEnabled should be true, and thinkingProcess should be 'CHAIN_OF_THOUGHT' or 'MULTI_AGENT_SIMULATION'.

    ## JSON Schema:
    {
        "personaName": string,
        "systemPromptDraft": string, // Detailed 2-3 paragraph role instruction
        "style": "CONCISE" | "SOCRATIC" | "CREATIVE" | "AUTHORITATIVE" | "PROFESSIONAL_CONCISE" | "EMPATHETIC" | "DIRECT" | "TECHNICAL",
        "thinkingProcess": "SOLO" | "CHAIN_OF_THOUGHT" | "DEBATE" | "CRITIQUE" | "STEP_BY_STEP" | "MULTI_AGENT_SIMULATION",
        "reflectionEnabled": boolean
    }
    `;
    return await executeJsonMode<IdentityConfig>(modelId, prompt, "Identity");
}

export function getIdentityFallback(intent: RoleIntent): IdentityConfig {
    return {
        personaName: intent.name,
        systemPromptDraft: `You are ${intent.name}. ${intent.description}.

            ENVIRONMENT: Node.js 22+ / TypeScript 5.7
            ARCHITECTURE: Volcano Monorepo
            CONSTRAINTS:
            - Keep responses professional and concise.
            - Follow strictly the instructions provided by the user.`,
        style: "PROFESSIONAL_CONCISE",
        thinkingProcess: intent.complexity === 'HIGH' ? "CHAIN_OF_THOUGHT" : "SOLO",
        reflectionEnabled: intent.complexity === 'HIGH'
    };
}
