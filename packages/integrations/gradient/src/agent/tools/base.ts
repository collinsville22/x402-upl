import { AgentTool, ToolExecutionContext, ToolExecutionResult } from '../../types/index.js';

export abstract class BaseTool {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters: Record<string, any>;
  public readonly required: string[];

  constructor(definition: AgentTool) {
    this.name = definition.name;
    this.description = definition.description;
    this.parameters = definition.parameters;
    this.required = definition.required || [];
  }

  abstract execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;

  protected validateArgs(args: Record<string, any>): void {
    for (const requiredParam of this.required) {
      if (!(requiredParam in args)) {
        throw new Error(`Missing required parameter: ${requiredParam}`);
      }
    }

    for (const [param, value] of Object.entries(args)) {
      if (!(param in this.parameters)) {
        throw new Error(`Unknown parameter: ${param}`);
      }

      const paramDef = this.parameters[param];
      if (paramDef.type && typeof value !== paramDef.type && value !== null && value !== undefined) {
        throw new Error(`Invalid type for parameter ${param}: expected ${paramDef.type}, got ${typeof value}`);
      }
    }
  }

  toJSON(): AgentTool {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      required: this.required,
    };
  }
}
