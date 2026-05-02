import { Model } from '@prisma/client';
import { prisma } from '../db.js';

export class ModelSelectorBandit {
  static CALIBRATION_THRESHOLD = 5;

  static async selectModelsForTask(capabilityRequired: 'Code' | 'Plan' | 'Json' | 'Tool', count: number = 1): Promise<Model[]> {
    // Determine the field names dynamically based on the requested capability
    const scoreField = `score${capabilityRequired}` as keyof Model;
    const trialsField = `trials${capabilityRequired}` as keyof Model;

    // Fetch active models with their provider, excluding DEGRADED providers
    const models = await prisma.model.findMany({
      where: {
        isActive: true,
        provider: {
          status: {
            not: 'DEGRADED',
          },
        },
      },
      include: {
        provider: true,
      },
    });

    if (models.length === 0) {
      return [];
    }

    // Sort into veterans and rookies based on the trials for the requested capability
    const veterans = models.filter((m: Model) => (m[trialsField] as number) >= this.CALIBRATION_THRESHOLD);
    const rookies = models.filter((m: Model) => (m[trialsField] as number) < this.CALIBRATION_THRESHOLD);

    // Helper to score billing risk (lower is better for sorting priority)
    const getRiskScore = (riskLevel: string) => {
      switch (riskLevel) {
        case 'ZERO_RISK': return 0;
        case 'PROMO_BURN': return 1;
        case 'CC_ON_FILE': return 2;
        default: return 3;
      }
    };

    // Sort rookies by lowest risk first, then by fewest trials
    rookies.sort((a: any, b: any) => {
      const riskDiff = getRiskScore(a.provider?.billingRiskLevel) - getRiskScore(b.provider?.billingRiskLevel);
      if (riskDiff !== 0) return riskDiff;
      return (a[trialsField] as number) - (b[trialsField] as number);
    });

    // Sort veterans by lowest risk first, then by highest score
    veterans.sort((a: any, b: any) => {
      const riskDiff = getRiskScore(a.provider?.billingRiskLevel) - getRiskScore(b.provider?.billingRiskLevel);
      if (riskDiff !== 0) return riskDiff;
      return (b[scoreField] as number) - (a[scoreField] as number);
    });

    if (count === 1) {
      // Epsilon-Greedy Logic: 20% chance for a rookie, 80% for a veteran
      const rand = Math.random();
      if (rand < 0.20 && rookies.length > 0) {
        return [rookies[0]];
      } else if (veterans.length > 0) {
        return [veterans[0]];
      } else if (rookies.length > 0) {
        // Fallback to rookie if no veterans
        return [rookies[0]];
      }
      return [models[0]]; // Final fallback
    }

    if (count === 2) {
      // Heterogeneous Mentorship Logic
      let selectedVeteran: Model | null = null;
      if (veterans.length > 0) {
        selectedVeteran = veterans[0];
      }

      if (!selectedVeteran) {
        // No veterans available, just return up to two rookies
        return rookies.slice(0, 2);
      }

      // Find cross-provider rookie
      const selectedRookie = rookies.find((r: Model) => r.providerId !== selectedVeteran.providerId);

      if (selectedRookie) {
        return [selectedVeteran, selectedRookie];
      }

      // If no cross-provider rookie, fallback to cross-provider veteran
      const alternativeVeteran = veterans.find((v: Model) => v.providerId !== selectedVeteran.providerId);
      if (alternativeVeteran) {
        return [selectedVeteran, alternativeVeteran];
      }

      // Final fallback: just return the veteran and whatever is next (could be same provider)
      const fallbackSecond = rookies[0] || veterans[1];
      if (fallbackSecond) {
        return [selectedVeteran, fallbackSecond];
      }

      return [selectedVeteran];
    }

    // For any other count, just return top veterans (or rookies if no veterans) up to count
    const combined = [...veterans, ...rookies];
    return combined.slice(0, count);
  }
}
