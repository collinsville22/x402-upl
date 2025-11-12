import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  name: z.string().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number().int(),
    message: ChatMessageSchema,
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number().int(),
    completion_tokens: z.number().int(),
    total_tokens: z.number().int(),
  }),
});

export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;

export const ParallaxNodeConfigSchema = z.object({
  nodeId: z.string(),
  host: z.string(),
  port: z.number().int().positive(),
  peerId: z.string().optional(),
  startLayer: z.number().int().nonnegative().optional(),
  endLayer: z.number().int().positive().optional(),
  maxBatchSize: z.number().int().positive().optional(),
  maxTokensPerBatch: z.number().int().positive().optional(),
});

export type ParallaxNodeConfig = z.infer<typeof ParallaxNodeConfigSchema>;

export const ParallaxClusterConfigSchema = z.object({
  schedulerUrl: z.string().url(),
  model: z.string(),
  nodes: z.array(ParallaxNodeConfigSchema),
  isLocalNetwork: z.boolean().default(true),
  initialPeers: z.array(z.string()).optional(),
  relayServers: z.array(z.string()).optional(),
});

export type ParallaxClusterConfig = z.infer<typeof ParallaxClusterConfigSchema>;

export const ServiceDiscoveryRequestSchema = z.object({
  category: z.string().optional(),
  maxPrice: z.number().positive().optional(),
  minReputation: z.number().min(0).max(5).optional(),
  limit: z.number().int().positive().default(10),
});

export type ServiceDiscoveryRequest = z.infer<typeof ServiceDiscoveryRequestSchema>;

export const ServiceInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  endpoint: z.string().url(),
  pricePerCall: z.number().nonnegative(),
  pricePerToken: z.number().nonnegative().optional(),
  currency: z.string().default('USDC'),
  reputation: z.number().min(0).max(5),
  totalRatings: z.number().int().nonnegative(),
  provider: z.string(),
  capabilities: z.record(z.any()).optional(),
});

export type ServiceInfo = z.infer<typeof ServiceInfoSchema>;

export const PaymentRequestSchema = z.object({
  recipient: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('USDC'),
  memo: z.string().optional(),
  serviceId: z.string().optional(),
});

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

export const PaymentResultSchema = z.object({
  signature: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  timestamp: z.number().int(),
});

export type PaymentResult = z.infer<typeof PaymentResultSchema>;

export const AgentToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()),
  required: z.array(z.string()).optional(),
});

export type AgentTool = z.infer<typeof AgentToolSchema>;

export const AgentConfigSchema = z.object({
  name: z.string(),
  systemPrompt: z.string(),
  tools: z.array(AgentToolSchema),
  maxIterations: z.number().int().positive().default(10),
  budget: z.number().positive().optional(),
  spendingLimitPerHour: z.number().positive().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const InferenceMetricsSchema = z.object({
  requestId: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  totalLatencyMs: z.number(),
  ttftMs: z.number().optional(),
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  throughputTokensPerSec: z.number(),
});

export type InferenceMetrics = z.infer<typeof InferenceMetricsSchema>;

export const EconomicMetricsSchema = z.object({
  totalSpent: z.number().nonnegative(),
  totalEarned: z.number().nonnegative(),
  netProfit: z.number(),
  transactionCount: z.number().int().nonnegative(),
  averageCostPerInference: z.number().nonnegative(),
  costSavingsVsHosted: z.number().optional(),
});

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
