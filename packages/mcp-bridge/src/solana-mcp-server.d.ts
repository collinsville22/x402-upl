interface MCPConfig {
    privateKey: Uint8Array;
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    facilitatorUrl: string;
    registryUrl: string;
    serviceRefreshInterval: number;
}
export declare class SolanaMCPServer {
    private server;
    private httpClient;
    private wallet;
    private connection;
    private services;
    private config;
    private paymentHistory;
    private logger;
    private metrics;
    constructor(config: MCPConfig);
    private setupHandlers;
    private makePaymentRequest;
    private createPayment;
    private refreshServices;
    private recordLatency;
    private startServiceRefresh;
    private sanitizeToolName;
    private generateNonce;
    run(): Promise<void>;
}
export {};
//# sourceMappingURL=solana-mcp-server.d.ts.map