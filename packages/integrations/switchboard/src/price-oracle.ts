import { Connection, PublicKey } from '@solana/web3.js';

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

export class SwitchboardPriceOracle {
  private connection: Connection;
  private programId: PublicKey;
  private priceCache: Map<string, CachedPrice>;
  private cacheTTL: number;

  constructor(rpcUrl: string, programId: string, cacheTTL: number = 60000) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    this.priceCache = new Map();
    this.cacheTTL = cacheTTL;
  }

  async getServicePrice(serviceId: string, category: string): Promise<PriceData> {
    const cacheKey = `${serviceId}:${category}`;
    const cached = this.priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const priceData = await this.fetchPriceData(serviceId, category);

    this.priceCache.set(cacheKey, {
      data: priceData,
      timestamp: Date.now(),
    });

    return priceData;
  }

  private async fetchPriceData(serviceId: string, category: string): Promise<PriceData> {
    const competitorPrices = await this.getCompetitorPrices(category);

    if (competitorPrices.length === 0) {
      return {
        currentPrice: 0,
        averagePrice: 0,
        priceRange: [0, 0],
        recommendation: 'FAIR',
        competitorPrices: [],
        lastUpdated: Date.now(),
        confidence: 0,
      };
    }

    const sortedPrices = [...competitorPrices].sort((a, b) => a - b);
    const averagePrice = sortedPrices.reduce((sum, p) => sum + p, 0) / sortedPrices.length;
    const minPrice = sortedPrices[0];
    const maxPrice = sortedPrices[sortedPrices.length - 1];

    const currentPrice = sortedPrices[0];

    const recommendation = this.calculateRecommendation(currentPrice, averagePrice);

    return {
      currentPrice,
      averagePrice,
      priceRange: [minPrice, maxPrice],
      recommendation,
      competitorPrices: sortedPrices,
      lastUpdated: Date.now(),
      confidence: this.calculateConfidence(sortedPrices.length),
    };
  }

  private async getCompetitorPrices(category: string): Promise<number[]> {
    return [];
  }

  private calculateRecommendation(
    currentPrice: number,
    averagePrice: number
  ): 'CHEAP' | 'FAIR' | 'EXPENSIVE' {
    const percentDiff = ((currentPrice - averagePrice) / averagePrice) * 100;

    if (percentDiff < -15) return 'CHEAP';
    if (percentDiff > 15) return 'EXPENSIVE';
    return 'FAIR';
  }

  private calculateConfidence(sampleSize: number): number {
    if (sampleSize >= 50) return 1.0;
    if (sampleSize >= 20) return 0.8;
    if (sampleSize >= 10) return 0.6;
    if (sampleSize >= 5) return 0.4;
    return 0.2;
  }

  async compareServicePrices(
    serviceId: string,
    category: string,
    limit: number = 10
  ): Promise<ServicePriceComparison[]> {
    const priceData = await this.getServicePrice(serviceId, category);

    const comparisons: ServicePriceComparison[] = priceData.competitorPrices.map((price, index) => ({
      serviceId: `service_${index}`,
      serviceName: `Service ${index + 1}`,
      currentPrice: price,
      marketAverage: priceData.averagePrice,
      percentageDiff: ((price - priceData.averagePrice) / priceData.averagePrice) * 100,
      ranking: index + 1,
    }));

    return comparisons.slice(0, limit);
  }

  async getDynamicPrice(
    serviceId: string,
    basePrice: number,
    currentDemand: 'low' | 'medium' | 'high'
  ): Promise<number> {
    const demandMultiplier = {
      low: 0.8,
      medium: 1.0,
      high: 1.3,
    };

    return basePrice * demandMultiplier[currentDemand];
  }

  async trackPriceTrend(
    serviceId: string,
    category: string,
    days: number = 30
  ): Promise<PriceTrendData> {
    const historicalPrices: PricePoint[] = [];

    return {
      serviceId,
      category,
      dataPoints: historicalPrices,
      trend: this.calculateTrend(historicalPrices),
      volatility: this.calculateVolatility(historicalPrices),
    };
  }

  private calculateTrend(prices: PricePoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (prices.length < 2) return 'stable';

    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p.price, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.price, 0) / secondHalf.length;

    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (percentChange > 5) return 'increasing';
    if (percentChange < -5) return 'decreasing';
    return 'stable';
  }

  private calculateVolatility(prices: PricePoint[]): number {
    if (prices.length < 2) return 0;

    const priceValues = prices.map(p => p.price);
    const mean = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;

    const variance =
      priceValues.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / priceValues.length;

    return Math.sqrt(variance);
  }

  clearCache(): void {
    this.priceCache.clear();
  }
}

interface CachedPrice {
  data: PriceData;
  timestamp: number;
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
