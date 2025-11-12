import type { ExecutionStep, ExecutionPlan } from './task-decomposer.js';
export interface ChainExecutionResult {
    success: boolean;
    totalCost: number;
    totalTime: number;
    stepResults: Map<string, StepResult>;
    output: unknown;
    errors: ExecutionError[];
}
export interface StepResult {
    stepId: string;
    success: boolean;
    output?: unknown;
    cost: number;
    time: number;
    error?: string;
}
export interface ExecutionError {
    stepId: string;
    error: string;
    timestamp: number;
}
export interface ServiceChainConfig {
    maxTotalCost: number;
    timeout: number;
    retryAttempts: number;
    failureStrategy: 'abort' | 'continue' | 'retry';
}
export declare class ServiceChainExecutor {
    private config;
    constructor(config: ServiceChainConfig);
    execute(plan: ExecutionPlan): Promise<ChainExecutionResult>;
    private canExecuteStep;
    private executeStep;
    private resolveParams;
    private callService;
    private extractFinalOutput;
    executeParallel(steps: ExecutionStep[]): Promise<Map<string, StepResult>>;
    validateChain(plan: ExecutionPlan): {
        valid: boolean;
        errors: string[];
    };
    private detectCycle;
}
//# sourceMappingURL=service-chain.d.ts.map