import axios from 'axios';
import { prisma } from '../db.js';

export class CreditGuard {
  static async checkOpenRouterBalance(apiKey: string): Promise<number | null> {
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return response.data?.data?.total_credits || 0;
    } catch (error) {
      console.error('[Guard] Failed to check credits:', error);
      return null;
    }
  }

  /**
   * Returns true if the provider is locked OR budget is exceeded.
   * If true, the caller should only allow free-tier models from this provider.
   */
  static async isProviderLocked(providerId: string): Promise<boolean> {
    const provider = await prisma.providerConfig.findUnique({
      where: { id: providerId }
    });

    if (!provider) return true;
    if (!provider.isEnabled) return true;
    if (provider.status === 'LOCKED') return true;
    if (provider.enforceFreeOnly) return true;

    // Budget Check: If monthlyBudget is set, compare with current month's usage
    if (provider.monthlyBudget && provider.monthlyBudget > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usage = await prisma.modelUsage.aggregate({
        where: {
          model: { providerId },
          createdAt: { gte: startOfMonth }
        },
        _sum: { cost: true }
      });

      const totalSpent = usage._sum.cost || 0;
      if (totalSpent >= provider.monthlyBudget) {
        console.warn(`[CreditGuard] 🚨 Budget exceeded for ${providerId} ($${totalSpent.toFixed(2)} / $${provider.monthlyBudget.toFixed(2)})`);
        return true;
      }
    }

    return false;
  }
}
