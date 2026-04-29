
import { RoleFactoryService } from '../services/RoleFactoryService.js';
import { ProviderManager } from '../services/ProviderManager.js';
import { resolveModelForRole } from '../services/modelManager.service.js';


async function main() {
    console.log("Initializing ProviderManager...");
    await ProviderManager.initialize();

    console.log("Testing ModelSelector Capability Filtering...");


    // Test 1: Request Reasoning
    console.log("\n--- TEST 1: Requesting REASONING ---");
    const roleReasoning = {
        id: 'test-reasoning',
        metadata: {
            requirements: {
                capabilities: ['reasoning'],
                minContext: 4000
            }
        }
    };
    try {
        const modelId = await resolveModelForRole(roleReasoning as any);

        console.log(`✅ Selected Model for Reasoning: ${modelId}`);
    } catch (e) {
        console.error("❌ Failed to resolve reasoning model", e);
    }

    // Test 2: Request Vision
    console.log("\n--- TEST 2: Requesting VISION ---");
    const roleVision = {
        id: 'test-vision',
        metadata: {
            requirements: {
                capabilities: ['vision'],
                minContext: 4000
            }
        }
    };
    try {
        const modelId = await resolveModelForRole(roleVision as any);

        console.log(`✅ Selected Model for Vision: ${modelId}`);
    } catch (e) {
        console.error("❌ Failed to resolve vision model", e);
    }

    // Test 3: Request Impossible Capability (Should Soft Fail)
    console.log("\n--- TEST 3: Requesting IMPOSSIBLE ---");
    const roleImpossible = {
        id: 'test-impossible',
        metadata: {
            requirements: {
                capabilities: ['telepathy'],
                minContext: 4000
            }
        }
    };
    try {
        const modelId = await resolveModelForRole(roleImpossible as any);

        console.log(`✅ Selected Model for Impossible (Soft Fallback): ${modelId}`);
    } catch (e) {
        console.error("❌ Failed to resolve impossible model", e);
    }

    console.log("\n--- DONE ---");
}

main().catch(console.error);
