import { ToolMetadata } from './tool-registry.js';
import { AgentTask, ToolChainPlan } from './agent-brain.js';
import { ExecutionResult } from './execution-engine.js';
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
export declare class DemandSideAgent {
    private cdpClient;
    private registry;
    private brain;
    private engine;
    private agentAddress;
    constructor(config: DemandAgentConfig);
    initialize(): Promise<string>;
    registerTool(tool: ToolMetadata): void;
    discoverTools(query: string): Promise<ToolMetadata[]>;
    listAvailableTools(): ToolMetadata[];
    executeTask(task: AgentTask): Promise<AgentExecutionReport>;
    getBalance(): Promise<number>;
    getAddress(): string | null;
    close(): Promise<void>;
}
//# sourceMappingURL=demand-agent.d.ts.map