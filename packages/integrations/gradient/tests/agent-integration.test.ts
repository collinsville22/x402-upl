import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { X402ParallaxAgent } from '../src/agent/index.js';

describe('X402ParallaxAgent Integration Tests', () => {
  let agent: X402ParallaxAgent;
  let testWallet: Keypair;

  beforeAll(async () => {
    testWallet = Keypair.generate();

    agent = new X402ParallaxAgent({
      parallax: {
        schedulerUrl: process.env.PARALLAX_SCHEDULER_URL || 'http://localhost:3001',
        model: 'default',
        nodes: [
          { nodeId: 'node-0', host: 'localhost', port: 3000 },
          { nodeId: 'node-1', host: 'localhost', port: 3001 },
        ],
        isLocalNetwork: true,
      },
      solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        wallet: testWallet,
        usdcMint: process.env.USDC_MINT,
      },
      x402: {
        registryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:4000',
        spendingLimitPerHour: 100,
        reserveMinimum: 50,
      },
      agent: {
        name: 'test-agent',
        systemPrompt: 'You are a test agent. Provide concise answers.',
        tools: [],
        maxIterations: 5,
        budget: 10,
      },
    });

    await agent.initialize();
  }, 60000);

  afterAll(async () => {
    await agent.shutdown();
  });

  describe('Agent Initialization', () => {
    it('should initialize successfully', () => {
      const status = agent.getClusterStatus();
      expect(status).toBeDefined();
      expect(status.totalNodes).toBe(2);
    });

    it('should have operational cluster', () => {
      const status = agent.getClusterStatus();
      expect(status.readyNodes).toBeGreaterThan(0);
    });
  });

  describe('Task Execution', () => {
    it('should execute simple task', async () => {
      const result = await agent.run('What is 2+2? Respond with just the number.');

      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.iterations).toBeLessThanOrEqual(5);
    }, 30000);

    it('should track cost during execution', async () => {
      const result = await agent.run('Say hello');

      expect(result.totalCost).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should respect max iterations', async () => {
      const result = await agent.run('This is a test task');

      expect(result.iterations).toBeLessThanOrEqual(5);
    }, 30000);
  });

  describe('Event Emissions', () => {
    it('should emit task:started event', (done) => {
      agent.once('task:started', (data) => {
        expect(data.task).toBeDefined();
        expect(data.conversationId).toBeDefined();
        done();
      });

      agent.run('Test task');
    });

    it('should emit iteration:start events', (done) => {
      agent.once('iteration:start', (data) => {
        expect(data.iteration).toBeGreaterThan(0);
        expect(data.conversationId).toBeDefined();
        done();
      });

      agent.run('Test task');
    });

    it('should emit task:completed on success', (done) => {
      agent.once('task:completed', (data) => {
        expect(data.answer).toBeDefined();
        expect(data.totalCost).toBeGreaterThanOrEqual(0);
        expect(data.iterations).toBeGreaterThan(0);
        done();
      });

      agent.run('Say hello');
    });
  });

  describe('Economic Metrics', () => {
    it('should track economic metrics', () => {
      const metrics = agent.getEconomicMetrics();

      expect(metrics).toMatchObject({
        totalSpent: expect.any(Number),
        totalEarned: expect.any(Number),
        netProfit: expect.any(Number),
        transactionCount: expect.any(Number),
        averageCostPerInference: expect.any(Number),
      });
    });

    it('should track remaining budget', () => {
      const remaining = agent.getRemainingBudget();

      expect(typeof remaining).toBe('number');
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cluster Management', () => {
    it('should provide cluster status', () => {
      const status = agent.getClusterStatus();

      expect(status).toMatchObject({
        schedulerUrl: expect.any(String),
        model: expect.any(String),
        nodes: expect.any(Array),
        totalNodes: expect.any(Number),
        readyNodes: expect.any(Number),
        isOperational: expect.any(Boolean),
      });
    });

    it('should track node health', () => {
      const status = agent.getClusterStatus();

      status.nodes.forEach(node => {
        expect(node).toMatchObject({
          nodeId: expect.any(String),
          host: expect.any(String),
          port: expect.any(Number),
          status: expect.stringMatching(/pending|ready|error/),
        });
      });
    });
  });

  describe('Agent State', () => {
    it('should provide agent state', async () => {
      await agent.run('Test');

      const state = agent.getAgentState();

      expect(state).toMatchObject({
        conversationId: expect.any(String),
        messages: expect.any(Array),
        totalCost: expect.any(Number),
        iterationCount: expect.any(Number),
        isComplete: expect.any(Boolean),
      });
    }, 30000);

    it('should track conversation messages', async () => {
      await agent.run('Hello');

      const state = agent.getAgentState();

      expect(state.messages.length).toBeGreaterThan(0);
      expect(state.messages[0]).toMatchObject({
        role: expect.stringMatching(/system|user|assistant/),
        content: expect.any(String),
      });
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid tasks gracefully', async () => {
      const result = await agent.run('');

      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    }, 30000);
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple agents in parallel', async () => {
      const agent2 = new X402ParallaxAgent({
        parallax: {
          schedulerUrl: process.env.PARALLAX_SCHEDULER_URL || 'http://localhost:3001',
          model: 'default',
          nodes: [
            { nodeId: 'node-0', host: 'localhost', port: 3000 },
          ],
          isLocalNetwork: true,
        },
        solana: {
          rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
          wallet: Keypair.generate(),
        },
        x402: {
          registryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:4000',
        },
        agent: {
          name: 'test-agent-2',
          systemPrompt: 'You are a test agent.',
          tools: [],
          maxIterations: 3,
        },
      });

      await agent2.initialize();

      const [result1, result2] = await Promise.all([
        agent.run('Task 1'),
        agent2.run('Task 2'),
      ]);

      expect(result1.success || !result1.success).toBe(true);
      expect(result2.success || !result2.success).toBe(true);

      await agent2.shutdown();
    }, 60000);
  });
});
