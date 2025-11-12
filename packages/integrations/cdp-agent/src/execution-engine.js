export class ExecutionEngine {
    cdpClient;
    registry;
    constructor(cdpClient, registry) {
        this.cdpClient = cdpClient;
        this.registry = registry;
    }
    async execute(plan, context) {
        const startTime = Date.now();
        const results = [];
        let totalCost = 0;
        try {
            const sortedSteps = this.topologicalSort(plan.steps);
            for (const step of sortedSteps) {
                const stepResult = await this.executeStep(step, context);
                results.push(stepResult);
                if (!stepResult.toolResult.success) {
                    throw new Error(`Step ${step.stepNumber} failed: ${stepResult.toolResult.error}`);
                }
                totalCost += stepResult.cost;
                if (totalCost > context.maxBudgetLamports) {
                    throw new Error('Budget exceeded during execution');
                }
            }
            const totalTime = Date.now() - startTime;
            return {
                success: true,
                steps: results,
                totalCost,
                totalTime,
            };
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            return {
                success: false,
                steps: results,
                totalCost,
                totalTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async executeStep(step, context) {
        const tool = this.registry.getTool(step.toolId);
        if (!tool) {
            return {
                stepNumber: step.stepNumber,
                toolId: step.toolId,
                toolResult: {
                    success: false,
                    error: `Tool ${step.toolId} not found`,
                    executionTime: 0,
                },
                payment: null,
                cost: 0,
            };
        }
        let payment = null;
        if (tool.costLamports > 0) {
            try {
                payment = await this.cdpClient.sendTransaction(context.agentAddress, tool.paymentAddress, tool.costLamports);
            }
            catch (error) {
                return {
                    stepNumber: step.stepNumber,
                    toolId: step.toolId,
                    toolResult: {
                        success: false,
                        error: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        executionTime: 0,
                    },
                    payment: null,
                    cost: 0,
                };
            }
        }
        const toolResult = await this.registry.executeTool(step.toolId, step.parameters);
        return {
            stepNumber: step.stepNumber,
            toolId: step.toolId,
            toolResult,
            payment,
            cost: tool.costLamports,
        };
    }
    topologicalSort(steps) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (step) => {
            if (visited.has(step.stepNumber)) {
                return;
            }
            if (visiting.has(step.stepNumber)) {
                throw new Error('Circular dependency detected in tool chain');
            }
            visiting.add(step.stepNumber);
            for (const depNum of step.dependsOn) {
                const depStep = steps.find(s => s.stepNumber === depNum);
                if (depStep) {
                    visit(depStep);
                }
            }
            visiting.delete(step.stepNumber);
            visited.add(step.stepNumber);
            sorted.push(step);
        };
        for (const step of steps) {
            visit(step);
        }
        return sorted;
    }
}
//# sourceMappingURL=execution-engine.js.map