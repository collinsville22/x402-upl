import { ProxyConfig } from '../types.js';
export declare class OldFaithfulProxy {
    private server;
    private config;
    private pricing;
    private paymentVerifier;
    private tapVerifier;
    private registryClient;
    private redis?;
    private metrics;
    constructor(config: ProxyConfig);
    private setupMiddleware;
    private setupRoutes;
    private handleRPCRequest;
    private createPaymentRequirement;
    private startSlotUpdater;
    registerServices(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export { OldFaithfulProxy };
//# sourceMappingURL=server.d.ts.map