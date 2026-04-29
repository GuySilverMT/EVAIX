
import { prisma } from '../db.js';

async function main() {
    console.log("--- Cleaning Bad Model Data ---");

    // 1. Delete the known bad TNG model
    const deleted = await prisma.model.deleteMany({
        where: {
            name: {
                startsWith: 'TNG:'
            }
        }
    });

    console.log(`Deleted ${deleted.count} models starting with "TNG:"`);

    // 2. Delete models with "(free)" suffix which clearly aren't slugs
    // OpenRouter slugs are "vendor/model". They don't have spaces usually.
    const deletedFree = await prisma.model.deleteMany({
        where: {
            name: {
                contains: '(free)'
            }
        }
    });
    console.log(`Deleted ${deletedFree.count} models with "(free)" suffix`);

    console.log("✅ Cleanup complete.");
}

main().catch(console.error);
