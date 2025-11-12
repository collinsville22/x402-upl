import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../tool-registry.js';
describe('ToolRegistry', () => {
    let registry;
    beforeEach(() => {
        registry = new ToolRegistry();
    });
    it('should register a tool', () => {
        const tool = {
            toolId: 'test-tool',
            name: 'Test Tool',
            description: 'A test tool',
            costLamports: 1000,
            paymentAddress: 'TestAddress123',
            parameters: {
                param1: {
                    type: 'string',
                    description: 'Test parameter',
                    required: true,
                },
            },
            endpoint: 'https://api.example.com/test',
            method: 'POST',
        };
        registry.registerTool(tool);
        const retrieved = registry.getTool('test-tool');
        expect(retrieved).toEqual(tool);
    });
    it('should list all tools', () => {
        const tool1 = {
            toolId: 'tool-1',
            name: 'Tool 1',
            description: 'First tool',
            costLamports: 1000,
            paymentAddress: 'Address1',
            parameters: {},
            endpoint: 'https://api.example.com/tool1',
            method: 'GET',
        };
        const tool2 = {
            toolId: 'tool-2',
            name: 'Tool 2',
            description: 'Second tool',
            costLamports: 2000,
            paymentAddress: 'Address2',
            parameters: {},
            endpoint: 'https://api.example.com/tool2',
            method: 'POST',
        };
        registry.registerTool(tool1);
        registry.registerTool(tool2);
        const tools = registry.listTools();
        expect(tools).toHaveLength(2);
        expect(tools).toContainEqual(tool1);
        expect(tools).toContainEqual(tool2);
    });
    it('should find tools by category', () => {
        const analyticsTool = {
            toolId: 'analytics-1',
            name: 'Analytics Tool',
            description: 'Tool for analytics and data processing',
            costLamports: 5000,
            paymentAddress: 'AnalyticsAddress',
            parameters: {},
            endpoint: 'https://api.example.com/analytics',
            method: 'POST',
        };
        const tradingTool = {
            toolId: 'trading-1',
            name: 'Trading Tool',
            description: 'Tool for trading operations',
            costLamports: 3000,
            paymentAddress: 'TradingAddress',
            parameters: {},
            endpoint: 'https://api.example.com/trading',
            method: 'POST',
        };
        registry.registerTool(analyticsTool);
        registry.registerTool(tradingTool);
        const analyticsTools = registry.findToolsByCategory('analytics');
        expect(analyticsTools).toHaveLength(1);
        expect(analyticsTools[0].toolId).toBe('analytics-1');
        const tradingTools = registry.findToolsByCategory('trading');
        expect(tradingTools).toHaveLength(1);
        expect(tradingTools[0].toolId).toBe('trading-1');
    });
    it('should calculate total cost', () => {
        const tool1 = {
            toolId: 'tool-1',
            name: 'Tool 1',
            description: 'First tool',
            costLamports: 1000,
            paymentAddress: 'Address1',
            parameters: {},
            endpoint: 'https://api.example.com/tool1',
            method: 'GET',
        };
        const tool2 = {
            toolId: 'tool-2',
            name: 'Tool 2',
            description: 'Second tool',
            costLamports: 2000,
            paymentAddress: 'Address2',
            parameters: {},
            endpoint: 'https://api.example.com/tool2',
            method: 'POST',
        };
        registry.registerTool(tool1);
        registry.registerTool(tool2);
        const totalCost = registry.calculateTotalCost(['tool-1', 'tool-2']);
        expect(totalCost).toBe(3000);
    });
    it('should handle missing tools in cost calculation', () => {
        const tool1 = {
            toolId: 'tool-1',
            name: 'Tool 1',
            description: 'First tool',
            costLamports: 1000,
            paymentAddress: 'Address1',
            parameters: {},
            endpoint: 'https://api.example.com/tool1',
            method: 'GET',
        };
        registry.registerTool(tool1);
        const totalCost = registry.calculateTotalCost(['tool-1', 'nonexistent']);
        expect(totalCost).toBe(1000);
    });
    it('should return undefined for nonexistent tool', () => {
        const tool = registry.getTool('nonexistent');
        expect(tool).toBeUndefined();
    });
});
//# sourceMappingURL=tool-registry.test.js.map