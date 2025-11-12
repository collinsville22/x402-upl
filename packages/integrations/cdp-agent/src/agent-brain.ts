import OpenAI from 'openai';
import { ToolMetadata, ToolRegistry } from './tool-registry.js';

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

export class AgentBrain {
  private openai: OpenAI;
  private registry: ToolRegistry;
  private model: string;

  constructor(openaiApiKey: string, registry: ToolRegistry, model: string = 'gpt-4') {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.registry = registry;
    this.model = model;
  }

  async planToolChain(task: AgentTask): Promise<ToolChainPlan> {
    const availableTools = this.registry.listTools();

    const systemPrompt = `You are an autonomous agent that plans tool execution chains.
Given a task and available tools, create an optimal execution plan.
Consider:
1. Tool costs and budget constraints
2. Tool dependencies and execution order
3. Parameter requirements
4. Error handling

Available tools:
${JSON.stringify(availableTools, null, 2)}

Task budget: ${task.maxBudgetLamports} lamports

Respond with a JSON object:
{
  "steps": [
    {
      "stepNumber": 1,
      "toolId": "tool-id",
      "parameters": {},
      "costLamports": 0,
      "dependsOn": []
    }
  ],
  "estimatedCost": 0,
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

    if (plan.estimatedCost > task.maxBudgetLamports) {
      throw new Error(
        `Plan exceeds budget: ${plan.estimatedCost} > ${task.maxBudgetLamports}`
      );
    }

    return plan;
  }

  async optimizePlan(plan: ToolChainPlan): Promise<ToolChainPlan> {
    const systemPrompt = `You are an optimization agent.
Given a tool execution plan, optimize it for:
1. Cost reduction
2. Parallel execution opportunities
3. Redundancy elimination

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

  async reasonAboutResults(
    task: AgentTask,
    plan: ToolChainPlan,
    results: Array<{ step: number; result: any }>
  ): Promise<string> {
    const systemPrompt = `You are an analytical agent.
Given a task, execution plan, and results, provide analysis:
1. Did the plan succeed?
2. What were the key outcomes?
3. Cost efficiency analysis
4. Recommendations for improvement`;

    const userPrompt = `Task: ${task.description}

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
