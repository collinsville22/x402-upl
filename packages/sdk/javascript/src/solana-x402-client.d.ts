import { Connection, Keypair, PublicKey } from '@solana/web3.js';
export declare const CASH_MINT: PublicKey;
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
export interface PaymentPayload {
    network: string;
    asset: string;
    from: string;
    to: string;
    amount: string;
    signature: string;
    timestamp: number;
    nonce: string;
    memo?: string;
}
export interface PaymentMetrics {
    totalSpent: number;
    totalEarned: number;
    netProfit: number;
    transactionCount: number;
    averageCostPerInference: number;
}
export interface PaymentRecord {
    signature: string;
    timestamp: number;
    amount: number;
    asset: string;
    type: 'sent' | 'received';
    from: string;
    to: string;
}
export declare class SolanaX402Client {
    private connection;
    private config;
    private httpClient;
    private metrics;
    private paymentHistory;
    private hourlySpending;
    private spendingLimitPerHour;
    constructor(config: SolanaX402Config & {
        spendingLimitPerHour?: number;
    });
    get<T = any>(url: string, params?: Record<string, any>): Promise<T>;
    post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<T>;
    private request;
    private createPayment;
    private generateNonce;
    getConnection(): Connection;
    getWallet(): Keypair;
    getBalance(asset?: string): Promise<number>;
    getWalletAddress(): string;
    getMetrics(): PaymentMetrics;
    getPaymentHistory(limit?: number): PaymentRecord[];
    fetchPaymentHistory(limit?: number): Promise<PaymentRecord[]>;
    getSpentThisHour(): number;
    getRemainingHourlyBudget(): number;
    private trackPayment;
    private cleanupOldHourlyData;
    recordEarnings(amount: number, from: string): void;
}
//# sourceMappingURL=solana-x402-client.d.ts.map