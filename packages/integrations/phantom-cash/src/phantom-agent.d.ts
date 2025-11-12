import { Keypair } from '@solana/web3.js';
import { X402Service } from './service-registry.js';
import { AgentTask, ServiceChainPlan } from './agent-brain.js';
import { ExecutionResult } from './execution-engine.js';
export interface PhantomAgentConfig {
    wallet: Keypair;
    openaiApiKey: string;
    network?: 'devnet' | 'mainnet-beta';
    rpcUrl?: string;
    spendingLimitPerHour?: number;
    llmModel?: string;
    registryUrl?: string;
}
export interface AgentExecutionReport {
    task: AgentTask;
    plan: ServiceChainPlan;
    execution: ExecutionResult;
    analysis: string;
    timestamp: number;
    walletAddress: string;
    initialCashBalance: number;
    finalCashBalance: number;
    initialSolBalance: number;
    finalSolBalance: number;
}
export declare class PhantomAgent {
    private cashClient;
    private x402Handler;
    private registry;
    private brain;
    private engine;
    constructor(config: PhantomAgentConfig);
    getWalletAddress(): Promise<string>;
    getSolBalance(): Promise<number>;
    getCashBalance(): Promise<number>;
    getMetrics(): import("./phantom-cash-x402-client.js").PaymentMetrics;
    getSpentThisHour(): number;
    getRemainingHourlyBudget(): number;
    registerService(service: X402Service): void;
    listServices(): Promise<X402Service[]>;
    searchServices(query: string): Promise<X402Service[]>;
    findServicesByCategory(category: string): Promise<X402Service[]>;
    executeTask(task: AgentTask): Promise<AgentExecutionReport>;
    getPaymentHistory(): import("./x402-handler.js").X402PaymentProof[];
    getTotalSpent(): number;
    verifyTransaction(signature: string): Promise<boolean>;
}
//# sourceMappingURL=phantom-agent.d.ts.map