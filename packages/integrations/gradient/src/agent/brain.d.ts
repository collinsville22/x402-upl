import { EventEmitter } from 'events';
import { ParallaxClient } from '../parallax/client.js';
import { BaseTool } from './tools/base.js';
import { ChatMessage, AgentConfig } from '../types/index.js';
export interface AgentState {
    conversationId: string;
    messages: ChatMessage[];
    totalCost: number;
    iterationCount: number;
    isComplete: boolean;
    finalAnswer?: string;
}
export interface AgentExecutionResult {
    success: boolean;
    answer?: string;
    totalCost: number;
    iterations: number;
    error?: string;
}
export declare class AgentBrain extends EventEmitter {
    private client;
    private config;
    private tools;
    private state;
    constructor(client: ParallaxClient, config: AgentConfig, tools: BaseTool[]);
    private initializeState;
    private buildSystemPrompt;
    executeTask(task: string): Promise<AgentExecutionResult>;
    private step;
    private isFinalAnswer;
    private extractFinalAnswer;
    private parseToolCall;
    private executeToolCall;
    getState(): AgentState;
    getTotalCost(): number;
    getIterationCount(): number;
}
//# sourceMappingURL=brain.d.ts.map