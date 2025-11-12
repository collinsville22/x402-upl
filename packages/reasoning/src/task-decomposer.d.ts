export interface Task {
    id: string;
    description: string;
    requiredCapabilities: string[];
    priority: number;
    dependencies: string[];
    estimatedCost?: number;
    estimatedTime?: number;
}
export interface ExecutionStep {
    id: string;
    action: string;
    serviceId?: string;
    serviceName?: string;
    params: Record<string, unknown>;
    estimatedCost: number;
    estimatedTime: number;
    dependencies: string[];
    parallelizable: boolean;
    inputMapping?: Record<string, string>;
    outputKey?: string;
}
export interface ExecutionPlan {
    steps: ExecutionStep[];
    totalEstimatedCost: number;
    totalEstimatedTime: number;
    executionGraph: string;
    criticalPath: string[];
}
export declare class TaskDecomposer {
    decompose(taskDescription: string): Promise<ExecutionPlan>;
    private analyzeTask;
    private extractKeywords;
    private tasksToSteps;
    private canParallelize;
    private optimizeExecution;
    private calculateTotalTime;
    private buildExecutionGraph;
    private findCriticalPath;
    private findLongestPath;
}
//# sourceMappingURL=task-decomposer.d.ts.map