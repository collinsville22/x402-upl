import { AgentTool, ToolExecutionContext, ToolExecutionResult } from '../../types/index.js';
export declare abstract class BaseTool {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, any>;
    readonly required: string[];
    constructor(definition: AgentTool);
    abstract execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
    protected validateArgs(args: Record<string, any>): void;
    toJSON(): AgentTool;
}
//# sourceMappingURL=base.d.ts.map