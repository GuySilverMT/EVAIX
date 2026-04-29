import { prisma } from '../db.js';

export class EmbeddingSelector {
    /**
     * Resolves the best embedding model based on requirements.
     */
    async resolveModel(minDimensions: number = 0): Promise<string> {
        // 1. Try to find specialized embedding models
        const candidates = await prisma.embeddingModel.findMany({
            include: { model: true },
            where: {
                model: { isActive: true },
                dimensions: minDimensions > 0 ? { gte: minDimensions } : undefined
            },
            orderBy: { dimensions: 'asc' }, // Smallest sufficient
            take: 5
        });

        if (candidates.length > 0) {
            return candidates[0].modelId;
        }

        // 2. Fallback: Search for models with 'embedding' in name
        const fallback = await prisma.model.findFirst({
            where: {
                isActive: true,
                name: { contains: 'embed', mode: 'insensitive' }
            }
        });

        if (fallback) return fallback.id;

        throw new Error(`No embedding model found (Req Dimensions: ${minDimensions})`);
    }
}
