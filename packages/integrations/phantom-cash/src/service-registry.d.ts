export interface X402Service {
    serviceId: string;
    name: string;
    description: string;
    endpoint: string;
    method: 'GET' | 'POST';
    costCash: number;
    paymentAddress: string;
    parameters: Record<string, ServiceParameter>;
    category: string[];
}
export interface ServiceParameter {
    type: 'string' | 'number' | 'boolean' | 'object';
    description: string;
    required: boolean;
    default?: any;
}
export declare class ServiceRegistry {
    private services;
    private registryClient;
    private useRemoteRegistry;
    constructor(registryUrl?: string);
    private convertRemoteToLocal;
    registerService(service: X402Service): void;
    getService(serviceId: string): Promise<X402Service | undefined>;
    listServices(): Promise<X402Service[]>;
    findServicesByCategory(category: string): Promise<X402Service[]>;
    searchServices(query: string): Promise<X402Service[]>;
    calculateTotalCost(serviceIds: string[]): Promise<number>;
    getCheapestService(category: string): Promise<X402Service | null>;
    getServicesByMaxCost(maxCost: number): Promise<X402Service[]>;
}
//# sourceMappingURL=service-registry.d.ts.map