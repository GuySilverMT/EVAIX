import { RegistrySyncService } from './src/services/RegistrySyncService.js';
import { ProviderManager } from './src/services/ProviderManager.js';

async function forceSync() {
    console.log('--- FORCE SYNC STARTING ---');

    // We must initialize the ProviderManager to load the new env vars
    await ProviderManager.initialize();

    console.log('Providers loaded:', Array.from(ProviderManager.getProviders().keys()));

    const result = await RegistrySyncService.syncSingleProvider('xai');
    console.log('xAI Sync Result:', result);

    console.log('--- FORCE SYNC COMPLETE ---');
}

forceSync().catch(console.error);
