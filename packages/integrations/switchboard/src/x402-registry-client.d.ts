export interface X402ServiceRegistration {
    name: string;
    description: string;
    category: string;
    url: string;
    pricePerCall: number;
    ownerWalletAddress: string;
    acceptedTokens: string[];
    capabilities: string[];
    metadata?: Record<string, any>;
}
export interface X402ServiceInfo {
    id: string;
    name: string;
    description: string;
    category: string;
    url: string;
    pricePerCall: number;
    ownerWalletAddress: string;
    acceptedTokens: string[];
    capabilities: string[];
    reputation: number;
    totalCalls: number;
    averageResponseTime: number;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}
export interface X402DiscoveryQuery {
    category?: string;
    minReputation?: number;
    maxPrice?: number;
    capabilities?: string[];
    limit?: number;
    offset?: number;
}
export declare class X402RegistryClient {
    private httpClient;
    private registryUrl;
    constructor(registryUrl?: string);
    discoverServices(query?: X402DiscoveryQuery): Promise<X402ServiceInfo[]>;
    registerService(service: X402ServiceRegistration): Promise<X402ServiceInfo>;
    getServiceById(serviceId: string): Promise<X402ServiceInfo | null>;
    getServicesByCategory(category: string): Promise<X402ServiceInfo[]>;
    searchServices(query: string): Promise<X402ServiceInfo[]>;
    updateService(serviceId: string, updates: Partial<X402ServiceRegistration>): Promise<X402ServiceInfo | null>;
    rateService(serviceId: string, rating: number, agentAddress: string): Promise<void>;
    getCheapestService(category: string): Promise<X402ServiceInfo | null>;
}
//# sourceMappingURL=x402-registry-client.d.ts.map