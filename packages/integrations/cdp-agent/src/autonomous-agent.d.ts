import { X402CDPSolanaClient } from './x402-cdp-solana-client.js';
export interface AgentTask {
    taskId: string;
    description: string;
    maxBudgetUSD: number;
}
export interface ExecutionPlan {
    steps: PlanStep[];
    estimatedCostUSD: number;
    reasoning: string;
}
export interface PlanStep {
    stepNumber: number;
    serviceUrl: string;
    method: 'GET' | 'POST';
    parameters?: Record<string, any>;
    estimatedCostUSD: number;
    dependsOn: number[];
}
export interface ExecutionResult {
    success: boolean;
    steps: StepResult[];
    totalCostUSD: number;
    totalTimeMs: number;
    error?: string;
}
export interface StepResult {
    stepNumber: number;
    serviceUrl: string;
    success: boolean;
    data?: any;
    costUSD: number;
    executionTimeMs: number;
    paymentSignature?: string;
    error?: string;
}
export declare class AutonomousAgent {
    private client;
    private discovery;
    private openai;
    private model;
    constructor(client: X402CDPSolanaClient, openaiApiKey: string, model?: string);
    planExecution(task: AgentTask): Promise<ExecutionPlan>;
    executeTask(task: AgentTask): Promise<ExecutionResult>;
    analyzeResults(task: AgentTask, result: ExecutionResult): Promise<string>;
    private topologicalSort;
    private convertToUSD;
}
//# sourceMappingURL=autonomous-agent.d.ts.map