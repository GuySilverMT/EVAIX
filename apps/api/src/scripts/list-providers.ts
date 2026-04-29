
import { ProviderManager } from '../services/ProviderManager.js';
import { prisma } from '../db.js';

async function main() {
    console.log("--- Checking Active Providers ---");
    await ProviderManager.initialize();

    // Access the private map via 'any' cast or public getter if available
    const manager = ProviderManager as any;
    // Actually ProviderManager is a class with static props? Or singleton?
    // Checking previous usage: "new ProviderManager()" in verify script.

    const instance = new ProviderManager();
    await instance.initialize();

    // We need to see what keys are in the map
    // The class has 'private providers = new Map()'
    // We'll trust getProvider to tell us what's there if we probe known IDs

    const candidateIds = ['google', 'google-ai', 'openai', 'anthropic', 'openrouter', 'mistral', 'groq', 'nvidia', 'cerebras', 'ollama'];

    for (const id of candidateIds) {
        const p = instance.getProvider(id);
        if (p) {
            console.log(`✅ Provider Active: "${id}" (BaseURL: ${(p as any)['config']?.baseURL})`);
        } else {
            console.log(`❌ Provider Inactive: "${id}"`);
        }
    }

    console.log("\n--- Checking Model DB Entries ---");
    // Check the specific models causing issues
    const problematicModels = ['google/gemma-2-2b-it', 'TNG: DeepSeek R1T Chimera (free)'];

    for (const name of problematicModels) {
        // Try finding by ID or Name
        const m = await prisma.model.findFirst({
            where: {
                OR: [
                    { id: name },
                    { name: name }
                ]
            },
            include: { provider: true }
        });

        if (m) {
            console.log(`Found Model: "${m.name}" (ID: ${m.id})`);
            console.log(`  -> Provider: ${m.providerId} (Enabled: ${m.provider.isEnabled})`);
        } else {
            console.log(`Model NOT Found in DB: "${name}"`);
        }
    }
}

main().catch(console.error);
