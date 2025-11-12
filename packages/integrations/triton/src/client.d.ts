import { VersionedTransactionResponse } from '@solana/web3.js';
export interface TritonConfig {
    apiKey: string;
    rpcUrl?: string;
}
export interface BlockQuery {
    slot: number;
    maxSupportedTransactionVersion?: number;
}
export interface TransactionQuery {
    signature: string;
    maxSupportedTransactionVersion?: number;
}
export interface AccountHistoryQuery {
    address: string;
    before?: string;
    limit?: number;
}
export declare class TritonClient {
    private connection;
    private apiKey;
    constructor(config: TritonConfig);
    getBlock(query: BlockQuery): Promise<import("@solana/web3.js").BlockResponse | null>;
    getTransaction(query: TransactionQuery): Promise<VersionedTransactionResponse | null>;
    getAccountHistory(query: AccountHistoryQuery): Promise<{
        address: string;
        transactions: VersionedTransactionResponse[];
        signatures: import("@solana/web3.js").ConfirmedSignatureInfo[];
    }>;
    getTokenTransfers(params: {
        mint: string;
        fromSlot?: number;
        toSlot?: number;
        limit?: number;
    }): Promise<{
        mint: string;
        transfers: {
            signature: string;
            slot: number;
            blockTime: number | null | undefined;
            transaction: VersionedTransactionResponse;
        }[];
    }>;
    getTokenHolders(mint: string, minBalance?: number, limit?: number): Promise<{
        mint: string;
        holders: {
            address: string;
            amount: string;
            decimals: number;
            uiAmount: number | null;
            uiAmountString: string | undefined;
        }[];
        totalHolders: number;
    }>;
    getProgramAccounts(programId: string): Promise<{
        programId: string;
        accounts: {
            pubkey: string;
            account: {
                lamports: number;
                owner: string;
                data: string;
                executable: boolean;
                rentEpoch: number | undefined;
            };
        }[];
    }>;
    getBlockTime(slot: number): Promise<number | null>;
    getRecentTransactions(address: string, limit?: number): Promise<{
        address: string;
        transactions: VersionedTransactionResponse[];
        count: number;
    }>;
    searchTransactions(filters: {
        accounts?: string[];
        fromSlot?: number;
        toSlot?: number;
        limit?: number;
    }): Promise<{
        transactions: VersionedTransactionResponse[];
        count: number;
    }>;
    getSlot(): Promise<number>;
    getBlockHeight(): Promise<number>;
    getAccountInfo(address: string): Promise<{
        address: string;
        lamports: number;
        owner: string;
        executable: boolean;
        rentEpoch: number | undefined;
        data: string;
    } | null>;
}
//# sourceMappingURL=client.d.ts.map