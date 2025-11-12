import { PublicKey, Keypair } from '@solana/web3.js';
import type { X402Config, PaymentReceipt } from '../types.js';
export declare class SettlementCoordinator {
    private connection;
    private config;
    private facilitatorKeypair?;
    constructor(config: X402Config);
    executeSettlement(fromPubkey: PublicKey, toPubkey: PublicKey, amount: number, tokenMint: PublicKey, fromKeypair: Keypair): Promise<PaymentReceipt>;
    executeFacilitatedSettlement(fromPubkey: PublicKey, toPubkey: PublicKey, amount: number, tokenMint: PublicKey): Promise<PaymentReceipt>;
    getTransactionStatus(signature: string): Promise<'confirmed' | 'failed' | 'pending'>;
    waitForConfirmation(signature: string, timeout?: number): Promise<boolean>;
}
//# sourceMappingURL=settlement.d.ts.map