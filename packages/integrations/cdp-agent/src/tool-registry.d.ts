export interface ToolMetadata {
    toolId: string;
    name: string;
    description: string;
    costLamports: number;
    paymentAddress: string;
    parameters: Record<string, ToolParameter>;
    endpoint: string;
    method: 'GET' | 'POST';
}
export interface ToolParameter {
    type: 'string' | 'number' | 'boolean' | 'object';
    description: string;
    required: boolean;
}
export interface ToolExecution {
    toolId: string;
    parameters: Record<string, any>;
    timestamp: number;
}
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    executionTime: number;
}
export declare class ToolRegistry {
    private tools;
    constructor();
    registerTool(tool: ToolMetadata): void;
    getTool(toolId: string): ToolMetadata | undefined;
    listTools(): ToolMetadata[];
    findToolsByCategory(category: string): ToolMetadata[];
    calculateTotalCost(toolIds: string[]): number;
    executeTool(toolId: string, parameters: Record<string, any>): Promise<ToolResult>;
}
//# sourceMappingURL=tool-registry.d.ts.map