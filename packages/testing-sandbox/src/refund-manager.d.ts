import { Connection, Keypair } from '@solana/web3.js';
import type { Logger } from 'pino';
export interface RefundRecord {
    transactionSignature: string;
    payerAddress: string;
    amount: number;
    asset: string;
    refundSignature?: string;
    refundedAt?: number;
    status: 'pending' | 'refunded' | 'failed';
    endpoint: string;
    requestTimestamp: number;
}
export interface RefundStats {
    totalRefunds: number;
    totalAmount: number;
    successfulRefunds: number;
    failedRefunds: number;
    averageRefundTimeMs: number;
}
export declare class RefundManager {
    private connection;
    private refundWallet;
    private redis;
    private logger;
    constructor(connection: Connection, refundWallet: Keypair, redis: Redis, logger: Logger);
    recordPayment(signature: string, payerAddress: string, amount: number, asset: string, endpoint: string): Promise<void>;
    processRefund(signature: string): Promise<boolean>;
    private refundSOL;
    private refundToken;
    getRefundStatus(signature: string): Promise<RefundRecord | null>;
    getStats(): Promise<RefundStats>;
    startRefundProcessor(): Promise<void>;
    getWalletBalance(): Promise<{
        sol: number;
        usdc: number;
    }>;
}
//# sourceMappingURL=refund-manager.d.ts.map