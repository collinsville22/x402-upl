import { BaseTool } from './base.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../types/index.js';
import { ServiceDiscovery } from '../../x402/discovery.js';
export declare class ServiceDiscoveryTool extends BaseTool {
    private discovery;
    constructor(discovery: ServiceDiscovery);
    execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
//# sourceMappingURL=service-discovery.d.ts.map