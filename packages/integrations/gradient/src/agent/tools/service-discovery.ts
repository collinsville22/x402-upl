import { BaseTool } from './base.js';
import { ToolExecutionContext, ToolExecutionResult } from '../../types/index.js';
import { ServiceDiscovery } from '../../x402/discovery.js';

export class ServiceDiscoveryTool extends BaseTool {
  private discovery: ServiceDiscovery;

  constructor(discovery: ServiceDiscovery) {
    super({
      name: 'discover_services',
      description: 'Discover AI inference services from the x402 network. Find and compare services by category, price, and reputation. Returns ranked list of best value services.',
      parameters: {
        category: {
          type: 'string',
          description: 'Service category (e.g., "ai-inference", "computer-vision", "nlp")',
        },
        max_price: {
          type: 'number',
          description: 'Maximum price per call in USDC',
        },
        min_reputation: {
          type: 'number',
          description: 'Minimum reputation score 0-5',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of services to return (default: 10)',
        },
        optimize_for: {
          type: 'string',
          description: 'Optimization strategy: "value", "price", or "reputation" (default: "value")',
        },
      },
      required: [],
    });

    this.discovery = discovery;
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();

    try {
      this.validateArgs(args);

      const optimizeFor = args.optimize_for || 'value';

      if (!['value', 'price', 'reputation'].includes(optimizeFor)) {
        throw new Error('optimize_for must be "value", "price", or "reputation"');
      }

      const services = await this.discovery.discoverServices({
        category: args.category,
        maxPrice: args.max_price,
        minReputation: args.min_reputation,
        limit: args.limit || 10,
      });

      const ranked = this.discovery.rankServicesByValue(services, optimizeFor as any);

      const endTime = performance.now();

      return {
        success: true,
        result: {
          services: ranked.map(r => ({
            name: r.service.name,
            description: r.service.description,
            category: r.service.category,
            price: r.service.pricePerCall,
            reputation: r.service.reputation,
            valueScore: r.valueScore.toFixed(2),
            provider: r.service.provider,
            endpoint: r.service.endpoint,
          })),
          count: ranked.length,
          optimizedFor: optimizeFor,
        },
        latencyMs: endTime - startTime,
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
