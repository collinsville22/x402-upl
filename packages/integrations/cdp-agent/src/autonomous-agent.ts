import OpenAI from 'openai';
import { X402CDPSolanaClient } from './x402-cdp-solana-client.js';
import { ServiceDiscovery, X402Service } from './service-discovery.js';

export interface AgentTask {
  taskId: string;
  description: string;
  maxBudgetUSD: number;
}

export interface ExecutionPlan {
  steps: PlanStep[];
  estimatedCostUSD: number;
  reasoning: string;
}

export interface PlanStep {
  stepNumber: number;
  serviceUrl: string;
  method: 'GET' | 'POST';
  parameters?: Record<string, any>;
  estimatedCostUSD: number;
  dependsOn: number[];
}

export interface ExecutionResult {
  success: boolean;
  steps: StepResult[];
  totalCostUSD: number;
  totalTimeMs: number;
  error?: string;
}

export interface StepResult {
  stepNumber: number;
  serviceUrl: string;
  success: boolean;
  data?: any;
  costUSD: number;
  executionTimeMs: number;
  paymentSignature?: string;
  error?: string;
}

export class AutonomousAgent {
  private client: X402CDPSolanaClient;
  private discovery: ServiceDiscovery;
  private openai: OpenAI;
  private model: string;

  constructor(
    client: X402CDPSolanaClient,
    openaiApiKey: string,
    model: string = 'gpt-4'
  ) {
    this.client = client;
    this.discovery = new ServiceDiscovery();
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.model = model;
  }

  async planExecution(task: AgentTask): Promise<ExecutionPlan> {
    const availableServices = await this.discovery.listAllServices();

    const systemPrompt = `You are an autonomous agent that plans API service execution using x402 payments.

Available services:
${JSON.stringify(availableServices.map(s => ({
  url: s.resource,
  method: s.method,
  description: s.description,
  costUSD: this.convertToUSD(s.accepts[0].maxAmountRequired),
  network: s.accepts[0].network
})), null, 2)}

Task budget: $${task.maxBudgetUSD}

Create an execution plan:
1. Select appropriate services
2. Determine execution order
3. Calculate costs
4. Stay within budget

Respond with JSON:
{
  "steps": [
    {
      "stepNumber": 1,
      "serviceUrl": "https://...",
      "method": "GET",
      "parameters": {},
      "estimatedCostUSD": 0.001,
      "dependsOn": []
    }
  ],
  "estimatedCostUSD": 0.001,
  "reasoning": "explanation"
}`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: task.description },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const plan = JSON.parse(content);

    if (plan.estimatedCostUSD > task.maxBudgetUSD) {
      throw new Error(
        `Plan exceeds budget: $${plan.estimatedCostUSD} > $${task.maxBudgetUSD}`
      );
    }

    return plan;
  }

  async executeTask(task: AgentTask): Promise<ExecutionResult> {
    const startTime = Date.now();
    const results: StepResult[] = [];
    let totalCostUSD = 0;

    try {
      const plan = await this.planExecution(task);

      const sortedSteps = this.topologicalSort(plan.steps);

      for (const step of sortedSteps) {
        const stepStartTime = Date.now();

        try {
          let data: any;

          if (step.method === 'GET') {
            data = await this.client.get(step.serviceUrl, step.parameters);
          } else {
            data = await this.client.post(step.serviceUrl, step.parameters);
          }

          const executionTimeMs = Date.now() - stepStartTime;

          results.push({
            stepNumber: step.stepNumber,
            serviceUrl: step.serviceUrl,
            success: true,
            data,
            costUSD: step.estimatedCostUSD,
            executionTimeMs,
          });

          totalCostUSD += step.estimatedCostUSD;
        } catch (error) {
          const executionTimeMs = Date.now() - stepStartTime;

          results.push({
            stepNumber: step.stepNumber,
            serviceUrl: step.serviceUrl,
            success: false,
            costUSD: 0,
            executionTimeMs,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error;
        }
      }

      const totalTimeMs = Date.now() - startTime;

      return {
        success: true,
        steps: results,
        totalCostUSD,
        totalTimeMs,
      };
    } catch (error) {
      const totalTimeMs = Date.now() - startTime;

      return {
        success: false,
        steps: results,
        totalCostUSD,
        totalTimeMs,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async analyzeResults(
    task: AgentTask,
    result: ExecutionResult
  ): Promise<string> {
    const systemPrompt = `You are an analytical agent.

Analyze the execution results:
1. Did the task succeed?
2. What were the outcomes?
3. Cost efficiency (actual vs budget)
4. Recommendations`;

    const userPrompt = `Task: ${task.description}
Budget: $${task.maxBudgetUSD}

Results:
${JSON.stringify(result, null, 2)}`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    });

    return response.choices[0].message.content || 'No analysis generated';
  }

  private topologicalSort(steps: PlanStep[]): PlanStep[] {
    const sorted: PlanStep[] = [];
    const visited = new Set<number>();
    const visiting = new Set<number>();

    const visit = (step: PlanStep): void => {
      if (visited.has(step.stepNumber)) return;

      if (visiting.has(step.stepNumber)) {
        throw new Error('Circular dependency detected');
      }

      visiting.add(step.stepNumber);

      for (const depNum of step.dependsOn) {
        const depStep = steps.find(s => s.stepNumber === depNum);
        if (depStep) visit(depStep);
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

  private convertToUSD(amount: string): number {
    return parseFloat(amount) / 1000000;
  }
}
