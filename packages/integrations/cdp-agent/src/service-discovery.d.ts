export interface X402Service {
    resource: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    accepts: PaymentRequirement[];
    description?: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
}
export interface PaymentRequirement {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    asset: string;
    payTo: string;
    resource: string;
    description?: string;
    mimeType?: string;
    outputSchema?: Record<string, any>;
    maxTimeoutSeconds?: number;
}
export declare class ServiceDiscovery {
    private bazaarUrl;
    constructor(bazaarUrl?: string);
    listAllServices(): Promise<X402Service[]>;
    searchServices(query: string): Promise<X402Service[]>;
    findServicesByNetwork(network: string): Promise<X402Service[]>;
    findCheapestService(category: string): Promise<X402Service | null>;
    getServiceDetails(resourceUrl: string): Promise<X402Service | null>;
}
//# sourceMappingURL=service-discovery.d.ts.map