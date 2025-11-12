"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomicMetricsSchema = exports.InferenceMetricsSchema = exports.AgentConfigSchema = exports.AgentToolSchema = exports.PaymentResultSchema = exports.PaymentRequestSchema = exports.ServiceInfoSchema = exports.ServiceDiscoveryRequestSchema = exports.ParallaxClusterConfigSchema = exports.ParallaxNodeConfigSchema = exports.ChatCompletionResponseSchema = exports.ChatCompletionRequestSchema = exports.ChatMessageSchema = void 0;
const zod_1 = require("zod");
exports.ChatMessageSchema = zod_1.z.object({
    role: zod_1.z.enum(['system', 'user', 'assistant']),
    content: zod_1.z.string(),
    name: zod_1.z.string().optional(),
});
exports.ChatCompletionRequestSchema = zod_1.z.object({
    model: zod_1.z.string(),
    messages: zod_1.z.array(exports.ChatMessageSchema),
    max_tokens: zod_1.z.number().int().positive().optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    top_p: zod_1.z.number().min(0).max(1).optional(),
    stream: zod_1.z.boolean().optional(),
    stop: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
});
exports.ChatCompletionResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    object: zod_1.z.literal('chat.completion'),
    created: zod_1.z.number().int(),
    model: zod_1.z.string(),
    choices: zod_1.z.array(zod_1.z.object({
        index: zod_1.z.number().int(),
        message: exports.ChatMessageSchema,
        finish_reason: zod_1.z.string(),
    })),
    usage: zod_1.z.object({
        prompt_tokens: zod_1.z.number().int(),
        completion_tokens: zod_1.z.number().int(),
        total_tokens: zod_1.z.number().int(),
    }),
});
exports.ParallaxNodeConfigSchema = zod_1.z.object({
    nodeId: zod_1.z.string(),
    host: zod_1.z.string(),
    port: zod_1.z.number().int().positive(),
    peerId: zod_1.z.string().optional(),
    startLayer: zod_1.z.number().int().nonnegative().optional(),
    endLayer: zod_1.z.number().int().positive().optional(),
    maxBatchSize: zod_1.z.number().int().positive().optional(),
    maxTokensPerBatch: zod_1.z.number().int().positive().optional(),
});
exports.ParallaxClusterConfigSchema = zod_1.z.object({
    schedulerUrl: zod_1.z.string().url(),
    model: zod_1.z.string(),
    nodes: zod_1.z.array(exports.ParallaxNodeConfigSchema),
    isLocalNetwork: zod_1.z.boolean().default(true),
    initialPeers: zod_1.z.array(zod_1.z.string()).optional(),
    relayServers: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ServiceDiscoveryRequestSchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    maxPrice: zod_1.z.number().positive().optional(),
    minReputation: zod_1.z.number().min(0).max(5).optional(),
    limit: zod_1.z.number().int().positive().default(10),
});
exports.ServiceInfoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.string(),
    endpoint: zod_1.z.string().url(),
    pricePerCall: zod_1.z.number().nonnegative(),
    pricePerToken: zod_1.z.number().nonnegative().optional(),
    currency: zod_1.z.string().default('USDC'),
    reputation: zod_1.z.number().min(0).max(5),
    totalRatings: zod_1.z.number().int().nonnegative(),
    provider: zod_1.z.string(),
    capabilities: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.PaymentRequestSchema = zod_1.z.object({
    recipient: zod_1.z.string(),
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.string().default('USDC'),
    memo: zod_1.z.string().optional(),
    serviceId: zod_1.z.string().optional(),
});
exports.PaymentResultSchema = zod_1.z.object({
    signature: zod_1.z.string(),
    success: zod_1.z.boolean(),
    error: zod_1.z.string().optional(),
    timestamp: zod_1.z.number().int(),
});
exports.AgentToolSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.any()),
    required: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.AgentConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    systemPrompt: zod_1.z.string(),
    tools: zod_1.z.array(exports.AgentToolSchema),
    maxIterations: zod_1.z.number().int().positive().default(10),
    budget: zod_1.z.number().positive().optional(),
    spendingLimitPerHour: zod_1.z.number().positive().optional(),
});
exports.InferenceMetricsSchema = zod_1.z.object({
    requestId: zod_1.z.string(),
    startTime: zod_1.z.number(),
    endTime: zod_1.z.number(),
    totalLatencyMs: zod_1.z.number(),
    ttftMs: zod_1.z.number().optional(),
    promptTokens: zod_1.z.number().int(),
    completionTokens: zod_1.z.number().int(),
    totalTokens: zod_1.z.number().int(),
    throughputTokensPerSec: zod_1.z.number(),
});
exports.EconomicMetricsSchema = zod_1.z.object({
    totalSpent: zod_1.z.number().nonnegative(),
    totalEarned: zod_1.z.number().nonnegative(),
    netProfit: zod_1.z.number(),
    transactionCount: zod_1.z.number().int().nonnegative(),
    averageCostPerInference: zod_1.z.number().nonnegative(),
    costSavingsVsHosted: zod_1.z.number().optional(),
});
//# sourceMappingURL=index.js.map