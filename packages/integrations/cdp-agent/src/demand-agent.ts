import { CDPSolanaClient } from './cdp-client.js';
import { ToolRegistry, ToolMetadata } from './tool-registry.js';
import { AgentBrain, AgentTask, ToolChainPlan } from './agent-brain.js';
import { ExecutionEngine, ExecutionResult } from './execution-engine.js';

export interface DemandAgentConfig {
  openaiApiKey: string;
  cdpNetwork: 'devnet' | 'mainnet-beta';
  llmModel?: string;
}

export interface AgentExecutionReport {
  task: AgentTask;
  plan: ToolChainPlan;
  execution: ExecutionResult;
  analysis: string;
  timestamp: number;
}

export class DemandSideAgent {
  private cdpClient: CDPSolanaClient;
  private registry: ToolRegistry;
  private brain: AgentBrain;
  private engine: ExecutionEngine;
  private agentAddress: string | null;

  constructor(config: DemandAgentConfig) {
    this.cdpClient = new CDPSolanaClient(config.cdpNetwork);
    this.registry = new ToolRegistry();
    this.brain = new AgentBrain(
      config.openaiApiKey,
      this.registry,
      config.llmModel || 'gpt-4'
    );
    this.engine = new ExecutionEngine(this.cdpClient, this.registry);
    this.agentAddress = null;
  }

  async initialize(): Promise<string> {
    const account = await this.cdpClient.createAccount();
    this.agentAddress = account.address;

    if (this.cdpClient['network'] === 'devnet') {
      await this.cdpClient.requestFaucet(this.agentAddress);
      await this.cdpClient.waitForBalance(this.agentAddress);
    }

    return this.agentAddress;
  }

  registerTool(tool: ToolMetadata): void {
    this.registry.registerTool(tool);
  }

  async discoverTools(query: string): Promise<ToolMetadata[]> {
    return this.registry.findToolsByCategory(query);
  }

  listAvailableTools(): ToolMetadata[] {
    return this.registry.listTools();
  }

  async executeTask(task: AgentTask): Promise<AgentExecutionReport> {
    if (!this.agentAddress) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const balance = await this.cdpClient.getBalance(this.agentAddress);
    if (balance < task.maxBudgetLamports) {
      throw new Error(
        `Insufficient balance: ${balance} < ${task.maxBudgetLamports}`
      );
    }

    const plan = await this.brain.planToolChain(task);

    const optimizedPlan = await this.brain.optimizePlan(plan);

    const execution = await this.engine.execute(optimizedPlan, {
      agentAddress: this.agentAddress,
      maxBudgetLamports: task.maxBudgetLamports,
    });

    const results = execution.steps.map(step => ({
      step: step.stepNumber,
      result: step.toolResult.data,
    }));

    const analysis = await this.brain.reasonAboutResults(
      task,
      optimizedPlan,
      results
    );

    return {
      task,
      plan: optimizedPlan,
      execution,
      analysis,
      timestamp: Date.now(),
    };
  }

  async getBalance(): Promise<number> {
    if (!this.agentAddress) {
      throw new Error('Agent not initialized');
    }

    return await this.cdpClient.getBalance(this.agentAddress);
  }

  getAddress(): string | null {
    return this.agentAddress;
  }

  async close(): Promise<void> {
    await this.cdpClient.close();
  }
}
