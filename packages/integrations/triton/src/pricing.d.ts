import { PricingTier, CostCalculation, RPCRequest } from './types.js';
export declare class PricingEngine {
    private tiers;
    private currentSlot;
    private slotsPerDay;
    constructor();
    private initializePricingTiers;
    updateCurrentSlot(slot: number): void;
    calculateCost(request: RPCRequest, dataVolume?: number): CostCalculation;
    private extractSlotFromParams;
    private paramsToObject;
    estimateDataVolume(method: string, params?: any[]): number;
    getMethodPricing(method: string): PricingTier | undefined;
    getAllPricingTiers(): PricingTier[];
}
//# sourceMappingURL=pricing.d.ts.map