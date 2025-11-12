"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEngine = void 0;
const events_1 = __importDefault(require("events"));
const ioredis_1 = __importDefault(require("ioredis"));
class ExecutionEngine extends events_1.default {
    paymentOrchestrator;
    serviceDiscovery;
    redis;
    config;
    constructor(paymentOrchestrator, serviceDiscovery, redisUrl, config) {
        super();
        this.paymentOrchestrator = paymentOrchestrator;
        this.serviceDiscovery = serviceDiscovery;
        this.redis = new ioredis_1.default(redisUrl);
        this.config = config;
    }
    async execute(workflowId, plan) {
        const context = {
            workflowId,
            stepOutputs: new Map(),
            stepResults: new Map(),
            totalCost: 0,
            totalTime: 0,
            startTime: Date.now(),
        };
        this.emitEvent(workflowId, 'workflow.executing', { plan });
        try {
            await this.saveExecutionState(context, 'executing');
            const levels = this.topologicalSort(plan.steps);
            for (const level of levels) {
                const parallelSteps = level.filter((stepId) => {
                    const step = plan.steps.find((s) => s.id === stepId);
                    return step?.parallelizable;
                });
                if (parallelSteps.length > 1) {
                    await this.executeParallel(parallelSteps, plan, context);
                }
                else {
                    for (const stepId of level) {
                        await this.executeSingleStep(stepId, plan, context);
                    }
                }
            }
            const finalOutput = this.extractFinalOutput(plan.steps, context.stepOutputs);
            const totalTime = Date.now() - context.startTime;
            await this.saveExecutionState(context, 'completed');
            this.emitEvent(workflowId, 'workflow.completed', {
                output: finalOutput,
                totalCost: context.totalCost,
                totalTime,
            });
            return {
                success: true,
                status: 'completed',
                stepResults: context.stepResults,
                output: finalOutput,
                totalCost: context.totalCost,
                totalTime,
            };
        }
        catch (error) {
            const totalTime = Date.now() - context.startTime;
            await this.saveExecutionState(context, 'failed');
            this.emitEvent(workflowId, 'workflow.failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                totalCost: context.totalCost,
                totalTime,
            });
            if (this.config.enableRollback) {
                await this.rollback(context);
            }
            return {
                success: false,
                status: 'failed',
                stepResults: context.stepResults,
                output: null,
                totalCost: context.totalCost,
                totalTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async executeSingleStep(stepId, plan, context) {
        const step = plan.steps.find((s) => s.id === stepId);
        if (!step) {
            throw new Error(`Step ${stepId} not found in plan`);
        }
        this.emitEvent(context.workflowId, 'step.started', { step });
        const result = await this.executeStepWithRetry(step, context);
        context.stepResults.set(step.id, result);
        context.totalCost += result.cost;
        if (result.success && result.output !== undefined) {
            context.stepOutputs.set(step.outputKey, result.output);
        }
        if (!result.success) {
            this.emitEvent(context.workflowId, 'step.failed', { step, result });
            throw new Error(`Step ${step.id} failed: ${result.error}`);
        }
        this.emitEvent(context.workflowId, 'step.completed', { step, result });
    }
    async executeParallel(stepIds, plan, context) {
        const steps = stepIds
            .map((id) => plan.steps.find((s) => s.id === id))
            .filter((s) => s !== undefined);
        const results = await Promise.allSettled(steps.map((step) => this.executeStepWithRetry(step, context)));
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const result = results[i];
            if (result.status === 'fulfilled') {
                context.stepResults.set(step.id, result.value);
                context.totalCost += result.value.cost;
                if (result.value.success && result.value.output !== undefined) {
                    context.stepOutputs.set(step.outputKey, result.value.output);
                }
                this.emitEvent(context.workflowId, 'step.completed', { step, result: result.value });
            }
            else {
                const errorResult = {
                    stepId: step.id,
                    success: false,
                    cost: 0,
                    time: 0,
                    error: result.reason,
                    attempts: 1,
                };
                context.stepResults.set(step.id, errorResult);
                this.emitEvent(context.workflowId, 'step.failed', { step, result: errorResult });
                throw new Error(`Step ${step.id} failed: ${result.reason}`);
            }
        }
    }
    async executeStepWithRetry(step, context) {
        let lastError;
        let attempts = 0;
        while (attempts < step.retryPolicy.maxAttempts) {
            attempts++;
            try {
                const result = await this.executeStep(step, context);
                result.attempts = attempts;
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : 'Unknown error';
                if (attempts < step.retryPolicy.maxAttempts) {
                    const delay = this.calculateBackoff(attempts, step.retryPolicy);
                    this.emitEvent(context.workflowId, 'step.progress', {
                        step,
                        attempt: attempts,
                        retrying: true,
                        delay,
                    });
                    await this.sleep(delay);
                }
            }
        }
        return {
            stepId: step.id,
            success: false,
            cost: 0,
            time: 0,
            error: lastError,
            attempts,
        };
    }
    async executeStep(step, context) {
        const startTime = Date.now();
        const serviceMatch = await this.serviceDiscovery.matchServiceToStep(step);
        if (!serviceMatch) {
            throw new Error(`No service found for step: ${step.action}`);
        }
        const params = this.resolveParams(step, context.stepOutputs);
        const { output, payment } = await this.paymentOrchestrator.executeServiceCall(serviceMatch.service.url, params, step);
        const executionTime = Date.now() - startTime;
        return {
            stepId: step.id,
            success: true,
            output,
            cost: payment.cost,
            time: executionTime,
            paymentSignature: payment.signature,
            attempts: 1,
        };
    }
    resolveParams(step, stepOutputs) {
        const params = { ...step.params };
        if (step.inputMapping) {
            for (const [paramKey, outputKey] of Object.entries(step.inputMapping)) {
                const value = stepOutputs.get(outputKey);
                if (value !== undefined) {
                    params[paramKey] = value;
                }
            }
        }
        return params;
    }
    calculateBackoff(attempt, policy) {
        const delay = Math.min(policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1), policy.maxDelayMs);
        const jitter = Math.random() * 0.3 * delay;
        return Math.floor(delay + jitter);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    topologicalSort(steps) {
        const inDegree = new Map();
        const levels = [];
        for (const step of steps) {
            inDegree.set(step.id, step.dependencies.length);
        }
        while (inDegree.size > 0) {
            const currentLevel = [];
            for (const [stepId, degree] of inDegree.entries()) {
                if (degree === 0) {
                    currentLevel.push(stepId);
                }
            }
            if (currentLevel.length === 0) {
                throw new Error('Circular dependency detected');
            }
            for (const stepId of currentLevel) {
                inDegree.delete(stepId);
                for (const [id, deps] of inDegree.entries()) {
                    if (deps > 0) {
                        const step = steps.find((s) => s.id === id);
                        if (step?.dependencies.includes(stepId)) {
                            inDegree.set(id, deps - 1);
                        }
                    }
                }
            }
            levels.push(currentLevel);
        }
        return levels;
    }
    extractFinalOutput(steps, outputs) {
        const finalSteps = steps.filter((step) => !steps.some((s) => s.dependencies.includes(step.id)));
        if (finalSteps.length === 1) {
            return outputs.get(finalSteps[0].outputKey);
        }
        const finalOutputs = {};
        for (const step of finalSteps) {
            const value = outputs.get(step.outputKey);
            if (value !== undefined) {
                finalOutputs[step.outputKey] = value;
            }
        }
        return finalOutputs;
    }
    async rollback(context) {
        this.emitEvent(context.workflowId, 'workflow.rolling_back', {});
        await this.saveExecutionState(context, 'rolling_back');
        this.emitEvent(context.workflowId, 'workflow.rolled_back', {});
    }
    async saveExecutionState(context, status) {
        const state = {
            status,
            stepResults: Object.fromEntries(context.stepResults),
            totalCost: context.totalCost,
            totalTime: Date.now() - context.startTime,
        };
        await this.redis.setex(`workflow:${context.workflowId}:state`, 3600, JSON.stringify(state));
    }
    emitEvent(workflowId, type, data) {
        const event = {
            workflowId,
            type: type,
            data,
            timestamp: Date.now(),
        };
        this.emit('event', event);
        this.redis.publish(`workflow:${workflowId}:events`, JSON.stringify(event));
    }
    async disconnect() {
        await this.redis.quit();
    }
}
exports.ExecutionEngine = ExecutionEngine;
//# sourceMappingURL=execution-engine.js.map