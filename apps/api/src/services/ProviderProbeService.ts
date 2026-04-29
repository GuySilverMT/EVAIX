// import { UsageCollector } from './UsageCollector.js';

export class ProviderProbeService {
  static async probe(providerId: string, modelId: string) {
    console.log(`[Probe] Probing ${providerId} ${modelId}`);
    // Logic to invoke provider with max_tokens=1 would go here
    // For now, we just log
    return true;
  }
}
