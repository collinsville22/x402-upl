import { EventEmitter } from 'events';
import {
  Workflow,
  WorkflowStatus,
  CreateWorkflowRequest,
  ExecutionPlan,
  WorkflowEvent,
} from '../types/workflow.js';
import { AITaskPlanner } from './ai-planner.js';
import { ServiceDiscoveryEngine } from './service-discovery.js';
import { ExecutionEngine } from './execution-engine.js';
import { PaymentOrchestrator } from './payment-orchestrator.js';
import { EscrowWalletManager } from './escrow-wallet.js';
import { Connection, Keypair } from '@solana/web3.js';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

export interface WorkflowManagerConfig {
  redisUrl: string;
  anthropicApiKey: string;
  registryUrl: string;
  solanaRpcUrl: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  escrowKeypair: Keypair;
}

export class WorkflowManager extends EventEmitter {
  private planner: AITaskPlanner;
  private serviceDiscovery: ServiceDiscoveryEngine;
  private redis: Redis;
  private workflows: Map<string, Workflow>;
  private escrowManager: EscrowWalletManager;
  private solanaRpcUrl: string;
  private network: 'mainnet-beta' | 'devnet' | 'testnet';

  constructor(config: WorkflowManagerConfig) {
    super();

    this.planner = new AITaskPlanner({
      apiKey: config.anthropicApiKey,
      cacheEnabled: true,
      redisUrl: config.redisUrl,
    });

    this.serviceDiscovery = new ServiceDiscoveryEngine({
      registryUrl: config.registryUrl,
      redisUrl: config.redisUrl,
    });

    this.redis = new Redis(config.redisUrl);
    this.workflows = new Map();
    this.solanaRpcUrl = config.solanaRpcUrl;
    this.network = config.network;

    const connection = new Connection(config.solanaRpcUrl, 'confirmed');
    this.escrowManager = new EscrowWalletManager({
      connection,
      escrowKeypair: config.escrowKeypair,
      redis: this.redis,
    });
  }

  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    const workflowId = this.generateWorkflowId();

    const workflow: Workflow = {
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

  private async planWorkflowAsync(workflow: Workflow): Promise<void> {
    try {
      const planningResult = await this.planner.planWorkflow(
        workflow.naturalLanguageInput,
        workflow.userId
      );

      workflow.intent = planningResult.intent;
      workflow.executionPlan = planningResult.plan;
      workflow.estimatedCost = planningResult.plan.totalEstimatedCost;
      workflow.estimatedTime = planningResult.plan.totalEstimatedTime;

      const serviceMatches = await this.serviceDiscovery.matchAllSteps(
        planningResult.plan.steps
      );

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
    } catch (error) {
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

  async approveWorkflow(
    workflowId: string
  ): Promise<{ success: boolean; message?: string }> {
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

  private async executeWorkflowAsync(workflow: Workflow): Promise<void> {
    if (!workflow.executionPlan) {
      return;
    }

    try {
      const paymentOrchestrator = new PaymentOrchestrator({
        network: this.network,
        rpcUrl: this.solanaRpcUrl,
        escrowManager: this.escrowManager,
        userId: workflow.userId,
      });

      const executionEngine = new ExecutionEngine(
        paymentOrchestrator,
        this.serviceDiscovery,
        this.redis.options.host || 'localhost:6379',
        {
          maxConcurrentSteps: 5,
          enableRetry: true,
          enableRollback: true,
          timeout: 300000,
        }
      );

      executionEngine.on('event', (event: WorkflowEvent) => {
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
    } catch (error) {
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

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const cached = this.workflows.get(workflowId);
    if (cached) {
      return cached;
    }

    const stored = await this.redis.get(`workflow:${workflowId}`);
    if (!stored) {
      return null;
    }

    const workflow = JSON.parse(stored) as Workflow;
    workflow.createdAt = new Date(workflow.createdAt);
    if (workflow.startedAt) workflow.startedAt = new Date(workflow.startedAt);
    if (workflow.completedAt) workflow.completedAt = new Date(workflow.completedAt);

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  async getUserWorkflows(userId: string, limit: number = 50): Promise<Workflow[]> {
    const workflowIds = await this.redis.lrange(`user:${userId}:workflows`, 0, limit - 1);

    const workflows: Workflow[] = [];
    for (const id of workflowIds) {
      const workflow = await this.getWorkflow(id);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    return workflows;
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
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

  private async saveWorkflow(workflow: Workflow): Promise<void> {
    await this.redis.setex(`workflow:${workflow.id}`, 86400, JSON.stringify(workflow));

    await this.redis.lpush(`user:${workflow.userId}:workflows`, workflow.id);

    await this.redis.ltrim(`user:${workflow.userId}:workflows`, 0, 99);

    this.workflows.set(workflow.id, workflow);
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private emitEvent(workflow: Workflow, type: string, data: unknown): void {
    const event: WorkflowEvent = {
      workflowId: workflow.id,
      type: type as any,
      data,
      timestamp: Date.now(),
    };

    this.emit('workflow-event', event);

    this.redis.publish(`workflow:${workflow.id}:events`, JSON.stringify(event));
  }

  async subscribeToWorkflow(workflowId: string, callback: (event: WorkflowEvent) => void): Promise<void> {
    const subscriber = new Redis(this.redis.options);

    await subscriber.subscribe(`workflow:${workflowId}:events`);

    subscriber.on('message', (channel, message) => {
      if (channel === `workflow:${workflowId}:events`) {
        try {
          const event = JSON.parse(message) as WorkflowEvent;
          callback(event);
        } catch (error) {
          console.error('Failed to parse workflow event:', error);
        }
      }
    });
  }

  async disconnect(): Promise<void> {
    await this.planner.disconnect();
    await this.serviceDiscovery.disconnect();
    await this.redis.quit();
  }

  getEscrowManager(): EscrowWalletManager {
    return this.escrowManager;
  }
}
