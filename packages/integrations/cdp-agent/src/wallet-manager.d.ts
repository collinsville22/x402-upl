export interface WalletPolicy {
    maxTransactionAmount: number;
    maxDailySpend: number;
    maxHourlySpend: number;
    allowedContracts?: string[];
    allowedTokens?: string[];
    requireUserApproval?: (amount: number) => boolean;
}
export interface AgentWallet {
    id: string;
    address: string;
    network: 'solana-mainnet' | 'solana-devnet';
    policies: WalletPolicy;
    created: Date;
}
export declare class CDPWalletManager {
    private coinbase;
    private wallets;
    private spendingTracker;
    constructor(apiKeyName: string, privateKey: string);
    createWallet(network: 'solana-mainnet' | 'solana-devnet', policies: WalletPolicy): Promise<AgentWallet>;
    getWallet(walletId: string): Promise<AgentWallet | null>;
    checkSpendingLimit(walletId: string, amount: number, policies: WalletPolicy): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    executeTransfer(walletId: string, to: string, amount: number, token: string, policies: WalletPolicy): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    getBalance(walletId: string, token?: string): Promise<number>;
    pauseWallet(walletId: string): Promise<void>;
    resumeWallet(walletId: string): Promise<void>;
    sweepToUser(walletId: string, userAddress: string): Promise<void>;
    getTransactionHistory(walletId: string, limit?: number): Promise<any[]>;
}
//# sourceMappingURL=wallet-manager.d.ts.map