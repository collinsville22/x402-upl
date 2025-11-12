import type { RegisterServiceInput, UpdateServiceInput } from '../schemas/service.js';
import type { Service } from '@prisma/client';
export declare class ServiceManagement {
    static register(input: RegisterServiceInput): Promise<Service>;
    static update(serviceId: string, input: UpdateServiceInput): Promise<Service>;
    static updateMetrics(serviceId: string, responseTimeMs: number, success: boolean): Promise<void>;
    private static generateProxyUrl;
    static verifyService(serviceId: string): Promise<Service>;
    static setVisaTapVerified(serviceId: string, verified: boolean): Promise<Service>;
    static getServicesByOwner(ownerWalletAddress: string): Promise<Service[]>;
    static getServiceStats(serviceId: string): Promise<any>;
}
//# sourceMappingURL=service-management.d.ts.map