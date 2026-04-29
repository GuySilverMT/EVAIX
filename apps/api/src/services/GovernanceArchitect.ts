import { RoleIntent } from './RoleFactoryService.js';
import { executeJsonMode } from './architectHelpers.js';
import * as Constants from './roleFactoryConstants.js';

export interface GovernanceConfig {
    rules: string[];
    assessmentStrategy: string[];
    enforcementLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function governanceArchitect(modelId: string, intent: RoleIntent): Promise<GovernanceConfig> {
    const isHealthProbe = intent.name.toLowerCase().includes("probe") || intent.name.toLowerCase().includes("health");
    const isAuditor = intent.name.toLowerCase().includes("auditor") || intent.name.toLowerCase().includes("security");

    const prompt = `
    Establish the strict rules and assessment strategy for this role.
    Intent: ${intent.description}

    ## JSON Schema:
    {
        "rules": string[], // Crucial boundaries and invariant constraints
        "assessmentStrategy": ["VISUAL_CHECK", "UNIT_TESTS", "LINT_ONLY", "STRICT_TEST_PASS", "JUDGE"],
        "enforcementLevel": "LOW" | "MEDIUM" | "HIGH"
    }
    `;
    const config = await executeJsonMode<GovernanceConfig>(modelId, prompt, "Governance");

    if (isHealthProbe) {
        config.assessmentStrategy = ["STRICT_TEST_PASS"];
    }

    if (isAuditor) {
        config.assessmentStrategy = ["JUDGE"]; // Auditor needs to judge logic
    }

    return config;
}

export function getGovernanceFallback(intent: RoleIntent): GovernanceConfig {
    return {
        rules: ["Verify work before submitting."],
        assessmentStrategy: ["VISUAL_CHECK"],
        enforcementLevel: "MEDIUM"
    };
}
