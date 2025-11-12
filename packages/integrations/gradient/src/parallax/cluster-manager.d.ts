import { EventEmitter } from 'events';
import { ParallaxClusterConfig } from '../types/index.js';
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
export declare class ClusterManager extends EventEmitter {
    private config;
    private nodes;
    private heartbeatInterval;
    private reconnectAttempts;
    constructor(config: ParallaxClusterConfig);
    private initializeNodes;
    start(): Promise<void>;
    stop(): Promise<void>;
    private pollClusterStatus;
    getStatus(): ClusterStatus;
    getNodeById(nodeId: string): ClusterNode | undefined;
    waitUntilOperational(timeoutMs?: number): Promise<boolean>;
}
//# sourceMappingURL=cluster-manager.d.ts.map