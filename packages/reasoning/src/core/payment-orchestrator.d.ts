import { ExecutionStep } from '../types/workflow.js';
import { EscrowWalletManager } from './escrow-wallet.js';
export interface PaymentConfig {
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    rpcUrl: string;
    escrowManager: EscrowWalletManager;
    userId: string;
}
export interface PaymentRequirement {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    amount: string;
    timeout: number;
    nonce: string;
}
export interface PaymentResult {
    success: boolean;
    signature?: string;
    cost: number;
    error?: string;
}
export declare class PaymentOrchestrator {
    private connection;
    private escrowManager;
    private userId;
    private network;
    constructor(config: PaymentConfig);
    executeServiceCall(serviceUrl: string, params: Record<string, unknown>, step: ExecutionStep): Promise<{
        output: unknown;
        payment: PaymentResult;
    }>;
    private handlePayment;
    getBalance(): Promise<number>;
    estimateCost(steps: ExecutionStep[]): Promise<number>;
}
//# sourceMappingURL=payment-orchestrator.d.ts.map