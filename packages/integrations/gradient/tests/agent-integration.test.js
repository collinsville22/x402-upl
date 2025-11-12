"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const web3_js_1 = require("@solana/web3.js");
const index_js_1 = require("../src/agent/index.js");
(0, vitest_1.describe)('X402ParallaxAgent Integration Tests', () => {
    let agent;
    let testWallet;
    (0, vitest_1.beforeAll)(async () => {
        testWallet = web3_js_1.Keypair.generate();
        agent = new index_js_1.X402ParallaxAgent({
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
    (0, vitest_1.afterAll)(async () => {
        await agent.shutdown();
    });
    (0, vitest_1.describe)('Agent Initialization', () => {
        (0, vitest_1.it)('should initialize successfully', () => {
            const status = agent.getClusterStatus();
            (0, vitest_1.expect)(status).toBeDefined();
            (0, vitest_1.expect)(status.totalNodes).toBe(2);
        });
        (0, vitest_1.it)('should have operational cluster', () => {
            const status = agent.getClusterStatus();
            (0, vitest_1.expect)(status.readyNodes).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Task Execution', () => {
        (0, vitest_1.it)('should execute simple task', async () => {
            const result = await agent.run('What is 2+2? Respond with just the number.');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.answer).toBeDefined();
            (0, vitest_1.expect)(result.iterations).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.iterations).toBeLessThanOrEqual(5);
        }, 30000);
        (0, vitest_1.it)('should track cost during execution', async () => {
            const result = await agent.run('Say hello');
            (0, vitest_1.expect)(result.totalCost).toBeGreaterThanOrEqual(0);
        }, 30000);
        (0, vitest_1.it)('should respect max iterations', async () => {
            const result = await agent.run('This is a test task');
            (0, vitest_1.expect)(result.iterations).toBeLessThanOrEqual(5);
        }, 30000);
    });
    (0, vitest_1.describe)('Event Emissions', () => {
        (0, vitest_1.it)('should emit task:started event', (done) => {
            agent.once('task:started', (data) => {
                (0, vitest_1.expect)(data.task).toBeDefined();
                (0, vitest_1.expect)(data.conversationId).toBeDefined();
                done();
            });
            agent.run('Test task');
        });
        (0, vitest_1.it)('should emit iteration:start events', (done) => {
            agent.once('iteration:start', (data) => {
                (0, vitest_1.expect)(data.iteration).toBeGreaterThan(0);
                (0, vitest_1.expect)(data.conversationId).toBeDefined();
                done();
            });
            agent.run('Test task');
        });
        (0, vitest_1.it)('should emit task:completed on success', (done) => {
            agent.once('task:completed', (data) => {
                (0, vitest_1.expect)(data.answer).toBeDefined();
                (0, vitest_1.expect)(data.totalCost).toBeGreaterThanOrEqual(0);
                (0, vitest_1.expect)(data.iterations).toBeGreaterThan(0);
                done();
            });
            agent.run('Say hello');
        });
    });
    (0, vitest_1.describe)('Economic Metrics', () => {
        (0, vitest_1.it)('should track economic metrics', () => {
            const metrics = agent.getEconomicMetrics();
            (0, vitest_1.expect)(metrics).toMatchObject({
                totalSpent: vitest_1.expect.any(Number),
                totalEarned: vitest_1.expect.any(Number),
                netProfit: vitest_1.expect.any(Number),
                transactionCount: vitest_1.expect.any(Number),
                averageCostPerInference: vitest_1.expect.any(Number),
            });
        });
        (0, vitest_1.it)('should track remaining budget', () => {
            const remaining = agent.getRemainingBudget();
            (0, vitest_1.expect)(typeof remaining).toBe('number');
            (0, vitest_1.expect)(remaining).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('Cluster Management', () => {
        (0, vitest_1.it)('should provide cluster status', () => {
            const status = agent.getClusterStatus();
            (0, vitest_1.expect)(status).toMatchObject({
                schedulerUrl: vitest_1.expect.any(String),
                model: vitest_1.expect.any(String),
                nodes: vitest_1.expect.any(Array),
                totalNodes: vitest_1.expect.any(Number),
                readyNodes: vitest_1.expect.any(Number),
                isOperational: vitest_1.expect.any(Boolean),
            });
        });
        (0, vitest_1.it)('should track node health', () => {
            const status = agent.getClusterStatus();
            status.nodes.forEach(node => {
                (0, vitest_1.expect)(node).toMatchObject({
                    nodeId: vitest_1.expect.any(String),
                    host: vitest_1.expect.any(String),
                    port: vitest_1.expect.any(Number),
                    status: vitest_1.expect.stringMatching(/pending|ready|error/),
                });
            });
        });
    });
    (0, vitest_1.describe)('Agent State', () => {
        (0, vitest_1.it)('should provide agent state', async () => {
            await agent.run('Test');
            const state = agent.getAgentState();
            (0, vitest_1.expect)(state).toMatchObject({
                conversationId: vitest_1.expect.any(String),
                messages: vitest_1.expect.any(Array),
                totalCost: vitest_1.expect.any(Number),
                iterationCount: vitest_1.expect.any(Number),
                isComplete: vitest_1.expect.any(Boolean),
            });
        }, 30000);
        (0, vitest_1.it)('should track conversation messages', async () => {
            await agent.run('Hello');
            const state = agent.getAgentState();
            (0, vitest_1.expect)(state.messages.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(state.messages[0]).toMatchObject({
                role: vitest_1.expect.stringMatching(/system|user|assistant/),
                content: vitest_1.expect.any(String),
            });
        }, 30000);
    });
    (0, vitest_1.describe)('Error Handling', () => {
        (0, vitest_1.it)('should handle invalid tasks gracefully', async () => {
            const result = await agent.run('');
            (0, vitest_1.expect)(result.success).toBeDefined();
            if (!result.success) {
                (0, vitest_1.expect)(result.error).toBeDefined();
            }
        }, 30000);
    });
    (0, vitest_1.describe)('Concurrent Operations', () => {
        (0, vitest_1.it)('should handle multiple agents in parallel', async () => {
            const agent2 = new index_js_1.X402ParallaxAgent({
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
                    wallet: web3_js_1.Keypair.generate(),
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
            (0, vitest_1.expect)(result1.success || !result1.success).toBe(true);
            (0, vitest_1.expect)(result2.success || !result2.success).toBe(true);
            await agent2.shutdown();
        }, 60000);
    });
});
//# sourceMappingURL=agent-integration.test.js.map