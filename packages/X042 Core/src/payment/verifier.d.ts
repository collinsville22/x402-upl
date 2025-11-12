import { PublicKey } from '@solana/web3.js';
import type { PaymentPayload, PaymentVerificationResult, X402Config } from '../types.js';
import { SignatureStore } from '../storage/signature-store.js';
export declare class PaymentVerifier {
    private connection;
    private config;
    private signatureStore;
    constructor(config: X402Config, signatureStore?: SignatureStore);
    verifyPayment(payload: PaymentPayload, requiredAmount: number, requiredRecipient: PublicKey): Promise<PaymentVerificationResult>;
    private validatePayloadStructure;
    private fetchTransaction;
    private validateTransaction;
    private generateReceipt;
    clearProcessedSignatures(): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=verifier.d.ts.map