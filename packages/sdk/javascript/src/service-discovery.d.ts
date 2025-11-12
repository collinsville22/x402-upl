export interface X402Service {
    id?: string;
    name: string;
    description: string;
    url: string;
    resource: string;
    category?: string;
    pricePerCall?: number;
    pricing?: {
        amount: string;
        asset: string;
        network: string;
    };
    reputationScore?: number;
    uptimePercentage?: number;
    averageRating?: number;
    method?: string;
    accepts?: Array<{
        scheme: string;
        network: string;
        asset: string;
        maxAmountRequired: string;
    }>;
}
export interface DiscoverOptions {
    query?: string;
    category?: string;
    maxPrice?: number;
    minReputation?: number;
    minUptime?: number;
    tags?: string[];
    sortBy?: 'price' | 'reputation' | 'value' | 'recent';
    limit?: number;
}
export declare class ServiceDiscovery {
    private registryUrl;
    constructor(registryUrl?: string);
    discover(options?: DiscoverOptions): Promise<X402Service[]>;
    getService(serviceId: string): Promise<X402Service>;
    searchServices(query: string): Promise<X402Service[]>;
    findCheapestService(category: string): Promise<X402Service | null>;
    getCategories(): Promise<string[]>;
    registerService(service: ServiceRegistration): Promise<X402Service>;
}
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
//# sourceMappingURL=service-discovery.d.ts.map