import { Keypair, PublicKey } from '@solana/web3.js';
export declare const CASH_MINT: PublicKey;
export declare const CASH_DECIMALS = 6;
export interface CashAccount {
    address: string;
    balance: number;
}
export interface TransferResult {
    signature: string;
    amount: number;
    recipient: string;
}
export declare class PhantomCashClient {
    private connection;
    private wallet;
    private network;
    constructor(wallet: Keypair, network?: 'devnet' | 'mainnet-beta');
    getWalletAddress(): Promise<string>;
    getSolBalance(): Promise<number>;
    getCashBalance(): Promise<number>;
    sendCash(recipientAddress: string, amount: number, memo?: string): Promise<TransferResult>;
    verifyTransaction(signature: string): Promise<boolean>;
    getTransactionDetails(signature: string): Promise<import("@solana/web3.js").VersionedTransactionResponse | null>;
    requestAirdrop(lamports?: number): Promise<string>;
}
//# sourceMappingURL=cash-client.d.ts.map