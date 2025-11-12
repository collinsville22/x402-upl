export interface ServiceRegistration {
    name: string;
    description: string;
    url: string;
    category: string;
    pricing: {
        amount: number;
        currency: string;
    };
    walletAddress: string;
    network: string;
    acceptedTokens: string[];
    capabilities?: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface Service extends ServiceRegistration {
    serviceId: string;
    status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
    reputation?: number;
    totalCalls?: number;
    uptime?: number;
    registeredAt: string;
    lastUpdated: string;
}
export interface ServiceMetrics {
    requestCount: number;
    successCount: number;
    errorCount: number;
    averageResponseTime: number;
    totalRevenue: number;
    period: string;
}
export declare class RegistryClient {
    private client;
    private serviceId?;
    private registryUrl;
    constructor(registryUrl: string);
    registerService(registration: ServiceRegistration): Promise<Service>;
    updateService(updates: Partial<ServiceRegistration>): Promise<Service>;
    setServiceStatus(status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED'): Promise<void>;
    reportMetrics(metrics: ServiceMetrics): Promise<void>;
    getServiceInfo(): Promise<Service | null>;
    heartbeat(): Promise<void>;
    getServiceId(): string | undefined;
}
//# sourceMappingURL=registry-client.d.ts.map