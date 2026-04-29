import { prisma } from '../db.js';

export class ImageSelector {
    async resolveModel(): Promise<string> {
        // 1. Specialized Image Models
        const candidates = await prisma.imageModel.findMany({
            include: { model: true },
            where: { model: { isActive: true } },
            take: 5
        });

        if (candidates.length > 0) {
            return candidates[0].modelId;
        }

           // 2. Fallback
        const fallback = await prisma.model.findFirst({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: 'dall-e', mode: 'insensitive' } },
                    { name: { contains: 'image', mode: 'insensitive' } },
                    { name: { contains: 'stable-diffusion', mode: 'insensitive' } }
                ]
            }
        });

        if (fallback) return fallback.id;

        throw new Error("No Image Generation model found.");
    }
}
