
import { ProviderManager } from '../services/ProviderManager.js';
import { Surveyor } from '../services/Surveyor.js';
import { prisma } from '../db.js';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('🔄 FORCE SYNC: Starting fresh...');
    try {
        console.log('🔌 Phase 1: initializing Providers...');
        await ProviderManager.initialize();

        console.log('📡 Phase 2: Fetching Models from APIs...');
        await ProviderManager.syncModelsToRegistry();
        
        console.log('🕵️ Phase 3: Surveying Capabilities...');
        const stats = await Surveyor.surveyAll();
        console.log(`✅ FORCE SYNC: Completed. Surveyed ${stats.surveyed} models.`);
        
        const count = await prisma.modelCapabilities.count();
        console.log(`📊 Final Stats: ${count} capability records active.`);
        process.exit(0);
    } catch (e) {
        console.error('❌ FORCE SYNC: Failed', e);
        process.exit(1);
    }
}

main();
