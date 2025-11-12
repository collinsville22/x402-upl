"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterManager = void 0;
const events_1 = require("events");
class ClusterManager extends events_1.EventEmitter {
    config;
    nodes = new Map();
    heartbeatInterval = null;
    reconnectAttempts = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.initializeNodes(config.nodes);
    }
    initializeNodes(nodeConfigs) {
        for (const nodeConfig of nodeConfigs) {
            const node = {
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
    async start() {
        this.emit('cluster:starting', { totalNodes: this.nodes.size });
        await this.pollClusterStatus();
        this.heartbeatInterval = setInterval(async () => {
            await this.pollClusterStatus();
        }, 5000);
        this.emit('cluster:started');
    }
    async stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.emit('cluster:stopped');
    }
    async pollClusterStatus() {
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
        }
        catch (error) {
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
    getStatus() {
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
    getNodeById(nodeId) {
        return this.nodes.get(nodeId);
    }
    async waitUntilOperational(timeoutMs = 60000) {
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
exports.ClusterManager = ClusterManager;
//# sourceMappingURL=cluster-manager.js.map