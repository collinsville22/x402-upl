export class ExecutionEngine {
    x402Handler;
    registry;
    constructor(x402Handler, registry) {
        this.x402Handler = x402Handler;
        this.registry = registry;
    }
    async execute(plan, context) {
        const startTime = Date.now();
        const results = [];
        let totalCost = 0;
        try {
            const sortedSteps = this.topologicalSort(plan.steps);
            for (const step of sortedSteps) {
                const stepResult = await this.executeStep(step);
                results.push(stepResult);
                if (!stepResult.success) {
                    throw new Error(`Step ${step.stepNumber} failed: ${stepResult.error}`);
                }
                totalCost += stepResult.cost;
                if (totalCost > context.maxBudget) {
                    throw new Error(`Budget exceeded: ${totalCost} CASH > ${context.maxBudget} CASH`);
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
    async executeStep(step) {
        const service = await this.registry.getService(step.serviceId);
        if (!service) {
            return {
                stepNumber: step.stepNumber,
                serviceId: step.serviceId,
                success: false,
                cost: 0,
                executionTime: 0,
                error: `Service ${step.serviceId} not found`,
            };
        }
        const startTime = Date.now();
        try {
            const call = {
                url: service.endpoint,
                method: service.method,
                body: service.method === 'POST' ? step.parameters : undefined,
                params: service.method === 'GET' ? step.parameters : undefined,
            };
            const response = await this.x402Handler.callService(call);
            const executionTime = Date.now() - startTime;
            if (!response.success) {
                return {
                    stepNumber: step.stepNumber,
                    serviceId: step.serviceId,
                    success: false,
                    cost: 0,
                    executionTime,
                    error: response.error || 'Service call failed',
                };
            }
            return {
                stepNumber: step.stepNumber,
                serviceId: step.serviceId,
                success: true,
                data: response.data,
                cost: service.costCash,
                executionTime,
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            return {
                stepNumber: step.stepNumber,
                serviceId: step.serviceId,
                success: false,
                cost: 0,
                executionTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
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
                throw new Error('Circular dependency detected in service chain');
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