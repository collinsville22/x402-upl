import { ExecutionStep } from '../types/workflow.js';
export interface X402Service {
    id: string;
    name: string;
    description: string;
    url: string;
    category: string;
    pricePerCall: number;
    currency: string;
    capabilities: string[];
    reputationScore: number;
    uptimePercentage: number;
    averageResponseTime: number;
    totalCalls: number;
    owner: string;
    verified: boolean;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
}
export interface ServiceMatchResult {
    service: X402Service;
    score: number;
    reasoning: string;
}
export interface ServiceDiscoveryConfig {
    registryUrl: string;
    redisUrl?: string;
    cacheTTL?: number;
}
export declare class ServiceDiscoveryEngine {
    private httpClient;
    private redis?;
    private cacheTTL;
    private registryUrl;
    constructor(config: ServiceDiscoveryConfig);
    discoverServices(category?: string): Promise<X402Service[]>;
    matchServiceToStep(step: ExecutionStep): Promise<ServiceMatchResult | null>;
    matchAllSteps(steps: ExecutionStep[]): Promise<Map<string, ServiceMatchResult>>;
    private calculateMatchScore;
    private calculateSemanticSimilarity;
    private explainMatch;
    getServiceById(serviceId: string): Promise<X402Service | null>;
    rateService(serviceId: string, agentAddress: string, rating: number): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=service-discovery.d.ts.map