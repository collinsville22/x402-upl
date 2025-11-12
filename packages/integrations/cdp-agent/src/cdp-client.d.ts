export interface SolanaAccount {
    accountId: string;
    address: string;
    created: Date;
}
export interface TransactionResult {
    signature: string;
    confirmed: boolean;
}
export declare class CDPSolanaClient {
    private cdp;
    private connection;
    private network;
    constructor(network?: 'devnet' | 'mainnet-beta');
    createAccount(): Promise<SolanaAccount>;
    requestFaucet(address: string): Promise<void>;
    getBalance(address: string): Promise<number>;
    waitForBalance(address: string, maxAttempts?: number): Promise<number>;
    sendTransaction(fromAddress: string, toAddress: string, lamports: number): Promise<TransactionResult>;
    verifyTransaction(signature: string): Promise<boolean>;
    getTransactionDetails(signature: string): Promise<import("@solana/web3.js").VersionedTransactionResponse | null>;
    close(): Promise<void>;
}
//# sourceMappingURL=cdp-client.d.ts.map