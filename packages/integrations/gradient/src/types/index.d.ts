import { z } from 'zod';
export declare const ChatMessageSchema: z.ZodObject<{
    role: z.ZodEnum<["system", "user", "assistant"]>;
    content: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content: string;
    role: "user" | "assistant" | "system";
    name?: string | undefined;
}, {
    content: string;
    role: "user" | "assistant" | "system";
    name?: string | undefined;
}>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export declare const ChatCompletionRequestSchema: z.ZodObject<{
    model: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: "user" | "assistant" | "system";
        name?: string | undefined;
    }, {
        content: string;
        role: "user" | "assistant" | "system";
        name?: string | undefined;
    }>, "many">;
    max_tokens: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodOptional<z.ZodBoolean>;
    stop: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
}, "strip", z.ZodTypeAny, {
    model: string;
    messages: {
        content: string;
        role: "user" | "assistant" | "system";
        name?: string | undefined;
    }[];
    stop?: string | string[] | undefined;
    stream?: boolean | undefined;
    max_tokens?: number | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
}, {
    model: string;
    messages: {
        content: string;
        role: "user" | "assistant" | "system";
        name?: string | undefined;
    }[];
    stop?: string | string[] | undefined;
    stream?: boolean | undefined;
    max_tokens?: number | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
}>;
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export declare const ChatCompletionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    object: z.ZodLiteral<"chat.completion">;
    created: z.ZodNumber;
    model: z.ZodString;
    choices: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        message: z.ZodObject<{
            role: z.ZodEnum<["system", "user", "assistant"]>;
            content: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            content: string;
            role: "user" | "assistant" | "system";
            name?: string | undefined;
        }, {
            content: string;
            role: "user" | "assistant" | "system";
            name?: string | undefined;
        }>;
        finish_reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: {
            content: string;
            role: "user" | "assistant" | "system";
            name?: string | undefined;
        };
        index: number;
        finish_reason: string;
    }, {
        message: {
            content: string;
            role: "user" | "assistant" | "system";
            name?: string | undefined;
        };
        index: number;
        finish_reason: string;
    }>, "many">;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodNumber;
        total_tokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }>;
}, "strip", z.ZodTypeAny, {
    object: "chat.completion";
    choices: {
        message: {
            content: string;
            role: "user" | "assistant" | "system";
            name?: string | undefined;
        };
        index: number;
        finish_reason: string;
    }[];
    id: string;
    model: string;
    created: number;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}, {
    object: "chat.completion";
    choices: {
        message: {
            content: string;
            role: "user" | "assistant" | "system";
            name?: string | undefined;
        };
        index: number;
        finish_reason: string;
    }[];
    id: string;
    model: string;
    created: number;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}>;
