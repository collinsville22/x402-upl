import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import Redis from 'ioredis';
export interface EscrowConfig {
    connection: Connection;
    escrowKeypair: Keypair;
    redis: Redis;
}
export interface UserEscrow {
    userId: string;
    userWallet: string;
    balance: number;
    spent: number;
    createdAt: number;
    lastTopUpAt: number;
}
export declare class EscrowWalletManager {
    private connection;
    private escrowKeypair;
    private redis;
    constructor(config: EscrowConfig);
    createUserEscrow(userId: string, userWallet: string): Promise<UserEscrow>;
    depositFunds(userId: string, amount: number, signature: string): Promise<UserEscrow>;
    getBalance(userId: string): Promise<number>;
    deductFunds(userId: string, amount: number): Promise<boolean>;
    executePayment(userId: string, recipient: PublicKey, amount: number, mint?: PublicKey): Promise<string>;
    private sendSOLPayment;
    private sendTokenPayment;
    private refundFunds;
    withdrawFunds(userId: string, amount: number, destination: PublicKey): Promise<string>;
    getUserHistory(userId: string, limit?: number): Promise<any[]>;
    getEscrowPublicKey(): PublicKey;
}
//# sourceMappingURL=escrow-wallet.d.ts.map