import { prisma } from '../db.js';

export class TTSSelector {
    async resolveModel(): Promise<string> {
         // 1. Specialized Audio Models
        const candidates = await prisma.audioModel.findMany({
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
                name: { contains: 'tts', mode: 'insensitive' }
            }
        });

        if (fallback) return fallback.id;

        throw new Error("No TTS/Audio model found.");
    }
}
