export interface ServiceRegistration {
    url: string;
    name: string;
    description: string;
    category: string;
    ownerWalletAddress: string;
    pricePerCall: number;
    acceptedTokens: string[];
    capabilities?: string[];
    tags?: string[];
}
export interface Service {
    id: string;
    url: string;
    name: string;
    description: string;
    category: string;
    pricePerCall: number;
    acceptedTokens: string[];
    reputationScore: number;
    verified: boolean;
    uptime: number;
}
export declare class RegistryClient {
    private registryUrl;
    private serviceId?;
    constructor(registryUrl: string);
    registerService(registration: ServiceRegistration): Promise<Service>;
    updateServiceStatus(status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED'): Promise<void>;
    reportMetrics(metrics: {
        responseTime: number;
        successRate: number;
    }): Promise<void>;
    discover(filters?: {
        category?: string;
        maxPrice?: number;
        minReputation?: number;
    }): Promise<Service[]>;
    getServiceId(): string | undefined;
}
//# sourceMappingURL=registry-client.d.ts.map