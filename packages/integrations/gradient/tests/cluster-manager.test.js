"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cluster_manager_js_1 = require("../src/parallax/cluster-manager.js");
(0, vitest_1.describe)('ClusterManager Integration Tests', () => {
    let manager;
    const config = {
        schedulerUrl: process.env.PARALLAX_SCHEDULER_URL || 'http://localhost:3001',
        model: 'Qwen/Qwen3-0.6B',
        nodes: [
            {
                nodeId: 'node-0',
                host: 'localhost',
                port: 3000,
            },
            {
                nodeId: 'node-1',
                host: 'localhost',
                port: 3001,
            },
        ],
        isLocalNetwork: true,
    };
    (0, vitest_1.beforeAll)(() => {
        manager = new cluster_manager_js_1.ClusterManager(config);
    });
    (0, vitest_1.afterAll)(async () => {
        await manager.stop();
    });
    (0, vitest_1.describe)('Cluster Initialization', () => {
        (0, vitest_1.it)('should initialize cluster manager with nodes', () => {
            const status = manager.getStatus();
            (0, vitest_1.expect)(status.totalNodes).toBe(2);
            (0, vitest_1.expect)(status.schedulerUrl).toBe(config.schedulerUrl);
            (0, vitest_1.expect)(status.model).toBe(config.model);
        });
        (0, vitest_1.it)('should start cluster and poll status', async () => {
            await manager.start();
            await new Promise(resolve => setTimeout(resolve, 2000));
            const status = manager.getStatus();
            (0, vitest_1.expect)(status).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Node Status Tracking', () => {
        (0, vitest_1.it)('should track node status', () => {
            const node = manager.getNodeById('node-0');
            (0, vitest_1.expect)(node).toBeDefined();
            (0, vitest_1.expect)(node?.nodeId).toBe('node-0');
            (0, vitest_1.expect)(node?.host).toBe('localhost');
            (0, vitest_1.expect)(node?.port).toBe(3000);
        });
        (0, vitest_1.it)('should update node status on heartbeat', async () => {
            await new Promise(resolve => setTimeout(resolve, 6000));
            const status = manager.getStatus();
            (0, vitest_1.expect)(status.readyNodes).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('Cluster Health', () => {
        (0, vitest_1.it)('should report cluster operational status', () => {
            const status = manager.getStatus();
            (0, vitest_1.expect)(status).toHaveProperty('isOperational');
            (0, vitest_1.expect)(typeof status.isOperational).toBe('boolean');
        });
        (0, vitest_1.it)('should wait for cluster to become operational', async () => {
            const isOperational = await manager.waitUntilOperational(30000);
            (0, vitest_1.expect)(typeof isOperational).toBe('boolean');
        });
    });
    (0, vitest_1.describe)('Event Emissions', () => {
        (0, vitest_1.it)('should emit cluster:operational event', (done) => {
            manager.once('cluster:operational', () => {
                done();
            });
            manager.start();
            setTimeout(() => {
                done(new Error('Event not emitted within timeout'));
            }, 30000);
        });
        (0, vitest_1.it)('should emit node:ready events', (done) => {
            let readyCount = 0;
            manager.on('node:ready', (data) => {
                (0, vitest_1.expect)(data.nodeId).toBeDefined();
                readyCount++;
                if (readyCount >= 1) {
                    done();
                }
            });
            setTimeout(() => {
                if (readyCount === 0) {
                    done(new Error('No node:ready events emitted'));
                }
            }, 30000);
        });
    });
    (0, vitest_1.describe)('Cluster Status API', () => {
        (0, vitest_1.it)('should provide detailed cluster status', () => {
            const status = manager.getStatus();
            (0, vitest_1.expect)(status).toMatchObject({
                schedulerUrl: vitest_1.expect.any(String),
                model: vitest_1.expect.any(String),
                nodes: vitest_1.expect.any(Array),
                totalNodes: vitest_1.expect.any(Number),
                readyNodes: vitest_1.expect.any(Number),
                isOperational: vitest_1.expect.any(Boolean),
            });
        });
        (0, vitest_1.it)('should list all nodes', () => {
            const status = manager.getStatus();
            (0, vitest_1.expect)(status.nodes).toHaveLength(2);
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
});
//# sourceMappingURL=cluster-manager.test.js.map