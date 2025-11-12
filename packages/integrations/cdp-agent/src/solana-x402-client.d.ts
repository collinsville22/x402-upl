import { Connection, Keypair } from '@solana/web3.js';
export interface SolanaX402Config {
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    rpcUrl?: string;
    wallet: Keypair;
    facilitatorUrl?: string;
}
export interface PaymentRequirements {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    amount: string;
    memo?: string;
    timeout: number;
    nonce?: string;
}
export declare class SolanaX402Client {
    private connection;
    private config;
    private httpClient;
    constructor(config: SolanaX402Config);
    get<T = any>(url: string, params?: Record<string, any>): Promise<T>;
    post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<T>;
    private request;
    private createPayment;
    private generateNonce;
    getConnection(): Connection;
    getWallet(): Keypair;
}
//# sourceMappingURL=solana-x402-client.d.ts.map