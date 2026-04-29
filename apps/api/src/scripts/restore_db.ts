import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

const BACKUP_DIR = path.join(process.cwd(), 'db_backups');

async function main() {
    console.log('🚀 Starting Database Restore from', BACKUP_DIR);

    try {
        // 1. ProviderConfig
        console.log('\n📦 Restoring ProviderConfig...');
        const providerConfigs = JSON.parse(
            await fs.readFile(path.join(BACKUP_DIR, 'ProviderConfig.json'), 'utf-8')
        );

        for (const config of providerConfigs) {
            await prisma.providerConfig.upsert({
                where: { id: config.id },
                update: {
                    name: config.name || config.label, // keep fallback just in case reading old JSON
                    type: config.type,
                    // apiKey: config.apiKey, // Removed from schema
                    baseUrl: config.baseUrl || config.baseURL,
                    isEnabled: config.isEnabled,
                    // requestsPerMinute: config.requestsPerMinute, // Removed from schema? checking...
                    // The error logs didn't mention requestsPerMinute for ProviderConfig, but let's be safe.
                },
                create: {
                    id: config.id,
                    name: config.name || config.label,
                    type: config.type,
                    // apiKey: config.apiKey, // Removed from schema
                    baseUrl: config.baseUrl || config.baseURL,
                    isEnabled: config.isEnabled,
                    createdAt: new Date(config.createdAt),
                    updatedAt: new Date(config.updatedAt),
                }
            });
        }
        console.log(`✅ Processed ${providerConfigs.length} ProviderConfigs`);


        // 2. Model
        console.log('\n📦 Restoring Model...');
        const models = JSON.parse(
            await fs.readFile(path.join(BACKUP_DIR, 'Model.json'), 'utf-8')
        );

        for (const model of models) {
            // Handle JSON fields
            const providerData = model.providerData || {};
            const aiData = model.aiData || {};
            // const specs = model.specs || {}; // Removed

            await prisma.model.upsert({
                where: {
                    providerId_name: {
                        providerId: model.providerId,
                        name: model.name
                    }
                },
                update: {
                    name: model.name,
                    providerData: providerData,
                    aiData: aiData,
                    // specs: specs, // Removed
                    // capabilityTags: model.capabilityTags, // Removed
                    // isFree: model.isFree,
                    costPer1k: model.costPer1k,
                    isActive: model.isActive,
                    // source: model.source, // Removed?
                    lastSeenAt: new Date(model.lastSeenAt),
                },
                create: {
                    id: model.id,
                    providerId: model.providerId,
                    // modelId: model.modelId, // Removed
                    name: model.name,
                    providerData: providerData,
                    aiData: aiData,
                    // specs: specs, // Removed
                    // capabilityTags: model.capabilityTags, // Removed
                    // isFree: model.isFree,
                    costPer1k: model.costPer1k,
                    isActive: model.isActive,
                    // source: model.source, // Removed?
                    firstSeenAt: new Date(model.firstSeenAt),
                    lastSeenAt: new Date(model.lastSeenAt),
                    updatedAt: new Date(model.updatedAt),
                }
            });
        }
        console.log(`✅ Processed ${models.length} Models`);


        // 3. ModelCapabilities
        console.log('\n📦 Restoring ModelCapabilities...');
        const capabilities = JSON.parse(
            await fs.readFile(path.join(BACKUP_DIR, 'ModelCapabilities.json'), 'utf-8')
        );

        for (const cap of capabilities) {
            await prisma.modelCapabilities.upsert({
                where: { modelId: cap.modelId },
                update: {
                    contextWindow: cap.contextWindow,
                    maxOutput: cap.maxOutput,
                    hasVision: cap.hasVision,
                    supportsFunctionCalling: cap.supportsFunctionCalling,
                    supportsJsonMode: cap.supportsJsonMode,
                    updatedAt: new Date(),
                },
                create: {
                    id: cap.id,
                    modelId: cap.modelId,
                    contextWindow: cap.contextWindow,
                    maxOutput: cap.maxOutput,
                    hasVision: cap.hasVision,
                    supportsFunctionCalling: cap.supportsFunctionCalling,
                    supportsJsonMode: cap.supportsJsonMode,
                    updatedAt: new Date(cap.updatedAt),
                }
            });
        }
        console.log(`✅ Processed ${capabilities.length} ModelCapabilities`);

        console.log('\n🎉 Restore completed successfully!');

    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
