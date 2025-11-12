import OpenAI from 'openai';
import { ServiceRegistry, X402Service } from './service-registry.js';

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

export class AgentBrain {
  private openai: OpenAI;
  private registry: ServiceRegistry;
  private model: string;

  constructor(
    openaiApiKey: string,
    registry: ServiceRegistry,
    model: string = 'gpt-4'
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.registry = registry;
    this.model = model;
  }

  async planServiceChain(task: AgentTask): Promise<ServiceChainPlan> {
    const availableServices = await this.registry.listServices();

    const systemPrompt = `You are an autonomous agent that plans service execution chains using x402 payment protocol.

Available services:
${JSON.stringify(availableServices, null, 2)}

Task budget: ${task.maxBudget} CASH

Create an optimal execution plan considering:
1. Service costs and budget constraints
2. Service dependencies and execution order
3. Parameter requirements
4. Data flow between services

Respond with JSON:
{
  "steps": [
    {
      "stepNumber": 1,
      "serviceId": "service-id",
      "parameters": {},
      "costCash": 0.00,
      "dependsOn": []
    }
  ],
  "estimatedCost": 0.00,
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

    if (plan.estimatedCost > task.maxBudget) {
      throw new Error(
        `Plan exceeds budget: ${plan.estimatedCost} CASH > ${task.maxBudget} CASH`
      );
    }

    return plan;
  }

  async optimizePlan(plan: ServiceChainPlan): Promise<ServiceChainPlan> {
    const systemPrompt = `You are an optimization agent for x402 service chains.

Optimize this plan for:
1. Cost reduction (find cheaper alternatives)
2. Parallel execution opportunities
3. Redundancy elimination
4. Efficiency improvements

Return optimized plan in same JSON format.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(plan) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    return JSON.parse(content);
  }

  async analyzeResults(
    task: AgentTask,
    plan: ServiceChainPlan,
    results: Array<{ step: number; result: any; cost: number }>
  ): Promise<string> {
    const systemPrompt = `You are an analytical agent for x402 service chains.

Analyze the execution:
1. Did the plan succeed?
2. What were the key outcomes?
3. Cost efficiency analysis (actual vs estimated)
4. Recommendations for improvement`;

    const userPrompt = `Task: ${task.description}

Budget: ${task.maxBudget} CASH

Plan:
${JSON.stringify(plan, null, 2)}

Results:
${JSON.stringify(results, null, 2)}`;

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
}
