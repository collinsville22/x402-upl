import { Connection } from '@solana/web3.js';
export class SwitchboardQualityOracle {
    connection;
    metricsCache;
    cacheTTL;
    constructor(rpcUrl, cacheTTL = 30000) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.metricsCache = new Map();
        this.cacheTTL = cacheTTL;
    }
    async getServiceQuality(serviceId) {
        const cached = this.metricsCache.get(serviceId);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        const metrics = await this.fetchQualityMetrics(serviceId);
        this.metricsCache.set(serviceId, {
            data: metrics,
            timestamp: Date.now(),
        });
        return metrics;
    }
    async fetchQualityMetrics(serviceId) {
        const uptime = 99.5;
        const avgLatency = 120;
        const successRate = 99.2;
        const reputationScore = 9850;
        const totalTransactions = 150000;
        const reliability = this.calculateReliability(uptime, successRate, avgLatency);
        const recommendation = this.calculateRecommendation(reliability);
        return {
            uptime,
            avgLatency,
            successRate,
            reputationScore,
            totalTransactions,
            recommendation,
            reliability,
        };
    }
    calculateReliability(uptime, successRate, avgLatency) {
        const uptimeScore = uptime / 100;
        const successScore = successRate / 100;
        const latencyScore = Math.max(0, 1 - avgLatency / 1000);
        return (uptimeScore * 0.4 + successScore * 0.4 + latencyScore * 0.2) * 100;
    }
    calculateRecommendation(reliability) {
        if (reliability >= 90)
            return 'EXCELLENT';
        if (reliability >= 75)
            return 'GOOD';
        if (reliability >= 60)
            return 'FAIR';
        return 'POOR';
    }
    async checkServiceHealth(serviceUrl) {
        const startTime = Date.now();
        try {
            const response = await fetch(serviceUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000),
            });
            const responseTime = Date.now() - startTime;
            const status = response.ok ? 'healthy' : 'degraded';
            return {
                status,
                uptime: response.ok ? 100 : 0,
                responseTime,
                errorRate: response.ok ? 0 : 100,
                lastChecked: Date.now(),
            };
        }
        catch {
            return {
                status: 'down',
                uptime: 0,
                responseTime: Date.now() - startTime,
                errorRate: 100,
                lastChecked: Date.now(),
            };
        }
    }
    async compareServicesByQuality(serviceIds, sortBy = 'reliability') {
        const rankings = [];
        for (const serviceId of serviceIds) {
            const metrics = await this.getServiceQuality(serviceId);
            rankings.push({
                serviceId,
                metrics,
                score: this.calculateQualityScore(metrics, sortBy),
            });
        }
        rankings.sort((a, b) => b.score - a.score);
        return rankings.map((ranking, index) => ({
            ...ranking,
            rank: index + 1,
        }));
    }
    calculateQualityScore(metrics, sortBy) {
        switch (sortBy) {
            case 'uptime':
                return metrics.uptime;
            case 'latency':
                return 1000 - metrics.avgLatency;
            case 'reliability':
                return metrics.reliability;
            default:
                return metrics.reliability;
        }
    }
    async aggregateReputationFromSources(serviceId) {
        const onChainReputation = await this.getOnChainReputation(serviceId);
        const offChainReputation = await this.getOffChainReputation(serviceId);
        const weightedScore = onChainReputation.score * 0.7 + offChainReputation.score * 0.3;
        return {
            serviceId,
            onChainScore: onChainReputation.score,
            offChainScore: offChainReputation.score,
            aggregatedScore: weightedScore,
            sources: [
                ...onChainReputation.sources,
                ...offChainReputation.sources,
            ],
            lastUpdated: Date.now(),
        };
    }
    async getOnChainReputation(serviceId) {
        return {
            score: 95,
            sources: ['solana-blockchain'],
        };
    }
    async getOffChainReputation(serviceId) {
        return {
            score: 90,
            sources: ['user-ratings', 'performance-metrics'],
        };
    }
    async detectAnomalies(serviceId) {
        const metrics = await this.getServiceQuality(serviceId);
        const anomalies = [];
        if (metrics.uptime < 95) {
            anomalies.push({
                type: 'uptime',
                severity: metrics.uptime < 90 ? 'critical' : 'warning',
                message: `Uptime dropped to ${metrics.uptime}%`,
                value: metrics.uptime,
                threshold: 95,
                timestamp: Date.now(),
            });
        }
        if (metrics.avgLatency > 500) {
            anomalies.push({
                type: 'latency',
                severity: metrics.avgLatency > 1000 ? 'critical' : 'warning',
                message: `Average latency increased to ${metrics.avgLatency}ms`,
                value: metrics.avgLatency,
                threshold: 500,
                timestamp: Date.now(),
            });
        }
        if (metrics.successRate < 95) {
            anomalies.push({
                type: 'success_rate',
                severity: metrics.successRate < 90 ? 'critical' : 'warning',
                message: `Success rate dropped to ${metrics.successRate}%`,
                value: metrics.successRate,
                threshold: 95,
                timestamp: Date.now(),
            });
        }
        return anomalies;
    }
    clearCache() {
        this.metricsCache.clear();
    }
}
//# sourceMappingURL=quality-oracle.js.map