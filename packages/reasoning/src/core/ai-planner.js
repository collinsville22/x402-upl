"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITaskPlanner = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const ioredis_1 = __importDefault(require("ioredis"));
class AITaskPlanner {
    client;
    redis;
    model;
    constructor(config) {
        this.client = new sdk_1.default({ apiKey: config.apiKey });
        this.model = config.model || 'claude-3-5-sonnet-20241022';
        if (config.cacheEnabled && config.redisUrl) {
            this.redis = new ioredis_1.default(config.redisUrl);
        }
    }
    async planWorkflow(naturalLanguageInput, userId) {
        const cacheKey = `plan:${this.hashInput(naturalLanguageInput)}`;
        if (this.redis) {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        const intent = await this.extractIntent(naturalLanguageInput);
        const plan = await this.generateExecutionPlan(intent, naturalLanguageInput);
        const result = {
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
    async extractIntent(input) {
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
    async generateExecutionPlan(intent, input) {
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
        const steps = parsed.steps.map((s) => ({
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
    buildDAG(steps) {
        const dag = {};
        for (const step of steps) {
            dag[step.id] = step.dependencies;
        }
        return dag;
    }
    findCriticalPath(steps, dag) {
        const endSteps = steps.filter((step) => !steps.some((s) => s.dependencies.includes(step.id)));
        if (endSteps.length === 0)
            return [];
        let longestPath = [];
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
    findLongestPath(step, allSteps) {
        if (step.dependencies.length === 0) {
            return [step.id];
        }
        let longestDependencyPath = [];
        let maxLength = 0;
        for (const depId of step.dependencies) {
            const depStep = allSteps.find((s) => s.id === depId);
            if (!depStep)
                continue;
            const path = this.findLongestPath(depStep, allSteps);
            if (path.length > maxLength) {
                maxLength = path.length;
                longestDependencyPath = path;
            }
        }
        return [...longestDependencyPath, step.id];
    }
    identifyParallelGroups(steps, dag) {
        const groups = [];
        const processed = new Set();
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
    topologicalSort(steps, dag) {
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
    calculateTotalTime(steps, dag) {
        const levels = this.topologicalSort(steps, dag);
        return levels.reduce((total, level) => {
            const maxTimeInLevel = Math.max(...level.map((stepId) => {
                const step = steps.find((s) => s.id === stepId);
                return step?.estimatedTime || 0;
            }));
            return total + maxTimeInLevel;
        }, 0);
    }
    hashInput(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.AITaskPlanner = AITaskPlanner;
//# sourceMappingURL=ai-planner.js.map