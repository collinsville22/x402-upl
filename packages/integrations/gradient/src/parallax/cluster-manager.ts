import { EventEmitter } from 'events';
import { ParallaxClusterConfig, ParallaxNodeConfig } from '../types/index.js';

export interface ClusterNode {
  nodeId: string;
  host: string;
  port: number;
  peerId?: string;
  status: 'pending' | 'ready' | 'error';
  startLayer?: number;
  endLayer?: number;
  lastHeartbeat?: number;
}

export interface ClusterStatus {
  schedulerUrl: string;
  model: string;
  nodes: ClusterNode[];
  totalNodes: number;
  readyNodes: number;
  isOperational: boolean;
}

export class ClusterManager extends EventEmitter {
  private config: ParallaxClusterConfig;
  private nodes: Map<string, ClusterNode> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(config: ParallaxClusterConfig) {
    super();
    this.config = config;
    this.initializeNodes(config.nodes);
  }

  private initializeNodes(nodeConfigs: ParallaxNodeConfig[]): void {
    for (const nodeConfig of nodeConfigs) {
      const node: ClusterNode = {
        nodeId: nodeConfig.nodeId,
        host: nodeConfig.host,
        port: nodeConfig.port,
        peerId: nodeConfig.peerId,
        status: 'pending',
        startLayer: nodeConfig.startLayer,
        endLayer: nodeConfig.endLayer,
      };
      this.nodes.set(node.nodeId, node);
    }
  }

  async start(): Promise<void> {
    this.emit('cluster:starting', { totalNodes: this.nodes.size });

    await this.pollClusterStatus();

    this.heartbeatInterval = setInterval(async () => {
      await this.pollClusterStatus();
    }, 5000);

    this.emit('cluster:started');
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.emit('cluster:stopped');
  }

  private async pollClusterStatus(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.schedulerUrl}/cluster/status`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch cluster status: ${response.status}`);
      }

      const status = await response.json();

      if (status.nodes && Array.isArray(status.nodes)) {
        const now = Date.now();

        for (const nodeData of status.nodes) {
          const existingNode = this.nodes.get(nodeData.node_id);
          if (existingNode) {
            const wasReady = existingNode.status === 'ready';
            existingNode.status = nodeData.status === 'ready' ? 'ready' : 'pending';
            existingNode.lastHeartbeat = now;
            existingNode.peerId = nodeData.peer_id || existingNode.peerId;

            if (!wasReady && existingNode.status === 'ready') {
              this.emit('node:ready', { nodeId: existingNode.nodeId });
              this.reconnectAttempts.delete(existingNode.nodeId);
            }
          }
        }

        const allNodesReady = Array.from(this.nodes.values()).every(n => n.status === 'ready');
        if (allNodesReady) {
          this.emit('cluster:operational');
        }
      }
    } catch (error) {
      this.emit('cluster:error', {
        error: error instanceof Error ? error.message : String(error),
      });

      for (const [nodeId, node] of this.nodes.entries()) {
        if (node.status !== 'error') {
          const attempts = this.reconnectAttempts.get(nodeId) || 0;
          this.reconnectAttempts.set(nodeId, attempts + 1);

          if (attempts > 3) {
            node.status = 'error';
            this.emit('node:error', { nodeId, error: 'Max reconnect attempts exceeded' });
          }
        }
      }
    }
  }

  getStatus(): ClusterStatus {
    const nodesArray = Array.from(this.nodes.values());
    const readyNodes = nodesArray.filter(n => n.status === 'ready').length;

    return {
      schedulerUrl: this.config.schedulerUrl,
      model: this.config.model,
      nodes: nodesArray,
      totalNodes: nodesArray.length,
      readyNodes,
      isOperational: readyNodes > 0 && readyNodes === nodesArray.length,
    };
  }

  getNodeById(nodeId: string): ClusterNode | undefined {
    return this.nodes.get(nodeId);
  }

  async waitUntilOperational(timeoutMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkOperational = () => {
        const status = this.getStatus();
        if (status.isOperational) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(checkOperational, 1000);
      };

      checkOperational();
    });
  }
}
