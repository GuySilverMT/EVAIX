// import { UsageCollector } from './UsageCollector.js';

import { prisma } from '../db.js';

export class ProviderProbeService {
  static async probe(providerId: string, modelId: string) {
    console.log(`[Probe] Probing ${providerId} ${modelId}`);
    // Logic to invoke provider with max_tokens=1 would go here
    // For now, we just log
    return true;
  }

  static async markProviderDegraded(providerId: string, reason: string) {
    console.warn(`[Probe] Marking provider ${providerId} as DEGRADED. Reason: ${reason}`);
    await prisma.providerConfig.update({
      where: { id: providerId },
      data: { status: 'DEGRADED' },
    });
  }
}
