import { z } from 'zod';

export const WorkflowStatusSchema = z.enum([
  'planning',
  'awaiting_approval',
  'approved',
  'executing',
  'completed',
  'failed',
  'cancelled',
  'rolling_back',
]);

export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffMultiplier: z.number().min(1).max(10).default(2),
  initialDelayMs: z.number().min(100).max(10000).default(1000),
  maxDelayMs: z.number().min(1000).max(60000).default(30000),
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const ExecutionStepSchema = z.object({
  id: z.string(),
  type: z.enum(['service_call', 'data_transform', 'conditional']),

  serviceId: z.string().optional(),
  serviceName: z.string(),
  serviceUrl: z.string().url().optional(),

  action: z.string(),
  params: z.record(z.unknown()),
  inputMapping: z.record(z.string()).optional(),
  outputKey: z.string(),

  dependencies: z.array(z.string()),
  parallelizable: z.boolean(),

  estimatedCost: z.number().min(0),
  estimatedTime: z.number().min(0),

  retryPolicy: RetryPolicySchema,
});

export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

export const ExecutionPlanSchema = z.object({
  steps: z.array(ExecutionStepSchema),
  dag: z.record(z.array(z.string())),
  criticalPath: z.array(z.string()),
  parallelGroups: z.array(z.array(z.string())),
  totalEstimatedCost: z.number().min(0),
  totalEstimatedTime: z.number().min(0),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const StepResultSchema = z.object({
  stepId: z.string(),
  success: z.boolean(),
  output: z.unknown().optional(),
  cost: z.number(),
  time: z.number(),
  error: z.string().optional(),
  paymentSignature: z.string().optional(),
  attempts: z.number(),
});

export type StepResult = z.infer<typeof StepResultSchema>;

export const WorkflowErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  stepId: z.string().optional(),
  timestamp: z.number(),
  recoverable: z.boolean(),
});

export type WorkflowError = z.infer<typeof WorkflowErrorSchema>;

export const IntentSchema = z.object({
  rawInput: z.string(),
  classification: z.string(),
  entities: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  requiredCapabilities: z.array(z.string()),
});

export type Intent = z.infer<typeof IntentSchema>;

export const WorkflowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  naturalLanguageInput: z.string(),

  intent: IntentSchema.optional(),
  executionPlan: ExecutionPlanSchema.optional(),

  status: WorkflowStatusSchema,
  currentStep: z.number().optional(),
  stepResults: z.record(StepResultSchema).optional(),

  estimatedCost: z.number().optional(),
  estimatedTime: z.number().optional(),
  totalCost: z.number().default(0),
  totalTime: z.number().default(0),

  paymentSignatures: z.array(z.string()),

  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: WorkflowErrorSchema.optional(),

  metadata: z.record(z.unknown()).optional(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

export const CreateWorkflowRequestSchema = z.object({
  userId: z.string(),
  input: z.string().min(10).max(5000),
  maxCost: z.number().min(0).optional(),
  maxTime: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;

export const WorkflowEventSchema = z.object({
  workflowId: z.string(),
  type: z.enum([
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
  data: z.unknown(),
  timestamp: z.number(),
});

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
