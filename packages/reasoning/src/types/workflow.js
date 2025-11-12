"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEventSchema = exports.CreateWorkflowRequestSchema = exports.WorkflowSchema = exports.IntentSchema = exports.WorkflowErrorSchema = exports.StepResultSchema = exports.ExecutionPlanSchema = exports.ExecutionStepSchema = exports.RetryPolicySchema = exports.WorkflowStatusSchema = void 0;
const zod_1 = require("zod");
exports.WorkflowStatusSchema = zod_1.z.enum([
    'planning',
    'awaiting_approval',
    'approved',
    'executing',
    'completed',
    'failed',
    'cancelled',
    'rolling_back',
]);
exports.RetryPolicySchema = zod_1.z.object({
    maxAttempts: zod_1.z.number().min(1).max(10).default(3),
    backoffMultiplier: zod_1.z.number().min(1).max(10).default(2),
    initialDelayMs: zod_1.z.number().min(100).max(10000).default(1000),
    maxDelayMs: zod_1.z.number().min(1000).max(60000).default(30000),
});
exports.ExecutionStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['service_call', 'data_transform', 'conditional']),
    serviceId: zod_1.z.string().optional(),
    serviceName: zod_1.z.string(),
    serviceUrl: zod_1.z.string().url().optional(),
    action: zod_1.z.string(),
    params: zod_1.z.record(zod_1.z.unknown()),
    inputMapping: zod_1.z.record(zod_1.z.string()).optional(),
    outputKey: zod_1.z.string(),
    dependencies: zod_1.z.array(zod_1.z.string()),
    parallelizable: zod_1.z.boolean(),
    estimatedCost: zod_1.z.number().min(0),
    estimatedTime: zod_1.z.number().min(0),
    retryPolicy: exports.RetryPolicySchema,
});
exports.ExecutionPlanSchema = zod_1.z.object({
    steps: zod_1.z.array(exports.ExecutionStepSchema),
    dag: zod_1.z.record(zod_1.z.array(zod_1.z.string())),
    criticalPath: zod_1.z.array(zod_1.z.string()),
    parallelGroups: zod_1.z.array(zod_1.z.array(zod_1.z.string())),
    totalEstimatedCost: zod_1.z.number().min(0),
    totalEstimatedTime: zod_1.z.number().min(0),
});
exports.StepResultSchema = zod_1.z.object({
    stepId: zod_1.z.string(),
    success: zod_1.z.boolean(),
    output: zod_1.z.unknown().optional(),
    cost: zod_1.z.number(),
    time: zod_1.z.number(),
    error: zod_1.z.string().optional(),
    paymentSignature: zod_1.z.string().optional(),
    attempts: zod_1.z.number(),
});
exports.WorkflowErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    stepId: zod_1.z.string().optional(),
    timestamp: zod_1.z.number(),
    recoverable: zod_1.z.boolean(),
});
exports.IntentSchema = zod_1.z.object({
    rawInput: zod_1.z.string(),
    classification: zod_1.z.string(),
    entities: zod_1.z.record(zod_1.z.unknown()),
    confidence: zod_1.z.number().min(0).max(1),
    requiredCapabilities: zod_1.z.array(zod_1.z.string()),
});
exports.WorkflowSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    naturalLanguageInput: zod_1.z.string(),
    intent: exports.IntentSchema.optional(),
    executionPlan: exports.ExecutionPlanSchema.optional(),
    status: exports.WorkflowStatusSchema,
    currentStep: zod_1.z.number().optional(),
    stepResults: zod_1.z.record(exports.StepResultSchema).optional(),
    estimatedCost: zod_1.z.number().optional(),
    estimatedTime: zod_1.z.number().optional(),
    totalCost: zod_1.z.number().default(0),
    totalTime: zod_1.z.number().default(0),
    paymentSignatures: zod_1.z.array(zod_1.z.string()),
    createdAt: zod_1.z.date(),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    error: exports.WorkflowErrorSchema.optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.CreateWorkflowRequestSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    input: zod_1.z.string().min(10).max(5000),
    maxCost: zod_1.z.number().min(0).optional(),
    maxTime: zod_1.z.number().min(0).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.WorkflowEventSchema = zod_1.z.object({
    workflowId: zod_1.z.string(),
    type: zod_1.z.enum([
        'workflow.planning',
        'workflow.plan_ready',
        'workflow.awaiting_approval',
        'workflow.approved',
        'workflow.executing',
        'workflow.completed',
        'workflow.failed',
        'workflow.cancelled',
        'step.started',
        'step.progress',
        'step.completed',
        'step.failed',
    ]),
    data: zod_1.z.unknown(),
    timestamp: zod_1.z.number(),
});
//# sourceMappingURL=workflow.js.map