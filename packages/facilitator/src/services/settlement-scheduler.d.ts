interface ScheduleConfig {
    serviceId: string;
    merchantWallet: string;
    schedule: string;
    minimumAmount: number;
    enabled: boolean;
}
interface SettlementResult {
    settlementId: string;
    amount: number;
    signature: string;
    transactionCount: number;
    fee: number;
}
export declare class SettlementScheduler {
    private jobs;
    private connection;
    private treasuryKeypair;
    private tokenMint;
    private platformFeeRate;
    private logger;
    constructor(logger?: any);
    initialize(): Promise<void>;
    scheduleSettlement(config: ScheduleConfig): void;
    private processScheduledSettlement;
    executeSettlement(merchantWallet: string, serviceId: string, transactionIds: string[]): Promise<SettlementResult>;
    private transferTokens;
    private notifyMerchant;
    removeSchedule(serviceId: string, merchantWallet: string): void;
    stopAll(): void;
}
export declare const settlementScheduler: SettlementScheduler;
export {};
//# sourceMappingURL=settlement-scheduler.d.ts.map