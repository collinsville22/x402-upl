import { CDPSolanaClient, TransactionResult } from './cdp-client.js';
import { ToolRegistry, ToolResult } from './tool-registry.js';
import { ToolChainPlan } from './agent-brain.js';
export interface ExecutionContext {
    agentAddress: string;
    maxBudgetLamports: number;
}
export interface ExecutionResult {
    success: boolean;
    steps: StepResult[];
    totalCost: number;
    totalTime: number;
    error?: string;
}
export interface StepResult {
    stepNumber: number;
    toolId: string;
    toolResult: ToolResult;
    payment: TransactionResult | null;
    cost: number;
}
export declare class ExecutionEngine {
    private cdpClient;
    private registry;
    constructor(cdpClient: CDPSolanaClient, registry: ToolRegistry);
    execute(plan: ToolChainPlan, context: ExecutionContext): Promise<ExecutionResult>;
    private executeStep;
    private topologicalSort;
}
//# sourceMappingURL=execution-engine.d.ts.map