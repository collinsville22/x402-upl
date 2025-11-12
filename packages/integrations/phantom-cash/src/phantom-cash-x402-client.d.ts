import { Keypair, PublicKey } from '@solana/web3.js';
export declare const CASH_MINT: PublicKey;
export declare const CASH_DECIMALS = 6;
export interface PhantomCashX402Config {
    wallet: Keypair;
    network: 'mainnet-beta' | 'devnet';
    rpcUrl?: string;
    facilitatorUrl?: string;
    spendingLimitPerHour?: number;
    timeout?: number;
}
export interface PaymentRequirements {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    amount: string;
    timeout?: number;
    resource?: string;
    description?: string;
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
export declare class PhantomCashX402Error extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
export declare class PhantomCashX402Client {
    private connection;
    private wallet;
    private config;
    private httpClient;
    private metrics;
    private paymentHistory;
    private hourlySpending;
    constructor(config: PhantomCashX402Config);
    get<T = any>(url: string, params?: Record<string, any>): Promise<T>;
    post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<T>;
    private request;
    private parsePaymentRequirements;
    private createPayment;
    private sendSolPayment;
    private sendCashPayment;
    private sendTokenPayment;
    private trackPayment;
    private cleanupOldHourlyData;
    private generateNonce;
    getWalletAddress(): Promise<string>;
    getSolBalance(): Promise<number>;
    getCashBalance(): Promise<number>;
    getMetrics(): PaymentMetrics;
    getPaymentHistory(limit?: number): PaymentRecord[];
    getSpentThisHour(): number;
    getRemainingHourlyBudget(): number;
    verifyTransaction(signature: string): Promise<boolean>;
}
//# sourceMappingURL=phantom-cash-x402-client.d.ts.map