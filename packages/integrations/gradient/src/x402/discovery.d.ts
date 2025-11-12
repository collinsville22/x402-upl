import { EventEmitter } from 'events';
import { ServiceDiscoveryRequest, ServiceInfo } from '../types/index.js';
export interface DiscoveryConfig {
    registryUrl: string;
    cacheTimeout?: number;
    redisUrl?: string;
}
export interface ValueScore {
    service: ServiceInfo;
    valueScore: number;
    priceScore: number;
    reputationScore: number;
}
export declare class ServiceDiscovery extends EventEmitter {
    private registryUrl;
    private registryClient;
    private cache;
    private redis;
    private cacheTimeout;
    private keyPrefix;
    constructor(config: DiscoveryConfig);
    private convertToServiceInfo;
    discoverServices(request?: ServiceDiscoveryRequest): Promise<ServiceInfo[]>;
    rankServicesByValue(services: ServiceInfo[], optimizeFor?: 'value' | 'price' | 'reputation'): ValueScore[];
    findBestService(request: ServiceDiscoveryRequest & {
        optimizeFor?: 'value' | 'price' | 'reputation';
    }): Promise<ServiceInfo | null>;
    compareServices(request: ServiceDiscoveryRequest, minimumComparisons?: number): Promise<ValueScore[]>;
    clearCache(): Promise<void>;
    disconnect(): Promise<void>;
    private getCacheKey;
}
//# sourceMappingURL=discovery.d.ts.map