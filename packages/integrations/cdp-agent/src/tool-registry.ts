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

export class ToolRegistry {
  private tools: Map<string, ToolMetadata>;

  constructor() {
    this.tools = new Map();
  }

  registerTool(tool: ToolMetadata): void {
    this.tools.set(tool.toolId, tool);
  }

  getTool(toolId: string): ToolMetadata | undefined {
    return this.tools.get(toolId);
  }

  listTools(): ToolMetadata[] {
    return Array.from(this.tools.values());
  }

  findToolsByCategory(category: string): ToolMetadata[] {
    return Array.from(this.tools.values()).filter(tool =>
      tool.description.toLowerCase().includes(category.toLowerCase())
    );
  }

  calculateTotalCost(toolIds: string[]): number {
    return toolIds.reduce((total, toolId) => {
      const tool = this.tools.get(toolId);
      return total + (tool?.costLamports || 0);
    }, 0);
  }

  async executeTool(
    toolId: string,
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolId} not found`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const options: RequestInit = {
        method: tool.method,
        headers,
      };

      if (tool.method === 'POST') {
        options.body = JSON.stringify(parameters);
      }

      const url = tool.method === 'GET' && Object.keys(parameters).length > 0
        ? `${tool.endpoint}?${new URLSearchParams(parameters as any)}`
        : tool.endpoint;

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      };
    }
  }
}