export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;
export declare const ParallaxNodeConfigSchema: z.ZodObject<{
    nodeId: z.ZodString;
    host: z.ZodString;
    port: z.ZodNumber;
    peerId: z.ZodOptional<z.ZodString>;
    startLayer: z.ZodOptional<z.ZodNumber>;
    endLayer: z.ZodOptional<z.ZodNumber>;
    maxBatchSize: z.ZodOptional<z.ZodNumber>;
    maxTokensPerBatch: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    port: number;
    host: string;
    nodeId: string;
    peerId?: string | undefined;
    startLayer?: number | undefined;
    endLayer?: number | undefined;
    maxBatchSize?: number | undefined;
    maxTokensPerBatch?: number | undefined;
}, {
    port: number;
    host: string;
    nodeId: string;
    peerId?: string | undefined;
    startLayer?: number | undefined;
    endLayer?: number | undefined;
    maxBatchSize?: number | undefined;
    maxTokensPerBatch?: number | undefined;
}>;
export type ParallaxNodeConfig = z.infer<typeof ParallaxNodeConfigSchema>;
export declare const ParallaxClusterConfigSchema: z.ZodObject<{
    schedulerUrl: z.ZodString;
    model: z.ZodString;
    nodes: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        host: z.ZodString;
        port: z.ZodNumber;
        peerId: z.ZodOptional<z.ZodString>;
        startLayer: z.ZodOptional<z.ZodNumber>;
        endLayer: z.ZodOptional<z.ZodNumber>;
        maxBatchSize: z.ZodOptional<z.ZodNumber>;
        maxTokensPerBatch: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        host: string;
        nodeId: string;
        peerId?: string | undefined;
        startLayer?: number | undefined;
        endLayer?: number | undefined;
        maxBatchSize?: number | undefined;
        maxTokensPerBatch?: number | undefined;
    }, {
        port: number;
        host: string;
        nodeId: string;
        peerId?: string | undefined;
        startLayer?: number | undefined;
        endLayer?: number | undefined;
        maxBatchSize?: number | undefined;
        maxTokensPerBatch?: number | undefined;
    }>, "many">;
    isLocalNetwork: z.ZodDefault<z.ZodBoolean>;
    initialPeers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    relayServers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    model: string;
    schedulerUrl: string;
    nodes: {
        port: number;
        host: string;
        nodeId: string;
        peerId?: string | undefined;
        startLayer?: number | undefined;
        endLayer?: number | undefined;
        maxBatchSize?: number | undefined;
        maxTokensPerBatch?: number | undefined;
    }[];
    isLocalNetwork: boolean;
    initialPeers?: string[] | undefined;
    relayServers?: string[] | undefined;
}, {
    model: string;
    schedulerUrl: string;
    nodes: {
        port: number;
        host: string;
        nodeId: string;
        peerId?: string | undefined;
        startLayer?: number | undefined;
        endLayer?: number | undefined;
        maxBatchSize?: number | undefined;
        maxTokensPerBatch?: number | undefined;
    }[];
    isLocalNetwork?: boolean | undefined;
    initialPeers?: string[] | undefined;
    relayServers?: string[] | undefined;
}>;
export type ParallaxClusterConfig = z.infer<typeof ParallaxClusterConfigSchema>;
export declare const ServiceDiscoveryRequestSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    minReputation: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    category?: string | undefined;
    maxPrice?: number | undefined;
    minReputation?: number | undefined;
}, {
    category?: string | undefined;
    limit?: number | undefined;
    maxPrice?: number | undefined;
    minReputation?: number | undefined;
}>;
export type ServiceDiscoveryRequest = z.infer<typeof ServiceDiscoveryRequestSchema>;
export declare const ServiceInfoSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    endpoint: z.ZodString;
    pricePerCall: z.ZodNumber;
    pricePerToken: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    reputation: z.ZodNumber;
    totalRatings: z.ZodNumber;
    provider: z.ZodString;
    capabilities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    pricePerCall: number;
    description: string;
    name: string;
    category: string;
    reputation: number;
    id: string;
    endpoint: string;
    provider: string;
    currency: string;
    totalRatings: number;
    capabilities?: Record<string, any> | undefined;
    pricePerToken?: number | undefined;
}, {
    pricePerCall: number;
    description: string;
    name: string;
    category: string;
    reputation: number;
    id: string;
    endpoint: string;
    provider: string;
    totalRatings: number;
    capabilities?: Record<string, any> | undefined;
    pricePerToken?: number | undefined;
    currency?: string | undefined;
}>;
export type ServiceInfo = z.infer<typeof ServiceInfoSchema>;
export declare const PaymentRequestSchema: z.ZodObject<{
    recipient: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    memo: z.ZodOptional<z.ZodString>;
    serviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    recipient: string;
    currency: string;
    serviceId?: string | undefined;
    memo?: string | undefined;
}, {
    amount: number;
    recipient: string;
    serviceId?: string | undefined;
    currency?: string | undefined;
    memo?: string | undefined;
}>;
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;
export declare const PaymentResultSchema: z.ZodObject<{
    signature: z.ZodString;
    success: z.ZodBoolean;
    error: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    signature: string;
    timestamp: number;
    error?: string | undefined;
}, {
    success: boolean;
    signature: string;
    timestamp: number;
    error?: string | undefined;
}>;
export type PaymentResult = z.infer<typeof PaymentResultSchema>;
export declare const AgentToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    description: string;
    name: string;
    parameters: Record<string, any>;
    required?: string[] | undefined;
}, {
    description: string;
    name: string;
    parameters: Record<string, any>;
    required?: string[] | undefined;
}>;
export type AgentTool = z.infer<typeof AgentToolSchema>;
export declare const AgentConfigSchema: z.ZodObject<{
    name: z.ZodString;
    systemPrompt: z.ZodString;
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
        required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        name: string;
        parameters: Record<string, any>;
        required?: string[] | undefined;
    }, {
        description: string;
        name: string;
        parameters: Record<string, any>;
        required?: string[] | undefined;
    }>, "many">;
    maxIterations: z.ZodDefault<z.ZodNumber>;
    budget: z.ZodOptional<z.ZodNumber>;
    spendingLimitPerHour: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tools: {
        description: string;
        name: string;
        parameters: Record<string, any>;
        required?: string[] | undefined;
    }[];
    systemPrompt: string;
    maxIterations: number;
    budget?: number | undefined;
    spendingLimitPerHour?: number | undefined;
}, {
    name: string;
    tools: {
        description: string;
        name: string;
        parameters: Record<string, any>;
        required?: string[] | undefined;
    }[];
    systemPrompt: string;
    budget?: number | undefined;
    maxIterations?: number | undefined;
    spendingLimitPerHour?: number | undefined;
}>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export declare const InferenceMetricsSchema: z.ZodObject<{
    requestId: z.ZodString;
    startTime: z.ZodNumber;
    endTime: z.ZodNumber;
    totalLatencyMs: z.ZodNumber;
    ttftMs: z.ZodOptional<z.ZodNumber>;
    promptTokens: z.ZodNumber;
    completionTokens: z.ZodNumber;
    totalTokens: z.ZodNumber;
    throughputTokensPerSec: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    requestId: string;
    startTime: number;
    endTime: number;
    totalLatencyMs: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    throughputTokensPerSec: number;
    ttftMs?: number | undefined;
}, {
    requestId: string;
    startTime: number;
    endTime: number;
    totalLatencyMs: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    throughputTokensPerSec: number;
    ttftMs?: number | undefined;
}>;
export type InferenceMetrics = z.infer<typeof InferenceMetricsSchema>;
export declare const EconomicMetricsSchema: z.ZodObject<{
    totalSpent: z.ZodNumber;
    totalEarned: z.ZodNumber;
    netProfit: z.ZodNumber;
    transactionCount: z.ZodNumber;
    averageCostPerInference: z.ZodNumber;
    costSavingsVsHosted: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    totalSpent: number;
    transactionCount: number;
    totalEarned: number;
    netProfit: number;
    averageCostPerInference: number;
    costSavingsVsHosted?: number | undefined;
}, {
    totalSpent: number;
    transactionCount: number;
    totalEarned: number;
    netProfit: number;
    averageCostPerInference: number;
    costSavingsVsHosted?: number | undefined;
}>;
export type EconomicMetrics = z.infer<typeof EconomicMetricsSchema>;
export interface ToolExecutionContext {
    agentId: string;
    conversationId: string;
    currentBudget: number;
    spentThisHour: number;
    timestamp: number;
}
export interface ToolExecutionResult {
    success: boolean;
    result?: any;
    error?: string;
    cost?: number;
    latencyMs?: number;
}
//# sourceMappingURL=index.d.ts.map