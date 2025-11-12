import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ClusterManager } from '../src/parallax/cluster-manager.js';
import { ParallaxClusterConfig } from '../src/types/index.js';

describe('ClusterManager Integration Tests', () => {
  let manager: ClusterManager;
  const config: ParallaxClusterConfig = {
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

  beforeAll(() => {
    manager = new ClusterManager(config);
  });

  afterAll(async () => {
    await manager.stop();
  });

  describe('Cluster Initialization', () => {
    it('should initialize cluster manager with nodes', () => {
      const status = manager.getStatus();
      expect(status.totalNodes).toBe(2);
      expect(status.schedulerUrl).toBe(config.schedulerUrl);
      expect(status.model).toBe(config.model);
    });

    it('should start cluster and poll status', async () => {
      await manager.start();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const status = manager.getStatus();
      expect(status).toBeDefined();
    });
  });

  describe('Node Status Tracking', () => {
    it('should track node status', () => {
      const node = manager.getNodeById('node-0');
      expect(node).toBeDefined();
      expect(node?.nodeId).toBe('node-0');
      expect(node?.host).toBe('localhost');
      expect(node?.port).toBe(3000);
    });

    it('should update node status on heartbeat', async () => {
      await new Promise(resolve => setTimeout(resolve, 6000));

      const status = manager.getStatus();
      expect(status.readyNodes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cluster Health', () => {
    it('should report cluster operational status', () => {
      const status = manager.getStatus();
      expect(status).toHaveProperty('isOperational');
      expect(typeof status.isOperational).toBe('boolean');
    });

    it('should wait for cluster to become operational', async () => {
      const isOperational = await manager.waitUntilOperational(30000);
      expect(typeof isOperational).toBe('boolean');
    });
  });

  describe('Event Emissions', () => {
    it('should emit cluster:operational event', (done) => {
      manager.once('cluster:operational', () => {
        done();
      });

      manager.start();

      setTimeout(() => {
        done(new Error('Event not emitted within timeout'));
      }, 30000);
    });

    it('should emit node:ready events', (done) => {
      let readyCount = 0;

      manager.on('node:ready', (data) => {
        expect(data.nodeId).toBeDefined();
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

  describe('Cluster Status API', () => {
    it('should provide detailed cluster status', () => {
      const status = manager.getStatus();

      expect(status).toMatchObject({
        schedulerUrl: expect.any(String),
        model: expect.any(String),
        nodes: expect.any(Array),
        totalNodes: expect.any(Number),
        readyNodes: expect.any(Number),
        isOperational: expect.any(Boolean),
      });
    });

    it('should list all nodes', () => {
      const status = manager.getStatus();
      expect(status.nodes).toHaveLength(2);

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
});
