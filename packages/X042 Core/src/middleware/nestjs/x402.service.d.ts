import { PublicKey } from '@solana/web3.js';
import { X402ModuleOptions } from './x402.types.js';
import type { X402Config, PaymentPayload } from '../../types.js';
export declare class X402Service {
    private options;
    private verifier;
    private config;
    constructor(options: X402ModuleOptions);
    verifyPayment(payload: PaymentPayload, expectedAmount: number, recipient: PublicKey): Promise<{
        valid: boolean;
        reason?: string;
        transactionId?: string;
    }>;
    getConfig(): X402Config;
    getTreasuryWallet(): PublicKey;
}
//# sourceMappingURL=x402.service.d.ts.map