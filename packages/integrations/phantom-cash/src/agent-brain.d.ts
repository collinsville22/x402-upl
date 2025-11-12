import { ServiceRegistry } from './service-registry.js';
export interface AgentTask {
    taskId: string;
    description: string;
    maxBudget: number;
}
export interface ServiceChainPlan {
    steps: ServiceChainStep[];
    estimatedCost: number;
    reasoning: string;
}
export interface ServiceChainStep {
    stepNumber: number;
    serviceId: string;
    parameters: Record<string, any>;
    costCash: number;
    dependsOn: number[];
}
export declare class AgentBrain {
    private openai;
    private registry;
    private model;
    constructor(openaiApiKey: string, registry: ServiceRegistry, model?: string);
    planServiceChain(task: AgentTask): Promise<ServiceChainPlan>;
    optimizePlan(plan: ServiceChainPlan): Promise<ServiceChainPlan>;
    analyzeResults(task: AgentTask, plan: ServiceChainPlan, results: Array<{
        step: number;
        result: any;
        cost: number;
    }>): Promise<string>;
}
//# sourceMappingURL=agent-brain.d.ts.map