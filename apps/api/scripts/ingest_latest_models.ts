#!/usr/bin/env ts-node

import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// Provider ID mapping
const PROVIDER_MAP: Record<string, string> = {
  'google-ai': 'google',
  'groq-env': 'groq',
  'ollama': 'ollama',
  'openai': 'openai', 
  // Add others if needed based on data
};

async function main() {
  console.log('🚀 Starting Latest Model Ingestion...');

  // WIPE LOGIC (Added per user request)
  console.log('⚠️ Wiping existing Model and ModelCapabilities data...');
  try {
     const deletedCaps = await prisma.modelCapabilities.deleteMany({});
     console.log(`   - Deleted ${deletedCaps.count} capabilities.`);
     
     // Note: If ModelUsage or other tables depend on Model, this might fail or cascade.
     // Assuming user wants a clean slate for models. 
     // We will use a transaction if possible, but for script simple sequential delete is fine.
     const deletedModels = await prisma.model.deleteMany({});
     console.log(`   - Deleted ${deletedModels.count} models.`);
  } catch (error) {
     console.error('❌ Error wiping data:', error);
     console.log('⚠️ proceeding with upsert anyway...');
  }

  const registryPath = path.join(process.cwd(), 'latest_models', 'model_registry.json');
  const capsPath = path.join(process.cwd(), 'latest_models', 'ModelCapabilities.json');

  // Read JSON files
  console.log(`📂 Reading ${registryPath}...`);
  const registryContent = await fs.readFile(registryPath, 'utf-8');
  const registry = JSON.parse(registryContent);

  console.log(`📂 Reading ${capsPath}...`);
  const capsContent = await fs.readFile(capsPath, 'utf-8');
  const capabilitiesList = JSON.parse(capsContent);

  // Index capabilities by modelId for easy lookup
  // Note: model_registry.json "id" matches ModelCapabilities.json "modelId" ? 
  // Or model_registry.json "id" matches ModelCapabilities.json "id"?
  // Let's verify based on the file content viewed earlier.
  // Registry entry: { "id": "cmjgy7qcw0013qx4emdh3yzyp", ... }
  // Caps entry: { "modelId": "cmjgy7qdv001fqx4ec2prh2z2", ... } 
  // It seems keys are consistent cUIDs. 
  
  const capsMap = new Map();
  for (const cap of capabilitiesList) {
    if (cap.modelId) {
      capsMap.set(cap.modelId, cap);
    }
  }

  let upsertedCount = 0;

  for (const item of registry) {
    // 1. Resolve Provider
    // The JSON has "provider_id", e.g. "google-ai"
    const jsonProviderId = item.provider_id;
    const dbProviderId = PROVIDER_MAP[jsonProviderId] || jsonProviderId;

    // Ensure Provider Exists
    let providerConfig = await prisma.providerConfig.findUnique({
      where: { id: dbProviderId }
    });

    if (!providerConfig) {
      console.log(`⚠️ Provider ${dbProviderId} not found, creating dummy config...`);
      providerConfig = await prisma.providerConfig.create({
        data: {
          id: dbProviderId,
          label: dbProviderId,
          type: 'chat', // default
          isEnabled: true,
        }
      });
    }

    // 2. Prepare Model Data
    const modelId = item.id; // The CUID
    const name = item.model_name || item.model_id; 
    const isFree = item.is_free ?? false;
    const costPer1k = item.cost_per_1k ?? (isFree ? 0 : null);
    
    // We used to dedupe by [providerId, name]
    // But here we have a canonical ID in the JSON.
    // We should try to find by ID first, if not then by unique constraint.
    


    // 3. Smart Upsert Logic
    // We must respect the @@unique([providerId, name]) constraint.
    // Case A: Model with same [providerId, name] exists. -> MUST update that record (using its ID).
    // Case B: Model with same ID exists. -> Update that record.
    // Case C: Neither exists. -> Create new.
    
    // First, check if name/provider collision exists
    const existingByName = await prisma.model.findUnique({
        where: {
            providerId_name: {
                providerId: providerConfig.id,
                name: name
            }
        }
    });

    let targetId = modelId; // Default to JSON ID

    if (existingByName) {
        // Collision found! We must use THIS id, otherwise we violate uniqueness.
        // But what if existingByName.id !== modelId?
        // We have to discard the JSON ID and use the DB ID to update the record.
        console.log(`ℹ️ Found existing model by name: ${name} (ID: ${existingByName.id}). Updating...`);
        targetId = existingByName.id;
    } 

    const inputData: Prisma.ModelCreateInput = {
      id: targetId, // Use resolved ID
      provider: { connect: { id: providerConfig.id } },
      name: name,
      providerData: {
        ...item.provider_data,
        displayName: item.model_name 
      },
      aiData: item.ai_data || {},
      isActive: item.is_active ?? true,
      costPer1k: costPer1k,
      firstSeenAt: item.first_seen_at ? new Date(item.first_seen_at) : new Date(),
      lastSeenAt: item.last_seen_at ? new Date(item.last_seen_at) : new Date(),
    };

    try {
      await prisma.model.upsert({
        where: { id: targetId },
        create: inputData,
        update: {
            ...inputData,
            id: undefined // never update ID
        }
      });
    } catch (e) {
        console.error(`Error processing model ${targetId} (${item.model_name}):`, e);
        continue;
    }

    // 4. Process Capabilities (using targetId)
    const capData = capsMap.get(modelId); // Look up by JSON ID to get caps

    if (capData) {


       // Upsert Capabilities
       // We must link to targetId (the actual DB record)
       const capsInput = {
          model: { connect: { id: targetId } },
          contextWindow: capData.contextWindow,
          maxOutput: capData.maxOutput,
          hasVision: capData.hasVision ?? false,
          supportsFunctionCalling: capData.supportsFunctionCalling ?? false,
          supportsJsonMode: capData.supportsJsonMode ?? false,
          specs: {
               hasAudioInput: capData.hasAudioInput,
               hasAudioOutput: capData.hasAudioOutput,
               hasReasoning: capData.hasReasoning,
               isMultimodal: capData.isMultimodal
          }
       };

       await prisma.modelCapabilities.upsert({
           where: { modelId: targetId },
           create: capsInput,
           update: {
                ...capsInput,
                model: undefined
           }
       });
    }

    upsertedCount++;
  }

  console.log(`\n✅ Ingestion Complete. Processed ${upsertedCount} models.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
