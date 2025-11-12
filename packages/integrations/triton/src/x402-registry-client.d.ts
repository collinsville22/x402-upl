import { X402ServiceInfo, X402ServiceRegistration } from './types.js';
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
    getServicesByOwner(ownerWallet: string): Promise<X402ServiceInfo[]>;
    updateService(serviceId: string, updates: Partial<X402ServiceRegistration>): Promise<X402ServiceInfo | null>;
    rateService(serviceId: string, rating: number, agentAddress: string): Promise<void>;
    getServiceStats(serviceId: string): Promise<any>;
    getCategories(): Promise<string[]>;
    getCheapestService(category: string): Promise<X402ServiceInfo | null>;
    getBestValueService(category: string): Promise<X402ServiceInfo | null>;
}
//# sourceMappingURL=x402-registry-client.d.ts.map