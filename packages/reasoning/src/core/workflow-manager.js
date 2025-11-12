"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowManager = void 0;
const events_1 = require("events");
const ai_planner_js_1 = require("./ai-planner.js");
const service_discovery_js_1 = require("./service-discovery.js");
const execution_engine_js_1 = require("./execution-engine.js");
const payment_orchestrator_js_1 = require("./payment-orchestrator.js");
const escrow_wallet_js_1 = require("./escrow-wallet.js");
const web3_js_1 = require("@solana/web3.js");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
class WorkflowManager extends events_1.EventEmitter {
    planner;
    serviceDiscovery;
    redis;
    workflows;
    escrowManager;
    solanaRpcUrl;
    network;
    constructor(config) {
        super();
        this.planner = new ai_planner_js_1.AITaskPlanner({
            apiKey: config.anthropicApiKey,
            cacheEnabled: true,
            redisUrl: config.redisUrl,
        });
        this.serviceDiscovery = new service_discovery_js_1.ServiceDiscoveryEngine({
            registryUrl: config.registryUrl,
            redisUrl: config.redisUrl,
        });
        this.redis = new ioredis_1.default(config.redisUrl);
        this.workflows = new Map();
        this.solanaRpcUrl = config.solanaRpcUrl;
        this.network = config.network;
        const connection = new web3_js_1.Connection(config.solanaRpcUrl, 'confirmed');
        this.escrowManager = new escrow_wallet_js_1.EscrowWalletManager({
            connection,
            escrowKeypair: config.escrowKeypair,
            redis: this.redis,
        });
    }
    async createWorkflow(request) {
        const workflowId = this.generateWorkflowId();
        const workflow = {
            id: workflowId,
            userId: request.userId,
            naturalLanguageInput: request.input,
            status: 'planning',
            paymentSignatures: [],
            totalCost: 0,
            totalTime: 0,
            createdAt: new Date(),
            metadata: request.metadata,
        };
        this.workflows.set(workflowId, workflow);
        await this.saveWorkflow(workflow);
        this.emitEvent(workflow, 'workflow.planning', {});
        this.planWorkflowAsync(workflow);
        return workflow;
    }
    async planWorkflowAsync(workflow) {
        try {
            const planningResult = await this.planner.planWorkflow(workflow.naturalLanguageInput, workflow.userId);
            workflow.intent = planningResult.intent;
            workflow.executionPlan = planningResult.plan;
            workflow.estimatedCost = planningResult.plan.totalEstimatedCost;
            workflow.estimatedTime = planningResult.plan.totalEstimatedTime;
            const serviceMatches = await this.serviceDiscovery.matchAllSteps(planningResult.plan.steps);
            for (const [stepId, match] of serviceMatches.entries()) {
                const step = planningResult.plan.steps.find((s) => s.id === stepId);
                if (step) {
                    step.serviceId = match.service.id;
                    step.serviceName = match.service.name;
                    step.serviceUrl = match.service.url;
                }
            }
            workflow.status = 'awaiting_approval';
            await this.saveWorkflow(workflow);
            this.emitEvent(workflow, 'workflow.plan_ready', {
                plan: workflow.executionPlan,
                estimatedCost: workflow.estimatedCost,
                estimatedTime: workflow.estimatedTime,
            });
            this.emitEvent(workflow, 'workflow.awaiting_approval', {});
        }
        catch (error) {
            workflow.status = 'failed';
            workflow.error = {
                code: 'PLANNING_FAILED',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now(),
                recoverable: false,
            };
            await this.saveWorkflow(workflow);
            this.emitEvent(workflow, 'workflow.failed', { error: workflow.error });
        }
    }
    async approveWorkflow(workflowId) {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
            return { success: false, message: 'Workflow not found' };
        }
        if (workflow.status !== 'awaiting_approval') {
            return { success: false, message: 'Workflow not in awaiting_approval state' };
        }
        if (!workflow.executionPlan) {
            return { success: false, message: 'No execution plan available' };
        }
        const balance = await this.escrowManager.getBalance(workflow.userId);
        const estimatedCost = workflow.estimatedCost || 0;
        if (balance < estimatedCost) {
            return {
                success: false,
                message: `Insufficient escrow balance. Available: ${balance}, Required: ${estimatedCost}. Please top up.`,
            };
        }
        workflow.status = 'approved';
        workflow.startedAt = new Date();
        await this.saveWorkflow(workflow);
        this.emitEvent(workflow, 'workflow.approved', {});
        this.executeWorkflowAsync(workflow);
        return { success: true };
    }
    async executeWorkflowAsync(workflow) {
        if (!workflow.executionPlan) {
            return;
        }
        try {
            const paymentOrchestrator = new payment_orchestrator_js_1.PaymentOrchestrator({
                network: this.network,
                rpcUrl: this.solanaRpcUrl,
                escrowManager: this.escrowManager,
                userId: workflow.userId,
            });
            const executionEngine = new execution_engine_js_1.ExecutionEngine(paymentOrchestrator, this.serviceDiscovery, this.redis.options.host || 'localhost:6379', {
                maxConcurrentSteps: 5,
                enableRetry: true,
                enableRollback: true,
                timeout: 300000,
            });
            executionEngine.on('event', (event) => {
                this.emit('workflow-event', event);
            });
            const result = await executionEngine.execute(workflow.id, workflow.executionPlan);
            workflow.status = result.status;
            workflow.stepResults = Object.fromEntries(result.stepResults);
            workflow.totalCost = result.totalCost;
            workflow.totalTime = result.totalTime;
            workflow.completedAt = new Date();
            if (!result.success) {
                workflow.error = {
                    code: 'EXECUTION_FAILED',
                    message: result.error || 'Unknown error',
                    timestamp: Date.now(),
                    recoverable: false,
                };
            }
            await this.saveWorkflow(workflow);
            await executionEngine.disconnect();
        }
        catch (error) {
            workflow.status = 'failed';
            workflow.error = {
                code: 'EXECUTION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now(),
                recoverable: false,
            };
            await this.saveWorkflow(workflow);
        }
    }
    async getWorkflow(workflowId) {
        const cached = this.workflows.get(workflowId);
        if (cached) {
            return cached;
        }
        const stored = await this.redis.get(`workflow:${workflowId}`);
        if (!stored) {
            return null;
        }
        const workflow = JSON.parse(stored);
        workflow.createdAt = new Date(workflow.createdAt);
        if (workflow.startedAt)
            workflow.startedAt = new Date(workflow.startedAt);
        if (workflow.completedAt)
            workflow.completedAt = new Date(workflow.completedAt);
        this.workflows.set(workflowId, workflow);
        return workflow;
    }
    async getUserWorkflows(userId, limit = 50) {
        const workflowIds = await this.redis.lrange(`user:${userId}:workflows`, 0, limit - 1);
        const workflows = [];
        for (const id of workflowIds) {
            const workflow = await this.getWorkflow(id);
            if (workflow) {
                workflows.push(workflow);
            }
        }
        return workflows;
    }
    async cancelWorkflow(workflowId) {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
            return false;
        }
        if (workflow.status === 'completed' || workflow.status === 'failed') {
            return false;
        }
        workflow.status = 'cancelled';
        workflow.completedAt = new Date();
        await this.saveWorkflow(workflow);
        this.emitEvent(workflow, 'workflow.cancelled', {});
        return true;
    }
    async saveWorkflow(workflow) {
        await this.redis.setex(`workflow:${workflow.id}`, 86400, JSON.stringify(workflow));
        await this.redis.lpush(`user:${workflow.userId}:workflows`, workflow.id);
        await this.redis.ltrim(`user:${workflow.userId}:workflows`, 0, 99);
        this.workflows.set(workflow.id, workflow);
    }
    generateWorkflowId() {
        return `wf_${Date.now()}_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
    }
    emitEvent(workflow, type, data) {
        const event = {
            workflowId: workflow.id,
            type: type,
            data,
            timestamp: Date.now(),
        };
        this.emit('workflow-event', event);
        this.redis.publish(`workflow:${workflow.id}:events`, JSON.stringify(event));
    }
    async subscribeToWorkflow(workflowId, callback) {
        const subscriber = new ioredis_1.default(this.redis.options);
        await subscriber.subscribe(`workflow:${workflowId}:events`);
        subscriber.on('message', (channel, message) => {
            if (channel === `workflow:${workflowId}:events`) {
                try {
                    const event = JSON.parse(message);
                    callback(event);
                }
                catch (error) {
                    console.error('Failed to parse workflow event:', error);
                }
            }
        });
    }
    async disconnect() {
        await this.planner.disconnect();
        await this.serviceDiscovery.disconnect();
        await this.redis.quit();
    }
    getEscrowManager() {
        return this.escrowManager;
    }
}
exports.WorkflowManager = WorkflowManager;
//# sourceMappingURL=workflow-manager.js.map