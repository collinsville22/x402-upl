import { Intent, ExecutionPlan } from '../types/workflow.js';
export interface AIPlannerConfig {
    apiKey: string;
    model?: string;
    cacheEnabled?: boolean;
    redisUrl?: string;
}
export interface PlanningResult {
    intent: Intent;
    plan: ExecutionPlan;
    confidence: number;
    reasoning: string;
}
export declare class AITaskPlanner {
    private client;
    private redis?;
    private model;
    constructor(config: AIPlannerConfig);
    planWorkflow(naturalLanguageInput: string, userId: string): Promise<PlanningResult>;
    private extractIntent;
    private generateExecutionPlan;
    private buildDAG;
    private findCriticalPath;
    private findLongestPath;
    private identifyParallelGroups;
    private topologicalSort;
    private calculateTotalTime;
    private hashInput;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=ai-planner.d.ts.map