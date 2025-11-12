import { EventEmitter } from 'events';
import { Workflow, CreateWorkflowRequest, WorkflowEvent } from '../types/workflow.js';
import { EscrowWalletManager } from './escrow-wallet.js';
import { Keypair } from '@solana/web3.js';
export interface WorkflowManagerConfig {
    redisUrl: string;
    anthropicApiKey: string;
    registryUrl: string;
    solanaRpcUrl: string;
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    escrowKeypair: Keypair;
}
export declare class WorkflowManager extends EventEmitter {
    private planner;
    private serviceDiscovery;
    private redis;
    private workflows;
    private escrowManager;
    private solanaRpcUrl;
    private network;
    constructor(config: WorkflowManagerConfig);
    createWorkflow(request: CreateWorkflowRequest): Promise<Workflow>;
    private planWorkflowAsync;
    approveWorkflow(workflowId: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    private executeWorkflowAsync;
    getWorkflow(workflowId: string): Promise<Workflow | null>;
    getUserWorkflows(userId: string, limit?: number): Promise<Workflow[]>;
    cancelWorkflow(workflowId: string): Promise<boolean>;
    private saveWorkflow;
    private generateWorkflowId;
    private emitEvent;
    subscribeToWorkflow(workflowId: string, callback: (event: WorkflowEvent) => void): Promise<void>;
    disconnect(): Promise<void>;
    getEscrowManager(): EscrowWalletManager;
}
//# sourceMappingURL=workflow-manager.d.ts.map