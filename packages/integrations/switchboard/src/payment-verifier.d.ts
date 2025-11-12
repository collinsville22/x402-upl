import { PaymentProof, PaymentRequirement } from './types.js';
import { SignatureStore } from '@x402-upl/core';
export declare class PaymentVerifier {
    private connection;
    private paymentRecipient;
    private signatureStore;
    constructor(solanaRpcUrl: string, paymentRecipient: string, redisUrl?: string, signatureStore?: SignatureStore);
    verifyPayment(proof: PaymentProof, requirement: PaymentRequirement): Promise<boolean>;
    isPaymentVerified(signature: string): Promise<boolean>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=payment-verifier.d.ts.map