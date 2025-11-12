import { BaseTool } from './base.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../types/index.js';
import { ParallaxClient } from '../../parallax/client.js';
export declare class ParallaxInferenceTool extends BaseTool {
    private client;
    constructor(client: ParallaxClient);
    execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
//# sourceMappingURL=parallax-inference.d.ts.map