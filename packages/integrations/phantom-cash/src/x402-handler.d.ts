import { PhantomCashX402Client } from './phantom-cash-x402-client.js';
export interface X402ServiceCall {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, any>;
}
export interface X402ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: string;
}
export interface X402PaymentProof {
    signature: string;
    amount: number;
    currency: string;
    timestamp: number;
}
export declare class X402Handler {
    private client;
    constructor(client: PhantomCashX402Client);
    callService<T = any>(call: X402ServiceCall): Promise<X402ServiceResponse<T>>;
    getPaymentHistory(): X402PaymentProof[];
    getTotalSpent(): number;
    getMetrics(): import("./phantom-cash-x402-client.js").PaymentMetrics;
    getWalletAddress(): Promise<string>;
    getCashBalance(): Promise<number>;
    getSolBalance(): Promise<number>;
    getSpentThisHour(): number;
    getRemainingHourlyBudget(): number;
}
//# sourceMappingURL=x402-handler.d.ts.map