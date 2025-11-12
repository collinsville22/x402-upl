import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@ai16z/eliza';
import { TAPClient } from '../tap-client.js';

export const discoverServicesAction: Action = {
  name: 'DISCOVER_SERVICES',
  similes: ['SEARCH_SERVICES', 'FIND_SERVICES', 'BROWSE_MARKETPLACE'],
  description: 'Search and discover services on the x402 marketplace with reputation filtering and TAP authentication',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const config = runtime.getSetting('X402_REGISTRY_URL');
    return !!config;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    const registryUrl = runtime.getSetting('X402_REGISTRY_URL');
    const tapClient = new TAPClient(runtime);

    const query = options?.query || state.query || '';
    const category = options?.category || state.category;
    const maxPrice = options?.maxPrice || state.maxPrice || 1.0;
    const minReputation = options?.minReputation || state.minReputation || 7000;

    try {
      const response = await tapClient.request<{ services: any[] }>(
        'GET',
        `${registryUrl}/services/discover`,
        undefined,
        {
          query,
          category,
          maxPrice,
          minReputation,
          verified: true,
          sortBy: 'reputation',
          limit: 10,
        }
      );

      const services = response.services || [];

      if (services.length === 0) {
        await callback({
          text: `No services found matching criteria: ${query || 'all categories'}, max price: ${maxPrice} SOL, min reputation: ${minReputation}`,
          content: { services: [] },
        });
        return;
      }

      const serviceList = services
        .map((s: any) => `- ${s.name} (${s.category}): ${s.pricePerCall} SOL, reputation: ${s.reputationScore}, ${s.verified ? 'verified' : 'unverified'}`)
        .join('\n');

      await callback({
        text: `Found ${services.length} services:\n${serviceList}`,
        content: { services },
      });
    } catch (error) {
      runtime.logger.error('Failed to discover services:', error);
      await callback({
        text: 'Failed to search marketplace. Try again later.',
        content: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Find AI services under 0.5 SOL' },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Searching x402 marketplace...',
          action: 'DISCOVER_SERVICES',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Found 5 services:\n- Data Analysis Agent: 0.3 SOL, reputation: 8500\n- ML Inference Service: 0.4 SOL, reputation: 9200',
        },
      },
    ],
  ],
};
