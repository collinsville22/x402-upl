export interface X402ServiceRegistration {
    url: string;
    name: string;
    description: string;
    category: string;
    ownerWalletAddress: string;
    pricePerCall: number;
    pricingModel?: 'FLAT' | 'TIERED' | 'DYNAMIC';
    acceptedTokens: string[];
    openapiSchemaUri?: string;
    inputSchema?: string;
    outputSchema?: string;
    capabilities?: string[];
    tags?: string[];
}
export interface X402ServiceInfo {
    id: string;
    url: string;
    name: string;
    description: string;
    category: string;
    ownerWalletAddress: string;
    pricePerCall: number;
    pricingModel: string;
    acceptedTokens: string[];
    reputation: number;
    totalCalls: number;
    uptime: number;
    averageLatency: number;
    status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
    createdAt: string;
    updatedAt: string;
}
export interface X402DiscoveryQuery {
    query?: string;
    category?: string;
    maxPrice?: number;
    minReputation?: number;
    minUptime?: number;
    tags?: string[];
    sortBy?: 'price' | 'reputation' | 'value' | 'recent';
    limit?: number;
    offset?: number;
}
export declare class X402RegistryClient {
    private httpClient;
    private registryUrl;
    constructor(registryUrl?: string);
    registerService(service: X402ServiceRegistration): Promise<X402ServiceInfo>;
    discoverServices(query: X402DiscoveryQuery): Promise<X402ServiceInfo[]>;
    getServiceById(serviceId: string): Promise<X402ServiceInfo>;
    getServicesByCategory(category: string): Promise<X402ServiceInfo[]>;
    searchServices(query: string): Promise<X402ServiceInfo[]>;
    getServicesByMaxPrice(maxPrice: number): Promise<X402ServiceInfo[]>;
    getCheapestService(category: string): Promise<X402ServiceInfo | null>;
    getAllCategories(): Promise<string[]>;
    updateService(serviceId: string, updates: Partial<X402ServiceRegistration>): Promise<X402ServiceInfo>;
    rateService(serviceId: string, agentAddress: string, rating: number): Promise<void>;
    getServiceStats(serviceId: string): Promise<any>;
    getServiceMetrics(serviceId: string): Promise<any>;
    getServicesByOwner(walletAddress: string): Promise<X402ServiceInfo[]>;
}
//# sourceMappingURL=x402-registry-client.d.ts.map