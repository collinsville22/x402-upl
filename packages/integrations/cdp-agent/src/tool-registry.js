export class ToolRegistry {
    tools;
    constructor() {
        this.tools = new Map();
    }
    registerTool(tool) {
        this.tools.set(tool.toolId, tool);
    }
    getTool(toolId) {
        return this.tools.get(toolId);
    }
    listTools() {
        return Array.from(this.tools.values());
    }
    findToolsByCategory(category) {
        return Array.from(this.tools.values()).filter(tool => tool.description.toLowerCase().includes(category.toLowerCase()));
    }
    calculateTotalCost(toolIds) {
        return toolIds.reduce((total, toolId) => {
            const tool = this.tools.get(toolId);
            return total + (tool?.costLamports || 0);
        }, 0);
    }
    async executeTool(toolId, parameters) {
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
            const headers = {
                'Content-Type': 'application/json',
            };
            const options = {
                method: tool.method,
                headers,
            };
            if (tool.method === 'POST') {
                options.body = JSON.stringify(parameters);
            }
            const url = tool.method === 'GET' && Object.keys(parameters).length > 0
                ? `${tool.endpoint}?${new URLSearchParams(parameters)}`
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
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                executionTime,
            };
        }
    }
}
//# sourceMappingURL=tool-registry.js.map