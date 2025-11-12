import { ToolRegistry } from './tool-registry.js';
export interface AgentTask {
    taskId: string;
    description: string;
    maxBudgetLamports: number;
}
export interface ToolChainPlan {
    steps: ToolChainStep[];
    estimatedCost: number;
    reasoning: string;
}
export interface ToolChainStep {
    stepNumber: number;
    toolId: string;
    parameters: Record<string, any>;
    costLamports: number;
    dependsOn: number[];
}
export declare class AgentBrain {
    private openai;
    private registry;
    private model;
    constructor(openaiApiKey: string, registry: ToolRegistry, model?: string);
    planToolChain(task: AgentTask): Promise<ToolChainPlan>;
    optimizePlan(plan: ToolChainPlan): Promise<ToolChainPlan>;
    reasonAboutResults(task: AgentTask, plan: ToolChainPlan, results: Array<{
        step: number;
        result: any;
    }>): Promise<string>;
}
//# sourceMappingURL=agent-brain.d.ts.map