import { PaymentProof, PaymentRequirement } from './types.js';
import { SignatureStore } from '@x402-upl/core';
export declare class PaymentVerifier {
    private connection;
    private paymentRecipient;
    private signatureStore;
    constructor(solanaRpcUrl: string, paymentRecipient: string, redisUrl?: string, signatureStore?: SignatureStore);
    verifyPayment(proof: PaymentProof, requirement: PaymentRequirement): Promise<boolean>;
    private validateTransaction;
    getTokenBalance(wallet: string, mint?: string): Promise<number>;
    isPaymentVerified(signature: string): boolean;
    clearVerifiedPayment(signature: string): void;
    getVerifiedPaymentCount(): number;
}
//# sourceMappingURL=payment-verifier.d.ts.map