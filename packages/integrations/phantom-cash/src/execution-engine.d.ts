import { X402Handler } from './x402-handler.js';
import { ServiceRegistry } from './service-registry.js';
import { ServiceChainPlan } from './agent-brain.js';
export interface ExecutionContext {
    maxBudget: number;
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
    serviceId: string;
    success: boolean;
    data?: any;
    cost: number;
    executionTime: number;
    error?: string;
}
export declare class ExecutionEngine {
    private x402Handler;
    private registry;
    constructor(x402Handler: X402Handler, registry: ServiceRegistry);
    execute(plan: ServiceChainPlan, context: ExecutionContext): Promise<ExecutionResult>;
    private executeStep;
    private topologicalSort;
}
//# sourceMappingURL=execution-engine.d.ts.map