import { z } from 'zod';
export declare const WorkflowStatusSchema: z.ZodEnum<["planning", "awaiting_approval", "approved", "executing", "completed", "failed", "cancelled", "rolling_back"]>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export declare const RetryPolicySchema: z.ZodObject<{
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    backoffMultiplier: z.ZodDefault<z.ZodNumber>;
    initialDelayMs: z.ZodDefault<z.ZodNumber>;
    maxDelayMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelayMs: number;
    maxDelayMs: number;
}, {
    maxAttempts?: number | undefined;
    backoffMultiplier?: number | undefined;
    initialDelayMs?: number | undefined;
    maxDelayMs?: number | undefined;
}>;
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
export declare const ExecutionStepSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["service_call", "data_transform", "conditional"]>;
    serviceId: z.ZodOptional<z.ZodString>;
    serviceName: z.ZodString;
    serviceUrl: z.ZodOptional<z.ZodString>;
    action: z.ZodString;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    inputMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    outputKey: z.ZodString;
    dependencies: z.ZodArray<z.ZodString, "many">;
    parallelizable: z.ZodBoolean;
    estimatedCost: z.ZodNumber;
    estimatedTime: z.ZodNumber;
    retryPolicy: z.ZodObject<{
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        backoffMultiplier: z.ZodDefault<z.ZodNumber>;
        initialDelayMs: z.ZodDefault<z.ZodNumber>;
        maxDelayMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxAttempts: number;
        backoffMultiplier: number;
        initialDelayMs: number;
        maxDelayMs: number;
    }, {
        maxAttempts?: number | undefined;
        backoffMultiplier?: number | undefined;
        initialDelayMs?: number | undefined;
        maxDelayMs?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "service_call" | "data_transform" | "conditional";
    dependencies: string[];
    serviceName: string;
    id: string;
    params: Record<string, unknown>;
    action: string;
    outputKey: string;
    parallelizable: boolean;
    estimatedCost: number;
    estimatedTime: number;
    retryPolicy: {
        maxAttempts: number;
        backoffMultiplier: number;
        initialDelayMs: number;
        maxDelayMs: number;
    };
    serviceUrl?: string | undefined;
    serviceId?: string | undefined;
    inputMapping?: Record<string, string> | undefined;
}, {
    type: "service_call" | "data_transform" | "conditional";
    dependencies: string[];
    serviceName: string;
    id: string;
    params: Record<string, unknown>;
    action: string;
    outputKey: string;
    parallelizable: boolean;
    estimatedCost: number;
    estimatedTime: number;
    retryPolicy: {
        maxAttempts?: number | undefined;
        backoffMultiplier?: number | undefined;
        initialDelayMs?: number | undefined;
        maxDelayMs?: number | undefined;
    };
    serviceUrl?: string | undefined;
    serviceId?: string | undefined;
    inputMapping?: Record<string, string> | undefined;
}>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
export declare const ExecutionPlanSchema: z.ZodObject<{
    steps: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["service_call", "data_transform", "conditional"]>;
        serviceId: z.ZodOptional<z.ZodString>;
        serviceName: z.ZodString;
        serviceUrl: z.ZodOptional<z.ZodString>;
        action: z.ZodString;
        params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        inputMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        outputKey: z.ZodString;
        dependencies: z.ZodArray<z.ZodString, "many">;
        parallelizable: z.ZodBoolean;
        estimatedCost: z.ZodNumber;
        estimatedTime: z.ZodNumber;
        retryPolicy: z.ZodObject<{
            maxAttempts: z.ZodDefault<z.ZodNumber>;
            backoffMultiplier: z.ZodDefault<z.ZodNumber>;
            initialDelayMs: z.ZodDefault<z.ZodNumber>;
            maxDelayMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxAttempts: number;
            backoffMultiplier: number;
            initialDelayMs: number;
            maxDelayMs: number;
        }, {
            maxAttempts?: number | undefined;
            backoffMultiplier?: number | undefined;
            initialDelayMs?: number | undefined;
            maxDelayMs?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "service_call" | "data_transform" | "conditional";
        dependencies: string[];
        serviceName: string;
        id: string;
        params: Record<string, unknown>;
        action: string;
        outputKey: string;
        parallelizable: boolean;
        estimatedCost: number;
        estimatedTime: number;
        retryPolicy: {
            maxAttempts: number;
            backoffMultiplier: number;
            initialDelayMs: number;
            maxDelayMs: number;
        };
        serviceUrl?: string | undefined;
        serviceId?: string | undefined;
        inputMapping?: Record<string, string> | undefined;
    }, {
        type: "service_call" | "data_transform" | "conditional";
        dependencies: string[];
        serviceName: string;
        id: string;
        params: Record<string, unknown>;
        action: string;
        outputKey: string;
        parallelizable: boolean;
        estimatedCost: number;
        estimatedTime: number;
        retryPolicy: {
            maxAttempts?: number | undefined;
            backoffMultiplier?: number | undefined;
            initialDelayMs?: number | undefined;
            maxDelayMs?: number | undefined;
        };
        serviceUrl?: string | undefined;
        serviceId?: string | undefined;
        inputMapping?: Record<string, string> | undefined;
    }>, "many">;
    dag: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
    criticalPath: z.ZodArray<z.ZodString, "many">;
    parallelGroups: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
    totalEstimatedCost: z.ZodNumber;
    totalEstimatedTime: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    steps: {
        type: "service_call" | "data_transform" | "conditional";
        dependencies: string[];
        serviceName: string;
        id: string;
        params: Record<string, unknown>;
        action: string;
        outputKey: string;
        parallelizable: boolean;
        estimatedCost: number;
        estimatedTime: number;
        retryPolicy: {
            maxAttempts: number;
            backoffMultiplier: number;
            initialDelayMs: number;
            maxDelayMs: number;
        };
        serviceUrl?: string | undefined;
        serviceId?: string | undefined;
        inputMapping?: Record<string, string> | undefined;
    }[];
    dag: Record<string, string[]>;
    criticalPath: string[];
    parallelGroups: string[][];
    totalEstimatedCost: number;
    totalEstimatedTime: number;
}, {
    steps: {
        type: "service_call" | "data_transform" | "conditional";
        dependencies: string[];
        serviceName: string;
        id: string;
        params: Record<string, unknown>;
        action: string;
        outputKey: string;
        parallelizable: boolean;
        estimatedCost: number;
        estimatedTime: number;
        retryPolicy: {
            maxAttempts?: number | undefined;
            backoffMultiplier?: number | undefined;
            initialDelayMs?: number | undefined;
            maxDelayMs?: number | undefined;
        };
        serviceUrl?: string | undefined;
        serviceId?: string | undefined;
        inputMapping?: Record<string, string> | undefined;
    }[];
    dag: Record<string, string[]>;
    criticalPath: string[];
    parallelGroups: string[][];
    totalEstimatedCost: number;
    totalEstimatedTime: number;
}>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export declare const StepResultSchema: z.ZodObject<{
    stepId: z.ZodString;
    success: z.ZodBoolean;
    output: z.ZodOptional<z.ZodUnknown>;
    cost: z.ZodNumber;
    time: z.ZodNumber;
    error: z.ZodOptional<z.ZodString>;
    paymentSignature: z.ZodOptional<z.ZodString>;
    attempts: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    time: number;
    stepId: string;
    cost: number;
    attempts: number;
    error?: string | undefined;
    output?: unknown;
    paymentSignature?: string | undefined;
}, {
    success: boolean;
    time: number;
    stepId: string;
    cost: number;
    attempts: number;
    error?: string | undefined;
    output?: unknown;
    paymentSignature?: string | undefined;
}>;
export type StepResult = z.infer<typeof StepResultSchema>;
export declare const WorkflowErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    stepId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodNumber;
    recoverable: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    message: string;
    code: string;
    timestamp: number;
    recoverable: boolean;
    stepId?: string | undefined;
}, {
    message: string;
    code: string;
    timestamp: number;
    recoverable: boolean;
    stepId?: string | undefined;
}>;
export type WorkflowError = z.infer<typeof WorkflowErrorSchema>;
export declare const IntentSchema: z.ZodObject<{
    rawInput: z.ZodString;
    classification: z.ZodString;
    entities: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    confidence: z.ZodNumber;
    requiredCapabilities: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    rawInput: string;
    classification: string;
    entities: Record<string, unknown>;
    requiredCapabilities: string[];
}, {
    confidence: number;
    rawInput: string;
    classification: string;
    entities: Record<string, unknown>;
    requiredCapabilities: string[];
}>;
export type Intent = z.infer<typeof IntentSchema>;
export declare const WorkflowSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    naturalLanguageInput: z.ZodString;
    intent: z.ZodOptional<z.ZodObject<{
        rawInput: z.ZodString;
        classification: z.ZodString;
        entities: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        confidence: z.ZodNumber;
        requiredCapabilities: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        rawInput: string;
        classification: string;
        entities: Record<string, unknown>;
        requiredCapabilities: string[];
    }, {
        confidence: number;
        rawInput: string;
        classification: string;
        entities: Record<string, unknown>;
        requiredCapabilities: string[];
    }>>;
    executionPlan: z.ZodOptional<z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["service_call", "data_transform", "conditional"]>;
            serviceId: z.ZodOptional<z.ZodString>;
            serviceName: z.ZodString;
            serviceUrl: z.ZodOptional<z.ZodString>;
            action: z.ZodString;
            params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            inputMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            outputKey: z.ZodString;
            dependencies: z.ZodArray<z.ZodString, "many">;
            parallelizable: z.ZodBoolean;
            estimatedCost: z.ZodNumber;
            estimatedTime: z.ZodNumber;
            retryPolicy: z.ZodObject<{
                maxAttempts: z.ZodDefault<z.ZodNumber>;
                backoffMultiplier: z.ZodDefault<z.ZodNumber>;
                initialDelayMs: z.ZodDefault<z.ZodNumber>;
                maxDelayMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                maxAttempts: number;
                backoffMultiplier: number;
                initialDelayMs: number;
                maxDelayMs: number;
            }, {
                maxAttempts?: number | undefined;
                backoffMultiplier?: number | undefined;
                initialDelayMs?: number | undefined;
                maxDelayMs?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "service_call" | "data_transform" | "conditional";
            dependencies: string[];
            serviceName: string;
            id: string;
            params: Record<string, unknown>;
            action: string;
            outputKey: string;
            parallelizable: boolean;
            estimatedCost: number;
            estimatedTime: number;
            retryPolicy: {
                maxAttempts: number;
                backoffMultiplier: number;
                initialDelayMs: number;
                maxDelayMs: number;
            };
            serviceUrl?: string | undefined;
            serviceId?: string | undefined;
            inputMapping?: Record<string, string> | undefined;
        }, {
            type: "service_call" | "data_transform" | "conditional";
            dependencies: string[];
            serviceName: string;
            id: string;
            params: Record<string, unknown>;
            action: string;
            outputKey: string;
            parallelizable: boolean;
            estimatedCost: number;
            estimatedTime: number;
            retryPolicy: {
                maxAttempts?: number | undefined;
                backoffMultiplier?: number | undefined;
                initialDelayMs?: number | undefined;
                maxDelayMs?: number | undefined;
            };
            serviceUrl?: string | undefined;
            serviceId?: string | undefined;
            inputMapping?: Record<string, string> | undefined;
        }>, "many">;
        dag: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
        criticalPath: z.ZodArray<z.ZodString, "many">;
        parallelGroups: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
        totalEstimatedCost: z.ZodNumber;
        totalEstimatedTime: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        steps: {
            type: "service_call" | "data_transform" | "conditional";
            dependencies: string[];
            serviceName: string;
            id: string;
            params: Record<string, unknown>;
            action: string;
            outputKey: string;
            parallelizable: boolean;
            estimatedCost: number;
            estimatedTime: number;
            retryPolicy: {
                maxAttempts: number;
                backoffMultiplier: number;
                initialDelayMs: number;
                maxDelayMs: number;
            };
            serviceUrl?: string | undefined;
            serviceId?: string | undefined;
            inputMapping?: Record<string, string> | undefined;
        }[];
        dag: Record<string, string[]>;
        criticalPath: string[];
        parallelGroups: string[][];
        totalEstimatedCost: number;
        totalEstimatedTime: number;
    }, {
        steps: {
            type: "service_call" | "data_transform" | "conditional";
            dependencies: string[];
            serviceName: string;
            id: string;
            params: Record<string, unknown>;
            action: string;
            outputKey: string;
            parallelizable: boolean;
            estimatedCost: number;
            estimatedTime: number;
            retryPolicy: {
                maxAttempts?: number | undefined;
                backoffMultiplier?: number | undefined;
                initialDelayMs?: number | undefined;
                maxDelayMs?: number | undefined;
            };
            serviceUrl?: string | undefined;
            serviceId?: string | undefined;
            inputMapping?: Record<string, string> | undefined;
        }[];
        dag: Record<string, string[]>;
        criticalPath: string[];
        parallelGroups: string[][];
        totalEstimatedCost: number;
        totalEstimatedTime: number;
    }>>;
    status: z.ZodEnum<["planning", "awaiting_approval", "approved", "executing", "completed", "failed", "cancelled", "rolling_back"]>;
    currentStep: z.ZodOptional<z.ZodNumber>;
    stepResults: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        stepId: z.ZodString;
        success: z.ZodBoolean;
        output: z.ZodOptional<z.ZodUnknown>;
        cost: z.ZodNumber;
        time: z.ZodNumber;
        error: z.ZodOptional<z.ZodString>;
        paymentSignature: z.ZodOptional<z.ZodString>;
        attempts: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        time: number;
        stepId: string;
        cost: number;
        attempts: number;
        error?: string | undefined;
        output?: unknown;
        paymentSignature?: string | undefined;
    }, {
        success: boolean;
        time: number;
        stepId: string;
        cost: number;
        attempts: number;
        error?: string | undefined;
        output?: unknown;
        paymentSignature?: string | undefined;
    }>>>;
    estimatedCost: z.ZodOptional<z.ZodNumber>;
    estimatedTime: z.ZodOptional<z.ZodNumber>;
    totalCost: z.ZodDefault<z.ZodNumber>;
    totalTime: z.ZodDefault<z.ZodNumber>;
    paymentSignatures: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodDate;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        stepId: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodNumber;
        recoverable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        timestamp: number;
        recoverable: boolean;
        stepId?: string | undefined;
    }, {
        message: string;
        code: string;
        timestamp: number;
        recoverable: boolean;
        stepId?: string | undefined;
    }>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "completed" | "planning" | "awaiting_approval" | "executing" | "approved" | "cancelled" | "rolling_back";
    id: string;
    naturalLanguageInput: string;
    userId: string;
    createdAt: Date;
    totalCost: number;
    totalTime: number;
    paymentSignatures: string[];
    error?: {
        message: string;
        code: string;
        timestamp: number;
        recoverable: boolean;
        stepId?: string | undefined;
    } | undefined;
    metadata?: Record<string, unknown> | undefined;
    executionPlan?: {
        steps: {
            type: "service_call" | "data_transform" | "conditional";
            dependencies: string[];
            serviceName: string;
            id: string;
            params: Record<string, unknown>;
            action: string;
            outputKey: string;
            parallelizable: boolean;
            estimatedCost: number;
            estimatedTime: number;
            retryPolicy: {
                maxAttempts: number;
                backoffMultiplier: number;
                initialDelayMs: number;
                maxDelayMs: number;
            };
            serviceUrl?: string | undefined;
            serviceId?: string | undefined;
            inputMapping?: Record<string, string> | undefined;
        }[];
        dag: Record<string, string[]>;
        criticalPath: string[];
        parallelGroups: string[][];
        totalEstimatedCost: number;
        totalEstimatedTime: number;
    } | undefined;
    completedAt?: Date | undefined;
    estimatedCost?: number | undefined;
    estimatedTime?: number | undefined;
    intent?: {
        confidence: number;
        rawInput: string;
        classification: string;
        entities: Record<string, unknown>;
        requiredCapabilities: string[];
    } | undefined;
    currentStep?: number | undefined;
    stepResults?: Record<string, {
        success: boolean;
        time: number;
        stepId: string;
        cost: number;
        attempts: number;
        error?: string | undefined;
        output?: unknown;
        paymentSignature?: string | undefined;
    }> | undefined;
    startedAt?: Date | undefined;
}, {
    status: "failed" | "completed" | "planning" | "awaiting_approval" | "executing" | "approved" | "cancelled" | "rolling_back";
    id: string;
    naturalLanguageInput: string;
    userId: string;
    createdAt: Date;
    paymentSignatures: string[];
    error?: {
        message: string;
        code: string;
        timestamp: number;
        recoverable: boolean;
        stepId?: string | undefined;
    } | undefined;
    metadata?: Record<string, unknown> | undefined;
    executionPlan?: {
        steps: {
            type: "service_call" | "data_transform" | "conditional";
            dependencies: string[];
            serviceName: string;
            id: string;
            params: Record<string, unknown>;
            action: string;
            outputKey: string;
            parallelizable: boolean;
            estimatedCost: number;
            estimatedTime: number;
            retryPolicy: {
                maxAttempts?: number | undefined;
                backoffMultiplier?: number | undefined;
                initialDelayMs?: number | undefined;
                maxDelayMs?: number | undefined;
            };
            serviceUrl?: string | undefined;
            serviceId?: string | undefined;
            inputMapping?: Record<string, string> | undefined;
        }[];
        dag: Record<string, string[]>;
        criticalPath: string[];
        parallelGroups: string[][];
        totalEstimatedCost: number;
        totalEstimatedTime: number;
    } | undefined;
    completedAt?: Date | undefined;
    totalCost?: number | undefined;
    totalTime?: number | undefined;
    estimatedCost?: number | undefined;
    estimatedTime?: number | undefined;
    intent?: {
        confidence: number;
        rawInput: string;
        classification: string;
        entities: Record<string, unknown>;
        requiredCapabilities: string[];
    } | undefined;
    currentStep?: number | undefined;
    stepResults?: Record<string, {
        success: boolean;
        time: number;
        stepId: string;
        cost: number;
        attempts: number;
        error?: string | undefined;
        output?: unknown;
        paymentSignature?: string | undefined;
    }> | undefined;
    startedAt?: Date | undefined;
}>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export declare const CreateWorkflowRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    input: z.ZodString;
    maxCost: z.ZodOptional<z.ZodNumber>;
    maxTime: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    input: string;
    userId: string;
    metadata?: Record<string, unknown> | undefined;
    maxTime?: number | undefined;
    maxCost?: number | undefined;
}, {
    input: string;
    userId: string;
    metadata?: Record<string, unknown> | undefined;
    maxTime?: number | undefined;
    maxCost?: number | undefined;
}>;
export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;
export declare const WorkflowEventSchema: z.ZodObject<{
    workflowId: z.ZodString;
    type: z.ZodEnum<["workflow.planning", "workflow.plan_ready", "workflow.awaiting_approval", "workflow.approved", "workflow.executing", "workflow.completed", "workflow.failed", "workflow.cancelled", "step.started", "step.progress", "step.completed", "step.failed"]>;
    data: z.ZodUnknown;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "workflow.planning" | "workflow.awaiting_approval" | "workflow.approved" | "workflow.executing" | "workflow.completed" | "workflow.failed" | "step.started" | "step.completed" | "step.failed" | "workflow.plan_ready" | "workflow.cancelled" | "step.progress";
    timestamp: number;
    workflowId: string;
    data?: unknown;
}, {
    type: "workflow.planning" | "workflow.awaiting_approval" | "workflow.approved" | "workflow.executing" | "workflow.completed" | "workflow.failed" | "step.started" | "step.completed" | "step.failed" | "workflow.plan_ready" | "workflow.cancelled" | "step.progress";
    timestamp: number;
    workflowId: string;
    data?: unknown;
}>;
export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
//# sourceMappingURL=workflow.d.ts.map