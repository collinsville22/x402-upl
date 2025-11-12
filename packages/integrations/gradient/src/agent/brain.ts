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

export class AgentBrain extends EventEmitter {
  private client: ParallaxClient;
  private config: AgentConfig;
  private tools: Map<string, BaseTool> = new Map();
  private state: AgentState;

  constructor(client: ParallaxClient, config: AgentConfig, tools: BaseTool[]) {
    super();
    this.client = client;
    this.config = config;

    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }

    this.state = this.initializeState();
  }

  private initializeState(): AgentState {
    return {
      conversationId: `conv-${Date.now()}`,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(),
        },
      ],
      totalCost: 0,
      iterationCount: 0,
      isComplete: false,
    };
  }

  private buildSystemPrompt(): string {
    const toolDescriptions = Array.from(this.tools.values())
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `${this.config.systemPrompt}

Available Tools:
${toolDescriptions}

To use a tool, respond with:
TOOL: tool_name
ARGS: {"arg1": "value1", "arg2": "value2"}

When you have the final answer, respond with:
FINAL ANSWER: your answer here

Think step by step and use tools to gather information before providing your final answer.`;
  }

  async executeTask(task: string): Promise<AgentExecutionResult> {
    this.state = this.initializeState();
    this.state.messages.push({
      role: 'user',
      content: task,
    });

    this.emit('task:started', { task, conversationId: this.state.conversationId });

    try {
      while (this.state.iterationCount < this.config.maxIterations && !this.state.isComplete) {
        await this.step();
      }

      if (!this.state.isComplete) {
        throw new Error('Maximum iterations reached without completion');
      }

      const result: AgentExecutionResult = {
        success: true,
        answer: this.state.finalAnswer,
        totalCost: this.state.totalCost,
        iterations: this.state.iterationCount,
      };

      this.emit('task:completed', result);

      return result;
    } catch (error) {
      const result: AgentExecutionResult = {
        success: false,
        totalCost: this.state.totalCost,
        iterations: this.state.iterationCount,
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('task:error', result);

      return result;
    }
  }

  private async step(): Promise<void> {
    this.state.iterationCount++;

    this.emit('iteration:start', {
      iteration: this.state.iterationCount,
      conversationId: this.state.conversationId,
    });

    const response = await this.client.chatCompletion({
      model: this.client.getModel(),
      messages: this.state.messages,
      max_tokens: 2048,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content || '';
    this.state.messages.push({
      role: 'assistant',
      content: assistantMessage,
    });

    if (this.isFinalAnswer(assistantMessage)) {
      this.state.isComplete = true;
      this.state.finalAnswer = this.extractFinalAnswer(assistantMessage);
      this.emit('iteration:final_answer', { answer: this.state.finalAnswer });
      return;
    }

    const toolCall = this.parseToolCall(assistantMessage);

    if (toolCall) {
      await this.executeToolCall(toolCall.toolName, toolCall.args);
    } else {
      this.state.messages.push({
        role: 'user',
        content: 'Please use a tool to gather information or provide the FINAL ANSWER.',
      });
    }

    this.emit('iteration:complete', {
      iteration: this.state.iterationCount,
      totalCost: this.state.totalCost,
    });
  }

  private isFinalAnswer(message: string): boolean {
    return message.includes('FINAL ANSWER:');
  }

  private extractFinalAnswer(message: string): string {
    const match = message.match(/FINAL ANSWER:\s*(.+)/s);
    return match ? match[1].trim() : message;
  }

  private parseToolCall(message: string): { toolName: string; args: Record<string, any> } | null {
    const toolMatch = message.match(/TOOL:\s*(\w+)/);
    const argsMatch = message.match(/ARGS:\s*(\{[^}]+\})/);

    if (!toolMatch) {
      return null;
    }

    const toolName = toolMatch[1];
    let args: Record<string, any> = {};

    if (argsMatch) {
      try {
        args = JSON.parse(argsMatch[1]);
      } catch {
        this.emit('iteration:parse_error', { toolName, rawArgs: argsMatch[1] });
      }
    }

    return { toolName, args };
  }

  private async executeToolCall(toolName: string, args: Record<string, any>): Promise<void> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      this.state.messages.push({
        role: 'user',
        content: `Error: Tool "${toolName}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
      });
      return;
    }

    this.emit('tool:executing', { toolName, args });

    const context = {
      agentId: this.config.name,
      conversationId: this.state.conversationId,
      currentBudget: this.config.budget || Infinity,
      spentThisHour: this.state.totalCost,
      timestamp: Date.now(),
    };

    const result = await tool.execute(args, context);

    if (result.cost) {
      this.state.totalCost += result.cost;
    }

    this.emit('tool:executed', {
      toolName,
      success: result.success,
      cost: result.cost,
      latencyMs: result.latencyMs,
    });

    if (result.success) {
      this.state.messages.push({
        role: 'user',
        content: `Tool "${toolName}" result:\n${JSON.stringify(result.result, null, 2)}`,
      });
    } else {
      this.state.messages.push({
        role: 'user',
        content: `Tool "${toolName}" failed: ${result.error}`,
      });
    }
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getTotalCost(): number {
    return this.state.totalCost;
  }

  getIterationCount(): number {
    return this.state.iterationCount;
  }
}
