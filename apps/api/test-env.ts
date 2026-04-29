import { EnvManager } from './src/services/EnvManager.js';

async function test() {
    console.log('--- ENV MANAGER TEST ---');
    console.log('CWD:', process.cwd());
    await EnvManager.updateEnvVariable('TEST_INGESTION_SYNC', 'SUCCESS_FROM_TERMINAL');
    console.log('Test complete.');
}

test().catch(console.error);
