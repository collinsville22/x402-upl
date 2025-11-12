import { PricingTier, CostCalculation, RPCRequest } from './types.js';

export class PricingEngine {
  private tiers: Map<string, PricingTier> = new Map();
  private currentSlot: number = 0;
  private slotsPerDay: number = 216000;

  constructor() {
    this.initializePricingTiers();
  }

  private initializePricingTiers(): void {
    const tiers: PricingTier[] = [
      {
        method: 'getBlock',
        basePrice: 0.0001,
        volumeMultiplier: 0.00001,
        ageMultiplier: 1.0,
      },
      {
        method: 'getTransaction',
        basePrice: 0.00005,
        volumeMultiplier: 0,
        ageMultiplier: 1.0,
      },
      {
        method: 'getSignaturesForAddress',
        basePrice: 0.0001,
        volumeMultiplier: 0.000001,
        ageMultiplier: 1.0,
      },
      {
        method: 'getBlockTime',
        basePrice: 0.00001,
        volumeMultiplier: 0,
        ageMultiplier: 1.0,
      },
      {
        method: 'getGenesisHash',
        basePrice: 0.000005,
        volumeMultiplier: 0,
        ageMultiplier: 0,
      },
      {
        method: 'getVersion',
        basePrice: 0.000005,
        volumeMultiplier: 0,
        ageMultiplier: 0,
      },
      {
        method: 'getSlot',
        basePrice: 0.000005,
        volumeMultiplier: 0,
        ageMultiplier: 0,
      },
      {
        method: 'getFirstAvailableBlock',
        basePrice: 0.00001,
        volumeMultiplier: 0,
        ageMultiplier: 0,
      },
    ];

    for (const tier of tiers) {
      this.tiers.set(tier.method, tier);
    }
  }

  updateCurrentSlot(slot: number): void {
    this.currentSlot = slot;
  }

  calculateCost(request: RPCRequest, dataVolume?: number): CostCalculation {
    const tier = this.tiers.get(request.method);

    if (!tier) {
      return {
        baseCost: 0.0001,
        volumeCost: 0,
        ageMultiplier: 1.0,
        totalCost: 0.0001,
        currency: 'CASH',
        breakdown: {
          method: request.method,
          params: this.paramsToObject(request.params),
        },
      };
    }

    const baseCost = tier.basePrice;
    let volumeCost = 0;
    let ageMultiplier = 1.0;
    let dataAge: number | undefined;

    if (tier.volumeMultiplier > 0 && dataVolume) {
      volumeCost = tier.volumeMultiplier * dataVolume;
    }

    if (tier.ageMultiplier > 0) {
      const querySlot = this.extractSlotFromParams(request.method, request.params);
      if (querySlot !== null && this.currentSlot > 0) {
        const slotAge = this.currentSlot - querySlot;
        dataAge = slotAge;

        if (slotAge > this.slotsPerDay * 180) {
          ageMultiplier = 5.0;
        } else if (slotAge > this.slotsPerDay * 30) {
          ageMultiplier = 2.0;
        }
      }
    }

    const totalCost = (baseCost + volumeCost) * ageMultiplier;

    return {
      baseCost,
      volumeCost,
      ageMultiplier,
      totalCost,
      currency: 'CASH',
      breakdown: {
        method: request.method,
        params: this.paramsToObject(request.params),
        dataVolume,
        dataAge,
      },
    };
  }

  private extractSlotFromParams(method: string, params?: any[]): number | null {
    if (!params || params.length === 0) {
      return null;
    }

    switch (method) {
      case 'getBlock':
      case 'getBlockTime':
        return typeof params[0] === 'number' ? params[0] : null;
      case 'getTransaction':
        return null;
      case 'getSignaturesForAddress':
        if (params.length > 1 && params[1]?.before) {
          return null;
        }
        return null;
      default:
        return null;
    }
  }

  private paramsToObject(params?: any[]): Record<string, any> {
    if (!params) {
      return {};
    }

    if (Array.isArray(params)) {
      return params.reduce((acc, param, index) => {
        acc[`param${index}`] = param;
        return acc;
      }, {} as Record<string, any>);
    }

    return params as Record<string, any>;
  }

  estimateDataVolume(method: string, params?: any[]): number {
    switch (method) {
      case 'getBlock':
        return 1000;
      case 'getTransaction':
        return 1;
      case 'getSignaturesForAddress':
        const limit = params?.[1]?.limit || 1000;
        return limit;
      default:
        return 1;
    }
  }

  getMethodPricing(method: string): PricingTier | undefined {
    return this.tiers.get(method);
  }

  getAllPricingTiers(): PricingTier[] {
    return Array.from(this.tiers.values());
  }
}
