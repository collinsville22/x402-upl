import { MultiSigTxStatus } from '@prisma/client';
export interface CreateMultiSigWalletInput {
    signers: string[];
    threshold: number;
    agentIds: string[];
}
export interface CreateTransactionInput {
    walletId: string;
    initiatorId: string;
    recipient: string;
    amount: number;
    memo?: string;
}
export interface SignTransactionInput {
    transactionId: string;
    signerId: string;
    signature: string;
    publicKey: string;
}
export declare class MultiSigWalletService {
    private connection;
    constructor(rpcUrl: string);
    createWallet(input: CreateMultiSigWalletInput): Promise<string>;
    createTransaction(input: CreateTransactionInput): Promise<string>;
    signTransaction(input: SignTransactionInput): Promise<{
        status: MultiSigTxStatus;
        signaturesCount: number;
    }>;
    private verifySignature;
    private executeTransaction;
    cancelTransaction(transactionId: string, cancelerId: string): Promise<void>;
    getWalletBalance(walletId: string): Promise<number>;
    getPendingTransactions(walletId: string): Promise<any>;
    getTransactionDetails(transactionId: string): Promise<any>;
    private getAgentWalletAddress;
    addSigner(walletId: string, newSigner: string, agentId: string, requesterId: string): Promise<void>;
    removeSigner(walletId: string, signerToRemove: string, requesterId: string): Promise<void>;
    updateThreshold(walletId: string, newThreshold: number, requesterId: string): Promise<void>;
}
//# sourceMappingURL=multisig.d.ts.map