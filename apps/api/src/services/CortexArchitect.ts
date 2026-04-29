import { RoleIntent, AgentExecutionMode } from './RoleFactoryService.js';
import { executeJsonMode } from './architectHelpers.js';
import * as Constants from './roleFactoryConstants.js';

export interface CortexConfig {
    executionMode: AgentExecutionMode;
    contextRange: { min: number, max: number };
    maxOutputTokens: number;
    capabilities: string[];
    tools?: string[];
}

export async function cortexArchitect(modelId: string, intent: RoleIntent): Promise<CortexConfig> {
    const prompt = `
    Design the brain/cortex capabilities for the role.
    Intent: ${intent.description}
    Complexity: ${intent.complexity}

    Select the required execution mode based on the intent:
    - **JSON_STRICT**: For data extractors, coordinators, or config generators.
    - **CODE_INTERPRETER**: For developers, analysts, or any role needing sandboxed execution.
    - **HYBRID_AUTO**: For highly complex reasoning agents that may need both.

    Determine Max Output Tokens:
    - **1024**: JSON responses, tool calls, coordinators, managers (DEFAULT)
    - **2048**: Code generation, refactoring, moderate documentation
    - **4096+**: Large file rewriting, extensive research reports

    ## JSON Schema:
    {
        "executionMode": "JSON_STRICT" | "CODE_INTERPRETER" | "HYBRID_AUTO",
        "contextRange": { "min": number, "max": number }, // Standard Min: 4000. Orchestrators: 32000.
        "maxOutputTokens": number,
        "capabilities": string[] // e.g. ["reasoning", "vision", "audio", "code_execution"]
    }
    `;
    const res = await executeJsonMode<CortexConfig>(modelId, prompt, "Cortex");

    // Force capabilities array if LLM forgets
    if (!res.capabilities) res.capabilities = [];

    // Always inject requested capabilities
    if (intent.capabilities) {
        res.capabilities = Array.from(new Set([...res.capabilities, ...intent.capabilities]));
    }

    return res;
}

export function getCortexFallback(intent: RoleIntent): CortexConfig {
    return {
        executionMode: 'HYBRID_AUTO',
        contextRange: { min: Constants.CORTEX_MIN_CONTEXT_FALLBACK, max: Constants.CORTEX_MAX_CONTEXT_FALLBACK },
        maxOutputTokens: intent.complexity === 'HIGH' ? Constants.CORTEX_MAX_OUTPUT_TOKENS_DEFAULT : Constants.LIAISON_MAX_OUTPUT,
        capabilities: intent.capabilities || ['reasoning']
    };
}
