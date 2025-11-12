import { CDPSolanaClient, TransactionResult } from './cdp-client.js';
import { ToolRegistry, ToolResult } from './tool-registry.js';
import { ToolChainPlan, ToolChainStep } from './agent-brain.js';

export interface ExecutionContext {
  agentAddress: string;
  maxBudgetLamports: number;
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
  toolId: string;
  toolResult: ToolResult;
  payment: TransactionResult | null;
  cost: number;
}

export class ExecutionEngine {
  private cdpClient: CDPSolanaClient;
  private registry: ToolRegistry;

  constructor(cdpClient: CDPSolanaClient, registry: ToolRegistry) {
    this.cdpClient = cdpClient;
    this.registry = registry;
  }

  async execute(
    plan: ToolChainPlan,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const results: StepResult[] = [];
    let totalCost = 0;

    try {
      const sortedSteps = this.topologicalSort(plan.steps);

      for (const step of sortedSteps) {
        const stepResult = await this.executeStep(step, context);
        results.push(stepResult);

        if (!stepResult.toolResult.success) {
          throw new Error(
            `Step ${step.stepNumber} failed: ${stepResult.toolResult.error}`
          );
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
    } catch (error) {
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

  private async executeStep(
    step: ToolChainStep,
    context: ExecutionContext
  ): Promise<StepResult> {
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

    let payment: TransactionResult | null = null;

    if (tool.costLamports > 0) {
      try {
        payment = await this.cdpClient.sendTransaction(
          context.agentAddress,
          tool.paymentAddress,
          tool.costLamports
        );
      } catch (error) {
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

  private topologicalSort(steps: ToolChainStep[]): ToolChainStep[] {
    const sorted: ToolChainStep[] = [];
    const visited = new Set<number>();
    const visiting = new Set<number>();

    const visit = (step: ToolChainStep): void => {
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
