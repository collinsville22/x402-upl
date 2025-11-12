import EventEmitter from 'events';
import { ExecutionPlan, StepResult, WorkflowStatus } from '../types/workflow.js';
import { PaymentOrchestrator } from './payment-orchestrator.js';
import { ServiceDiscoveryEngine } from './service-discovery.js';
export interface ExecutionConfig {
    maxConcurrentSteps: number;
    enableRetry: boolean;
    enableRollback: boolean;
    timeout: number;
}
export interface ExecutionContext {
    workflowId: string;
    stepOutputs: Map<string, unknown>;
    stepResults: Map<string, StepResult>;
    totalCost: number;
    totalTime: number;
    startTime: number;
}
export interface ExecutionResult {
    success: boolean;
    status: WorkflowStatus;
    stepResults: Map<string, StepResult>;
    output: unknown;
    totalCost: number;
    totalTime: number;
    error?: string;
}
export declare class ExecutionEngine extends EventEmitter {
    private paymentOrchestrator;
    private serviceDiscovery;
    private redis;
    private config;
    constructor(paymentOrchestrator: PaymentOrchestrator, serviceDiscovery: ServiceDiscoveryEngine, redisUrl: string, config: ExecutionConfig);
    execute(workflowId: string, plan: ExecutionPlan): Promise<ExecutionResult>;
    private executeSingleStep;
    private executeParallel;
    private executeStepWithRetry;
    private executeStep;
    private resolveParams;
    private calculateBackoff;
    private sleep;
    private topologicalSort;
    private extractFinalOutput;
    private rollback;
    private saveExecutionState;
    private emitEvent;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=execution-engine.d.ts.map