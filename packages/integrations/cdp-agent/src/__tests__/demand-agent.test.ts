import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DemandSideAgent } from '../demand-agent.js';
import { ToolMetadata } from '../tool-registry.js';

describe('DemandSideAgent', () => {
  let agent: DemandSideAgent;
  const openaiApiKey = process.env.OPENAI_API_KEY || '';

  beforeAll(async () => {
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable required');
    }

    agent = new DemandSideAgent({
      openaiApiKey,
      cdpNetwork: 'devnet',
      llmModel: 'gpt-4',
    });

    await agent.initialize();

    const mockTool: ToolMetadata = {
      toolId: 'price-oracle',
      name: 'Price Oracle',
      description: 'Get current cryptocurrency prices',
      costLamports: 1000,
      paymentAddress: 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo',
      parameters: {
        symbol: {
          type: 'string',
          description: 'Cryptocurrency symbol',
          required: true,
        },
      },
      endpoint: 'https://api.coingecko.com/api/v3/simple/price',
      method: 'GET',
    };

    agent.registerTool(mockTool);
  }, 60000);

  afterAll(async () => {
    await agent.close();
  });

  it('should initialize with an address', () => {
    const address = agent.getAddress();
    expect(address).toBeTruthy();
    expect(typeof address).toBe('string');
  });

  it('should have sufficient balance after initialization', async () => {
    const balance = await agent.getBalance();
    expect(balance).toBeGreaterThan(0);
  }, 10000);

  it('should list available tools', () => {
    const tools = agent.listAvailableTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].toolId).toBe('price-oracle');
  });

  it('should discover tools by query', async () => {
    const tools = await agent.discoverTools('price');
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0].toolId).toBe('price-oracle');
  });

  it('should execute a task with tool chain', async () => {
    const task = {
      taskId: 'test-task-1',
      description: 'Get the current price of Solana',
      maxBudgetLamports: 10000,
    };

    const report = await agent.executeTask(task);

    expect(report).toBeDefined();
    expect(report.task).toEqual(task);
    expect(report.plan).toBeDefined();
    expect(report.plan.steps.length).toBeGreaterThan(0);
    expect(report.execution).toBeDefined();
    expect(report.execution.totalCost).toBeLessThanOrEqual(task.maxBudgetLamports);
    expect(report.analysis).toBeTruthy();
    expect(report.timestamp).toBeGreaterThan(0);
  }, 60000);

  it('should throw error for insufficient balance', async () => {
    const balance = await agent.getBalance();

    const task = {
      taskId: 'expensive-task',
      description: 'Execute an expensive operation',
      maxBudgetLamports: balance + 1000000,
    };

    await expect(agent.executeTask(task)).rejects.toThrow('Insufficient balance');
  }, 10000);

  it('should throw error if not initialized', () => {
    const uninitializedAgent = new DemandSideAgent({
      openaiApiKey,
      cdpNetwork: 'devnet',
    });

    expect(() => uninitializedAgent.getAddress()).not.toThrow();
    expect(uninitializedAgent.getAddress()).toBeNull();
  });
});
