import { Connection, PublicKey } from '@solana/web3.js';
export class SwitchboardPriceOracle {
    connection;
    programId;
    priceCache;
    cacheTTL;
    constructor(rpcUrl, programId, cacheTTL = 60000) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.programId = new PublicKey(programId);
        this.priceCache = new Map();
        this.cacheTTL = cacheTTL;
    }
    async getServicePrice(serviceId, category) {
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
    async fetchPriceData(serviceId, category) {
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
    async getCompetitorPrices(category) {
        return [];
    }
    calculateRecommendation(currentPrice, averagePrice) {
        const percentDiff = ((currentPrice - averagePrice) / averagePrice) * 100;
        if (percentDiff < -15)
            return 'CHEAP';
        if (percentDiff > 15)
            return 'EXPENSIVE';
        return 'FAIR';
    }
    calculateConfidence(sampleSize) {
        if (sampleSize >= 50)
            return 1.0;
        if (sampleSize >= 20)
            return 0.8;
        if (sampleSize >= 10)
            return 0.6;
        if (sampleSize >= 5)
            return 0.4;
        return 0.2;
    }
    async compareServicePrices(serviceId, category, limit = 10) {
        const priceData = await this.getServicePrice(serviceId, category);
        const comparisons = priceData.competitorPrices.map((price, index) => ({
            serviceId: `service_${index}`,
            serviceName: `Service ${index + 1}`,
            currentPrice: price,
            marketAverage: priceData.averagePrice,
            percentageDiff: ((price - priceData.averagePrice) / priceData.averagePrice) * 100,
            ranking: index + 1,
        }));
        return comparisons.slice(0, limit);
    }
    async getDynamicPrice(serviceId, basePrice, currentDemand) {
        const demandMultiplier = {
            low: 0.8,
            medium: 1.0,
            high: 1.3,
        };
        return basePrice * demandMultiplier[currentDemand];
    }
    async trackPriceTrend(serviceId, category, days = 30) {
        const historicalPrices = [];
        return {
            serviceId,
            category,
            dataPoints: historicalPrices,
            trend: this.calculateTrend(historicalPrices),
            volatility: this.calculateVolatility(historicalPrices),
        };
    }
    calculateTrend(prices) {
        if (prices.length < 2)
            return 'stable';
        const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
        const secondHalf = prices.slice(Math.floor(prices.length / 2));
        const firstAvg = firstHalf.reduce((sum, p) => sum + p.price, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, p) => sum + p.price, 0) / secondHalf.length;
        const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;
        if (percentChange > 5)
            return 'increasing';
        if (percentChange < -5)
            return 'decreasing';
        return 'stable';
    }
    calculateVolatility(prices) {
        if (prices.length < 2)
            return 0;
        const priceValues = prices.map(p => p.price);
        const mean = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;
        const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / priceValues.length;
        return Math.sqrt(variance);
    }
    clearCache() {
        this.priceCache.clear();
    }
}
//# sourceMappingURL=price-oracle.js.map