import { Connection, PublicKey, Transaction } from '@solana/web3.js';
export interface WalletAdapter {
    publicKey: PublicKey;
    signTransaction(transaction: Transaction): Promise<Transaction>;
    signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
    signMessage(message: Uint8Array): Promise<Uint8Array>;
}
export interface PaymentApproval {
    maxTotalAmount: number;
    maxPerTransaction: number;
    allowedRecipients?: string[];
    expiresAt: number;
}
export declare class SessionWallet {
    private connection;
    private adapter;
    private approval;
    private spent;
    private pendingTransactions;
    constructor(connection: Connection, adapter: WalletAdapter, approval: PaymentApproval);
    createPaymentTransaction(recipient: PublicKey, amount: number, mint?: PublicKey): Promise<{
        transaction: Transaction;
        requiresApproval: boolean;
    }>;
    executePayment(recipient: PublicKey, amount: number, mint?: PublicKey): Promise<string>;
    batchPayments(payments: Array<{
        recipient: PublicKey;
        amount: number;
        mint?: PublicKey;
    }>): Promise<string[]>;
    getRemainingBudget(): number;
    getSpent(): number;
    isExpired(): boolean;
    getApproval(): PaymentApproval;
    getPublicKey(): PublicKey;
}
export interface BrowserWalletAdapter extends WalletAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    connected: boolean;
}
export declare function createPhantomAdapter(): BrowserWalletAdapter | null;
export declare function createSolflareAdapter(): BrowserWalletAdapter | null;
//# sourceMappingURL=wallet-adapter.d.ts.map