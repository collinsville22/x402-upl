export interface QualityMetrics {
    uptime: number;
    avgLatency: number;
    successRate: number;
    reputationScore: number;
    totalTransactions: number;
    recommendation: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    reliability: number;
}
export interface ServiceHealthStatus {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    responseTime: number;
    errorRate: number;
    lastChecked: number;
}
export declare class SwitchboardQualityOracle {
    private connection;
    private metricsCache;
    private cacheTTL;
    constructor(rpcUrl: string, cacheTTL?: number);
    getServiceQuality(serviceId: string): Promise<QualityMetrics>;
    private fetchQualityMetrics;
    private calculateReliability;
    private calculateRecommendation;
    checkServiceHealth(serviceUrl: string): Promise<ServiceHealthStatus>;
    compareServicesByQuality(serviceIds: string[], sortBy?: 'uptime' | 'latency' | 'reliability'): Promise<ServiceQualityRanking[]>;
    private calculateQualityScore;
    aggregateReputationFromSources(serviceId: string): Promise<AggregatedReputation>;
    private getOnChainReputation;
    private getOffChainReputation;
    detectAnomalies(serviceId: string): Promise<QualityAnomaly[]>;
    clearCache(): void;
}
interface ServiceQualityRanking {
    serviceId: string;
    metrics: QualityMetrics;
    score: number;
    rank?: number;
}
interface AggregatedReputation {
    serviceId: string;
    onChainScore: number;
    offChainScore: number;
    aggregatedScore: number;
    sources: string[];
    lastUpdated: number;
}
interface QualityAnomaly {
    type: 'uptime' | 'latency' | 'success_rate';
    severity: 'warning' | 'critical';
    message: string;
    value: number;
    threshold: number;
    timestamp: number;
}
export {};
//# sourceMappingURL=quality-oracle.d.ts.map