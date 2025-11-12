interface PaymentReceipt {
    signature: string;
    amount: number;
    token: string;
    sender: string;
    timestamp: string;
}
interface SettlementConfig {
    facilitatorUrl: string;
    serviceId: string;
    merchantWallet: string;
    webhookUrl?: string;
    webhookSecret: string;
    minimumAmount: number;
    settlementSchedule: string;
}
interface SettlementResponse {
    settlementId: string;
    amount: number;
    transactionSignature: string;
    status: string;
    timestamp: string;
}
export declare class SettlementIntegration {
    private config;
    private pendingTransactions;
    private lastSettlementAt;
    constructor(config: SettlementConfig);
    handlePaymentVerified(receipt: PaymentReceipt): Promise<void>;
    private recordTransaction;
    requestSettlement(): Promise<SettlementResponse>;
    handleSettlementWebhook(payload: any, signature: string): Promise<boolean>;
    private verifyWebhookSignature;
    private calculatePendingAmount;
    private shouldSettleDaily;
    private startDailySettlementCheck;
    getPendingAmount(): Promise<number>;
    getSettlementHistory(limit?: number): Promise<any[]>;
    getPendingTransactionCount(): number;
    getLastSettlementTime(): Date | null;
}
export {};
//# sourceMappingURL=settlement-integration.d.ts.map