import { Keypair } from '@solana/web3.js';
import { PhantomCashX402Client } from './phantom-cash-x402-client.js';
import { X402Handler } from './x402-handler.js';
import { ServiceRegistry, X402Service } from './service-registry.js';
import { AgentBrain, AgentTask, ServiceChainPlan } from './agent-brain.js';
import { ExecutionEngine, ExecutionResult } from './execution-engine.js';

export interface PhantomAgentConfig {
  wallet: Keypair;
  openaiApiKey: string;
  network?: 'devnet' | 'mainnet-beta';
  rpcUrl?: string;
  spendingLimitPerHour?: number;
  llmModel?: string;
  registryUrl?: string;
}

export interface AgentExecutionReport {
  task: AgentTask;
  plan: ServiceChainPlan;
  execution: ExecutionResult;
  analysis: string;
  timestamp: number;
  walletAddress: string;
  initialCashBalance: number;
  finalCashBalance: number;
  initialSolBalance: number;
  finalSolBalance: number;
}

export class PhantomAgent {
  private cashClient: PhantomCashX402Client;
  private x402Handler: X402Handler;
  private registry: ServiceRegistry;
  private brain: AgentBrain;
  private engine: ExecutionEngine;

  constructor(config: PhantomAgentConfig) {
    this.cashClient = new PhantomCashX402Client({
      wallet: config.wallet,
      network: config.network || 'mainnet-beta',
      rpcUrl: config.rpcUrl,
      spendingLimitPerHour: config.spendingLimitPerHour,
    });

    this.x402Handler = new X402Handler(this.cashClient);
    this.registry = new ServiceRegistry(config.registryUrl);

    this.brain = new AgentBrain(
      config.openaiApiKey,
      this.registry,
      config.llmModel || 'gpt-4'
    );

    this.engine = new ExecutionEngine(this.x402Handler, this.registry);
  }

  async getWalletAddress(): Promise<string> {
    return await this.cashClient.getWalletAddress();
  }

  async getSolBalance(): Promise<number> {
    return await this.cashClient.getSolBalance();
  }

  async getCashBalance(): Promise<number> {
    return await this.cashClient.getCashBalance();
  }

  getMetrics() {
    return this.cashClient.getMetrics();
  }

  getSpentThisHour(): number {
    return this.cashClient.getSpentThisHour();
  }

  getRemainingHourlyBudget(): number {
    return this.cashClient.getRemainingHourlyBudget();
  }

  registerService(service: X402Service): void {
    this.registry.registerService(service);
  }

  async listServices(): Promise<X402Service[]> {
    return this.registry.listServices();
  }

  async searchServices(query: string): Promise<X402Service[]> {
    return this.registry.searchServices(query);
  }

  async findServicesByCategory(category: string): Promise<X402Service[]> {
    return this.registry.findServicesByCategory(category);
  }

  async executeTask(task: AgentTask): Promise<AgentExecutionReport> {
    const initialCashBalance = await this.getCashBalance();
    const initialSolBalance = await this.getSolBalance();

    if (initialCashBalance < task.maxBudget) {
      throw new Error(
        `Insufficient CASH balance: ${initialCashBalance.toFixed(6)} < ${task.maxBudget.toFixed(6)}`
      );
    }

    const plan = await this.brain.planServiceChain(task);

    const optimizedPlan = await this.brain.optimizePlan(plan);

    const execution = await this.engine.execute(optimizedPlan, {
      maxBudget: task.maxBudget,
    });

    const results = execution.steps.map(step => ({
      step: step.stepNumber,
      result: step.data,
      cost: step.cost,
    }));

    const analysis = await this.brain.analyzeResults(
      task,
      optimizedPlan,
      results
    );

    const finalCashBalance = await this.getCashBalance();
    const finalSolBalance = await this.getSolBalance();

    return {
      task,
      plan: optimizedPlan,
      execution,
      analysis,
      timestamp: Date.now(),
      walletAddress: await this.getWalletAddress(),
      initialCashBalance,
      finalCashBalance,
      initialSolBalance,
      finalSolBalance,
    };
  }

  getPaymentHistory() {
    return this.x402Handler.getPaymentHistory();
  }

  getTotalSpent(): number {
    return this.x402Handler.getTotalSpent();
  }

  async verifyTransaction(signature: string): Promise<boolean> {
    return this.cashClient.verifyTransaction(signature);
  }
}
