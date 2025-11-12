interface ServiceConfig {
    port: number;
    paymentAddress: string;
    network: 'mainnet-beta' | 'devnet';
    rpcUrl?: string;
}
export declare class MockX402Service {
    private app;
    private config;
    private connection;
    private processedPayments;
    constructor(config: ServiceConfig);
    private setupMiddleware;
    private setupRoutes;
    private handlePriceRequest;
    private handleAnalysisRequest;
    private handleMarketDataRequest;
    private handleHealthCheck;
    private requirePayment;
    private verifyPayment;
    private generateNonce;
    start(): void;
}
export default MockX402Service;
//# sourceMappingURL=mock-x402-service.d.ts.map