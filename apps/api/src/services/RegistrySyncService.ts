import { prisma } from '../db.js';
import { BaseLLMProvider, LLMModel } from '../utils/BaseLLMProvider.js';
import { RawModelService } from './RawModelService.js';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

interface RawSnapshotData extends LLMModel {
    [key: string]: unknown;
}

interface ProviderMetadata {
    name: string;
    type: string;
    providerClass: string;
}

interface ModelPricing {
    prompt?: string | number;
    completion?: string | number;
}

interface RawModelWithPricing extends LLMModel {
    pricing?: ModelPricing;
}

interface ModelSpecs {
    context_window?: number;
    max_context_length?: number;
    embedding_length?: number;
    [key: string]: unknown;
}

export class RegistrySyncService {

    /**
     * Syncs models from all active providers to the registry.
     */
    static async syncModels(
        providers: Map<string, BaseLLMProvider>,
        providerMetadata: Map<string, ProviderMetadata>
    ) {
        console.log('[RegistrySyncService] Starting Smart Registry Sync...');

        const syncedProviders = new Set<string>();
        const activeModelIds = new Set<string>();

        // Pre-fetch all configs to get 'enforceFreeOnly' setting
        const configs = await prisma.providerConfig.findMany({
            where: { id: { in: Array.from(providers.keys()) } }
        });
        const configMap = new Map(configs.map(c => [c.id, c]));

        for (const [rawProviderId] of providers.entries()) {
            const providerId = rawProviderId.toLowerCase();
            syncedProviders.add(providerId);

            try {
                const meta = providerMetadata.get(rawProviderId);
                const providerLabel = meta?.name || providerId;
                const providerType = (meta?.type || 'unknown').toLowerCase();
                const config = configMap.get(rawProviderId);

                console.log(`[RegistrySyncService] Fetching models for ${providerLabel}...`);

                const snapshot = await RawModelService.fetchAndSnapshot(rawProviderId);

                if (!snapshot || !Array.isArray(snapshot.rawData)) {
                    console.error(`[RegistrySyncService] Failed to get valid snapshot for ${providerLabel}.`);
                    continue;
                }
                const models = snapshot.rawData as LLMModel[];
                console.log(`[RegistrySyncService] Got ${models.length} models from ${providerLabel}.`);

                let modelsToSync = models;

                // Filter OpenRouter for free models ONLY if requested by user
                if (providerType === 'openrouter' && config?.enforceFreeOnly) {
                    modelsToSync = models.filter(m => {
                        const modelWithPricing = m as RawModelWithPricing;
                        const p = modelWithPricing.pricing;
                        if (!p) return false;
                        const isFreePrompt = p.prompt === '0' || p.prompt === 0;
                        const isFreeComp = p.completion === '0' || p.completion === 0;
                        return isFreePrompt && isFreeComp;
                    });
                    console.log(`[RegistrySyncService] Filtered OpenRouter models: ${models.length} -> ${modelsToSync.length} (Enforce Free Only)`);
                }

                console.log(`[Registry Sync] Upserting ${modelsToSync.length} models for ${providerLabel}...`);

                for (const m of modelsToSync) {
                    const rawName = (m.id || m.model || m.name) as string;
                    if (!rawName) continue;

                    const stableId = `${providerId}:${rawName}`;
                    activeModelIds.add(stableId);

                    const cost = m.costPer1k;
                    const providerData = m as unknown as Prisma.InputJsonValue;

                    let underlyingProvider = providerLabel;
                    const metaClass = meta?.providerClass || 'FOUNDATIONAL';

                    if (metaClass === 'AGGREGATOR' || providerType === 'openrouter') {
                        if (rawName.includes('/')) {
                            underlyingProvider = rawName.split('/')[0];
                        }
                    }

                    try {
                        const modelRecord = await prisma.model.upsert({
                            where: { id: stableId },
                            create: {
                                id: stableId,
                                providerId: providerId,
                                name: rawName,
                                costPer1k: cost || 0,
                                providerData: providerData,
                                underlyingProvider: underlyingProvider,
                                aiData: {},
                                isActive: true
                            },
                            update: {
                                isActive: true,
                                costPer1k: cost || 0,
                                providerData: providerData,
                                underlyingProvider: underlyingProvider,
                                lastSeenAt: new Date()
                            },
                            include: { provider: true }
                        });

                        const { Surveyor } = await import('./Surveyor.js');
                        await Surveyor.surveyModel(modelRecord);


                        await this.populateSpecializedTables(stableId, rawName, m);

                    } catch (upsertError: unknown) {
                        const msg = upsertError instanceof Error ? upsertError.message : String(upsertError);
                        console.error(`[Registry Sync] Individual Upsert Failed for ${stableId}:`, msg);
                    }
                }

            } catch (error) {
                console.error(`[Registry Sync] Batch Sync Failed for provider ${rawProviderId}:`, error);
            }
        }

        await this.cleanupGhostRecords(Array.from(activeModelIds), Array.from(syncedProviders));
    }

    /**
     * Syncs models for a specific provider.
     */
    static async syncSingleProvider(providerId: string) {
        console.log(`[RegistrySyncService] Selective sync triggered for: ${providerId}`);
        const config = await prisma.providerConfig.findUnique({ where: { id: providerId } });
        if (!config) throw new Error(`Provider ${providerId} not found`);

        const providerInstance = await (await import('./ProviderManager.js')).ProviderManager.getProvider(providerId) ||
            (await import('../utils/ProviderFactory.js')).ProviderFactory.createProvider(config.type, {
                id: config.id,
                apiKey: (config as any).apiKey || process.env[`${config.type.toUpperCase()}_API_KEY`] || process.env[`${config.id.toUpperCase()}_API_KEY`] || '',
                baseURL: config.baseUrl || undefined
            });

        const providers = new Map([[providerId, providerInstance]]);
        const metadata = new Map([[providerId, { name: config.name, type: config.type, providerClass: config.providerClass }]]);

        await this.syncModels(providers, metadata);
        return { success: true };
    }

    private static calculateChecksum(data: Prisma.InputJsonValue): string {
        return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    }

    public static async populateSpecializedTables(modelId: string, modelName: string, rawData: RawSnapshotData) {
        const lowerName = modelName.toLowerCase();
        const isNotChat = lowerName.includes('embed') ||
            lowerName.includes('reward') ||
            lowerName.includes('moderation') ||
            lowerName.includes('whisper') ||
            lowerName.includes('tts-');

        if (!isNotChat) {
            const specs = rawData as unknown as ModelSpecs;
            await (prisma.chatModel as any).upsert({
                where: { modelId: modelId },
                create: {
                    modelId: modelId,
                    contextWindow: specs.context_window || specs.max_context_length || 4096
                },
                update: {
                    contextWindow: specs.context_window || specs.max_context_length || 4096
                }
            });
        }
    }


    private static async cleanupGhostRecords(activeIds: string[], syncedProviderIds: string[]) {
        try {
            if (activeIds.length === 0 || syncedProviderIds.length === 0) return;
            console.log(`[RegistrySyncService] Marking Ghost Records as Offline...`);

            const result = await prisma.model.updateMany({
                where: {
                    providerId: { in: syncedProviderIds },
                    id: { notIn: activeIds },
                    isActive: true
                },
                data: {
                    isActive: false
                }
            });

            if (result.count > 0) {
                console.log(`[RegistrySyncService] 💤 Marked ${result.count} models as Offline.`);
            }
        } catch (error) {
            console.warn('[RegistrySyncService] Ghost cleanup failed.', error);
        }
    }
}
