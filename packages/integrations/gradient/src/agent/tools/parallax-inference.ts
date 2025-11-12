import { BaseTool } from './base.js';
import { ToolExecutionContext, ToolExecutionResult, ChatMessage } from '../../types/index.js';
import { ParallaxClient } from '../../parallax/client.js';

export class ParallaxInferenceTool extends BaseTool {
  private client: ParallaxClient;

  constructor(client: ParallaxClient) {
    super({
      name: 'parallax_inference',
      description: 'Execute LLM inference using distributed Parallax nodes. Use this for any task requiring language model reasoning, analysis, or generation. Cost-effective distributed inference.',
      parameters: {
        prompt: {
          type: 'string',
          description: 'The input prompt or question for the LLM',
        },
        system: {
          type: 'string',
          description: 'Optional system prompt to set LLM behavior',
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to generate (default: 1024)',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature 0.0-2.0 (default: 0.7)',
        },
      },
      required: ['prompt'],
    });

    this.client = client;
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();

    try {
      this.validateArgs(args);

      const messages: ChatMessage[] = [];

      if (args.system) {
        messages.push({
          role: 'system',
          content: args.system,
        });
      }

      messages.push({
        role: 'user',
        content: args.prompt,
      });

      const response = await this.client.chatCompletion({
        model: this.client.getModel(),
        messages,
        max_tokens: args.max_tokens || 1024,
        temperature: args.temperature !== undefined ? args.temperature : 0.7,
      });

      const endTime = performance.now();
      const latencyMs = endTime - startTime;

      return {
        success: true,
        result: response.choices[0]?.message?.content || '',
        latencyMs,
        cost: 0,
      };
    } catch (error) {
      const endTime = performance.now();

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: endTime - startTime,
      };
    }
  }
}
