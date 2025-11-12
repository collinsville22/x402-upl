export interface X402CDPSolanaConfig {
    network: 'solana-mainnet' | 'solana-devnet' | 'solana-testnet';
    facilitatorUrl?: string;
    registryUrl?: string;
    rpcUrl?: string;
}
export interface PaymentRequirements {
    scheme: 'exact' | 'estimate';
    network: string;
    asset: string;
    payTo: string;
    amount: string;
    memo?: string;
    timeout: number;
    nonce?: string;
}
export interface ServiceDiscoveryFilters {
    category?: string;
    maxPrice?: number;
    minReputation?: number;
    limit?: number;
}
export interface X402Service {
    id: string;
    name: string;
    description: string;
    resource: string;
    method?: string;
    pricing?: {
        amount: string;
        asset: string;
        network: string;
    };
}
export declare class X402CDPSolanaClient {
    private cdp;
    private httpClient;
    private connection;
    private network;
    private accountAddress?;
    private config;
    private paymentHistory;
    constructor(config: X402CDPSolanaConfig);
    private getDefaultRpcUrl;
    createAccount(name?: string): Promise<string>;
    getAccountAddress(): string | undefined;
    setAccountAddress(address: string): void;
    requestFaucet(token?: 'sol' | 'usdc'): Promise<string>;
    getBalance(): Promise<number>;
    private setupPaymentInterceptor;
    private createPayment;
    get<T = any>(url: string, params?: Record<string, any>): Promise<T>;
    post<T = any>(url: string, data?: any): Promise<T>;
    put<T = any>(url: string, data?: any): Promise<T>;
    delete<T = any>(url: string): Promise<T>;
    discoverServices(filters?: ServiceDiscoveryFilters): Promise<X402Service[]>;
    getPaymentHistory(): Array<{
        timestamp: number;
        service: string;
        amount: string;
        asset: string;
        signature: string;
        status: string;
    }>;
    getTotalSpent(): {
        [asset: string]: number;
    };
    getNetwork(): string;
    private generateNonce;
    close(): Promise<void>;
}
//# sourceMappingURL=x402-cdp-solana-client.d.ts.map