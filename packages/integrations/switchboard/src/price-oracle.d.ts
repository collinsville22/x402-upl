export interface PriceData {
    currentPrice: number;
    averagePrice: number;
    priceRange: [number, number];
    recommendation: 'CHEAP' | 'FAIR' | 'EXPENSIVE';
    competitorPrices: number[];
    lastUpdated: number;
    confidence: number;
}
export interface ServicePriceComparison {
    serviceId: string;
    serviceName: string;
    currentPrice: number;
    marketAverage: number;
    percentageDiff: number;
    ranking: number;
}
export declare class SwitchboardPriceOracle {
    private connection;
    private programId;
    private priceCache;
    private cacheTTL;
    constructor(rpcUrl: string, programId: string, cacheTTL?: number);
    getServicePrice(serviceId: string, category: string): Promise<PriceData>;
    private fetchPriceData;
    private getCompetitorPrices;
    private calculateRecommendation;
    private calculateConfidence;
    compareServicePrices(serviceId: string, category: string, limit?: number): Promise<ServicePriceComparison[]>;
    getDynamicPrice(serviceId: string, basePrice: number, currentDemand: 'low' | 'medium' | 'high'): Promise<number>;
    trackPriceTrend(serviceId: string, category: string, days?: number): Promise<PriceTrendData>;
    private calculateTrend;
    private calculateVolatility;
    clearCache(): void;
}
interface PricePoint {
    price: number;
    timestamp: number;
}
interface PriceTrendData {
    serviceId: string;
    category: string;
    dataPoints: PricePoint[];
    trend: 'increasing' | 'decreasing' | 'stable';
    volatility: number;
}
export {};
//# sourceMappingURL=price-oracle.d.ts.map