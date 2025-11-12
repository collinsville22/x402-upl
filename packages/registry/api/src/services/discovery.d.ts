import type { DiscoverServicesInput } from '../schemas/service.js';
import type { Service } from '@prisma/client';
interface ServiceWithScore extends Service {
    valueScore: number;
}
export declare class ServiceDiscovery {
    private static CACHE_TTL;
    static discover(params: DiscoverServicesInput): Promise<ServiceWithScore[]>;
    static getServiceById(serviceId: string): Promise<Service | null>;
    static getServiceByUrl(url: string): Promise<Service | null>;
    private static calculateValueScore;
    private static sortServices;
    static getAllCategories(): Promise<string[]>;
    static getServiceMetrics(serviceId: string): Promise<any>;
}
export {};
//# sourceMappingURL=discovery.d.ts.map