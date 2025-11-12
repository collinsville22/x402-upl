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

export class ServiceChainExecutor {
  private config: ServiceChainConfig;

  constructor(config: ServiceChainConfig) {
    this.config = config;
  }

  async execute(plan: ExecutionPlan): Promise<ChainExecutionResult> {
    if (plan.totalEstimatedCost > this.config.maxTotalCost) {
      return {
        success: false,
        totalCost: 0,
        totalTime: 0,
        stepResults: new Map(),
        output: null,
        errors: [
          {
            stepId: 'validation',
            error: `Total cost ${plan.totalEstimatedCost} exceeds maximum ${this.config.maxTotalCost}`,
            timestamp: Date.now(),
          },
        ],
      };
    }

    const startTime = Date.now();
    const stepResults = new Map<string, StepResult>();
    const errors: ExecutionError[] = [];

    const executedSteps = new Set<string>();
    const stepOutputs = new Map<string, unknown>();

    for (const step of plan.steps) {
      const canExecute = this.canExecuteStep(step, executedSteps);

      if (!canExecute) {
        errors.push({
          stepId: step.id,
          error: 'Dependencies not met',
          timestamp: Date.now(),
        });

        if (this.config.failureStrategy === 'abort') {
          break;
        }

        continue;
      }

      const result = await this.executeStep(step, stepOutputs);

      stepResults.set(step.id, result);

      if (result.success) {
        executedSteps.add(step.id);
        if (result.output !== undefined) {
          stepOutputs.set(step.outputKey || step.id, result.output);
        }
      } else {
        errors.push({
          stepId: step.id,
          error: result.error || 'Unknown error',
          timestamp: Date.now(),
        });

        if (this.config.failureStrategy === 'abort') {
          break;
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const totalCost = Array.from(stepResults.values()).reduce(
      (sum, result) => sum + result.cost,
      0
    );

    const finalOutput = this.extractFinalOutput(plan.steps, stepOutputs);

    return {
      success: errors.length === 0,
      totalCost,
      totalTime,
      stepResults,
      output: finalOutput,
      errors,
    };
  }

  private canExecuteStep(step: ExecutionStep, executedSteps: Set<string>): boolean {
    return step.dependencies.every(depId => executedSteps.has(depId));
  }

  private async executeStep(
    step: ExecutionStep,
    previousOutputs: Map<string, unknown>
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      const params = this.resolveParams(step, previousOutputs);

      const output = await this.callService(step, params);

      const executionTime = Date.now() - startTime;

      return {
        stepId: step.id,
        success: true,
        output,
        cost: step.estimatedCost,
        time: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        stepId: step.id,
        success: false,
        cost: 0,
        time: executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private resolveParams(
    step: ExecutionStep,
    previousOutputs: Map<string, unknown>
  ): Record<string, unknown> {
    const params = { ...step.params };

    if (step.inputMapping) {
      for (const [paramKey, outputKey] of Object.entries(step.inputMapping)) {
        const value = previousOutputs.get(outputKey);
        if (value !== undefined) {
          params[paramKey] = value;
        }
      }
    }

    return params;
  }

  private async callService(step: ExecutionStep, params: Record<string, unknown>): Promise<unknown> {
    if (!step.serviceName || !step.serviceId) {
      throw new Error('Service name or ID required for execution');
    }

    const serviceUrl = step.serviceName;

    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.status === 402) {
      const paymentRequirements = await response.json();
      throw new Error(
        `Payment required: ${paymentRequirements.amount} ${paymentRequirements.asset} to ${paymentRequirements.payTo}`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Service call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  private extractFinalOutput(
    steps: ExecutionStep[],
    outputs: Map<string, unknown>
  ): unknown {
    const finalSteps = steps.filter(step =>
      !steps.some(s => s.dependencies.includes(step.id))
    );

    if (finalSteps.length === 1) {
      const outputKey = finalSteps[0].outputKey || finalSteps[0].id;
      return outputs.get(outputKey);
    }

    const finalOutputs: Record<string, unknown> = {};
    for (const step of finalSteps) {
      const outputKey = step.outputKey || step.id;
      const value = outputs.get(outputKey);
      if (value !== undefined) {
        finalOutputs[outputKey] = value;
      }
    }

    return finalOutputs;
  }

  async executeParallel(steps: ExecutionStep[]): Promise<Map<string, StepResult>> {
    const parallelSteps = steps.filter(step => step.parallelizable);

    const results = await Promise.all(
      parallelSteps.map(step => this.executeStep(step, new Map()))
    );

    const resultMap = new Map<string, StepResult>();
    for (const result of results) {
      resultMap.set(result.stepId, result);
    }

    return resultMap;
  }

  validateChain(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const stepIds = new Set(plan.steps.map(s => s.id));

    for (const step of plan.steps) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          errors.push(`Step ${step.id} depends on non-existent step ${depId}`);
        }
      }
    }

    const hasCycle = this.detectCycle(plan.steps);
    if (hasCycle) {
      errors.push('Execution plan contains circular dependencies');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private detectCycle(steps: ExecutionStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleUtil = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (!step) return false;

      for (const depId of step.dependencies) {
        if (!visited.has(depId)) {
          if (hasCycleUtil(depId)) return true;
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (hasCycleUtil(step.id)) return true;
      }
    }

    return false;
  }
}
