interface ServerConfig {
    port: number;
    host: string;
    rpcUrl: string;
    queueKey: string;
    paymentRecipient: string;
    tapRegistryUrl: string;
    x402RegistryUrl: string;
    network: 'mainnet-beta' | 'devnet';
}
export declare class SwitchboardMarketplaceServer {
    private server;
    private marketplace;
    private tapVerifier;
    private config;
    private metrics;
    constructor(config: ServerConfig);
    private setupMiddleware;
    private setupRoutes;
    private handleFeedUpdate;
    private handleWebSocketFeed;
    private verifyTAPSignature;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export { SwitchboardMarketplaceServer };
//# sourceMappingURL=server.d.ts.map