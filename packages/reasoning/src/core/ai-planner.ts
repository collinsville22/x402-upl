import Anthropic from '@anthropic-ai/sdk';
import { Intent, ExecutionPlan, ExecutionStep } from '../types/workflow.js';
import Redis from 'ioredis';

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

export class AITaskPlanner {
  private client: Anthropic;
  private redis?: Redis;
  private model: string;

  constructor(config: AIPlannerConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-5-sonnet-20241022';

    if (config.cacheEnabled && config.redisUrl) {
      this.redis = new Redis(config.redisUrl);
    }
  }

  async planWorkflow(
    naturalLanguageInput: string,
    userId: string
  ): Promise<PlanningResult> {
    const cacheKey = `plan:${this.hashInput(naturalLanguageInput)}`;

    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const intent = await this.extractIntent(naturalLanguageInput);
    const plan = await this.generateExecutionPlan(intent, naturalLanguageInput);

    const result: PlanningResult = {
      intent,
      plan,
      confidence: intent.confidence,
      reasoning: `Generated plan with ${plan.steps.length} steps`,
    };

    if (this.redis) {
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
    }

    return result;
  }

  private async extractIntent(input: string): Promise<Intent> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Analyze this task request and extract intent:

Task: "${input}"

Extract:
1. Classification (data_analysis, content_generation, research, computation, etc.)
2. Key entities (blockchain, tokens, dates, amounts, etc.)
3. Required capabilities (api_calls, data_processing, ai_analysis, etc.)
4. Confidence score (0-1)

Respond in JSON format:
{
  "classification": "...",
  "entities": {...},
  "requiredCapabilities": [...],
  "confidence": 0.0-1.0
}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      rawInput: input,
      classification: parsed.classification,
      entities: parsed.entities,
      confidence: parsed.confidence,
      requiredCapabilities: parsed.requiredCapabilities,
    };
  }

  private async generateExecutionPlan(
    intent: Intent,
    input: string
  ): Promise<ExecutionPlan> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Create an execution plan for this task:

Task: "${input}"

Intent Classification: ${intent.classification}
Required Capabilities: ${intent.requiredCapabilities.join(', ')}

Break down into atomic steps that can be executed by x402 services.
Each step should:
- Have a clear action (API call, data transformation, etc.)
- Specify required service capabilities
- Define input/output dependencies
- Estimate cost and time
- Be parallelizable if possible

Respond in JSON format:
{
  "steps": [
    {
      "id": "step_1",
      "type": "service_call",
      "action": "Fetch blockchain data",
      "serviceName": "Blockchain Data API",
      "params": {},
      "dependencies": [],
      "parallelizable": true,
      "estimatedCost": 0.05,
      "estimatedTime": 2000,
      "outputKey": "blockchain_data",
      "retryPolicy": {
        "maxAttempts": 3,
        "backoffMultiplier": 2,
        "initialDelayMs": 1000,
        "maxDelayMs": 30000
      }
    }
  ]
}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const steps: ExecutionStep[] = parsed.steps.map((s: any) => ({
      ...s,
      inputMapping: s.inputMapping || {},
      retryPolicy: s.retryPolicy || {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      },
    }));

    const dag = this.buildDAG(steps);
    const criticalPath = this.findCriticalPath(steps, dag);
    const parallelGroups = this.identifyParallelGroups(steps, dag);

    const totalEstimatedCost = steps.reduce((sum, s) => sum + s.estimatedCost, 0);
    const totalEstimatedTime = this.calculateTotalTime(steps, dag);

    return {
      steps,
      dag,
      criticalPath,
      parallelGroups,
      totalEstimatedCost,
      totalEstimatedTime,
    };
  }

  private buildDAG(steps: ExecutionStep[]): Record<string, string[]> {
    const dag: Record<string, string[]> = {};

    for (const step of steps) {
      dag[step.id] = step.dependencies;
    }

    return dag;
  }

  private findCriticalPath(
    steps: ExecutionStep[],
    dag: Record<string, string[]>
  ): string[] {
    const endSteps = steps.filter(
      (step) => !steps.some((s) => s.dependencies.includes(step.id))
    );

    if (endSteps.length === 0) return [];

    let longestPath: string[] = [];
    let maxTime = 0;

    for (const endStep of endSteps) {
      const path = this.findLongestPath(endStep, steps);
      const pathTime = path.reduce((sum, stepId) => {
        const step = steps.find((s) => s.id === stepId);
        return sum + (step?.estimatedTime || 0);
      }, 0);

      if (pathTime > maxTime) {
        maxTime = pathTime;
        longestPath = path;
      }
    }

    return longestPath;
  }

  private findLongestPath(step: ExecutionStep, allSteps: ExecutionStep[]): string[] {
    if (step.dependencies.length === 0) {
      return [step.id];
    }

    let longestDependencyPath: string[] = [];
    let maxLength = 0;

    for (const depId of step.dependencies) {
      const depStep = allSteps.find((s) => s.id === depId);
      if (!depStep) continue;

      const path = this.findLongestPath(depStep, allSteps);
      if (path.length > maxLength) {
        maxLength = path.length;
        longestDependencyPath = path;
      }
    }

    return [...longestDependencyPath, step.id];
  }

  private identifyParallelGroups(
    steps: ExecutionStep[],
    dag: Record<string, string[]>
  ): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    const levels = this.topologicalSort(steps, dag);

    for (const level of levels) {
      const parallelSteps = level.filter((stepId) => {
        const step = steps.find((s) => s.id === stepId);
        return step?.parallelizable && !processed.has(stepId);
      });

      if (parallelSteps.length > 1) {
        groups.push(parallelSteps);
      }

      parallelSteps.forEach((id) => processed.add(id));
    }

    return groups;
  }

  private topologicalSort(
    steps: ExecutionStep[],
    dag: Record<string, string[]>
  ): string[][] {
    const inDegree = new Map<string, number>();
    const levels: string[][] = [];

    for (const step of steps) {
      inDegree.set(step.id, step.dependencies.length);
    }

    while (inDegree.size > 0) {
      const currentLevel: string[] = [];

      for (const [stepId, degree] of inDegree.entries()) {
        if (degree === 0) {
          currentLevel.push(stepId);
        }
      }

      if (currentLevel.length === 0) {
        throw new Error('Circular dependency detected in workflow');
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

  private calculateTotalTime(
    steps: ExecutionStep[],
    dag: Record<string, string[]>
  ): number {
    const levels = this.topologicalSort(steps, dag);

    return levels.reduce((total, level) => {
      const maxTimeInLevel = Math.max(
        ...level.map((stepId) => {
          const step = steps.find((s) => s.id === stepId);
          return step?.estimatedTime || 0;
        })
      );
      return total + maxTimeInLevel;
    }, 0);
  }

  private hashInput(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
