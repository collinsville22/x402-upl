# X402 Integration Catalog

Unified catalog service aggregating all x402 sponsor integrations with a central registry for blockchain integrations, AI services, oracle solutions, and trading automation.

## Overview

The X402 Integration Catalog provides a unified interface to discover and interact with all sponsor integrations in the x402 ecosystem. Instead of managing multiple clients and APIs, developers can use a single catalog to browse services, understand capabilities, and execute operations across all integrated platforms.

**Sponsor Integrations:**
- **Dark Research** - AI-powered research and analysis
- **Triton/Old Faithful** - Historical Solana blockchain data
- **Gradient Parallax** - Distributed AI inference and training
- **OM1 Robots** - Autonomous trading algorithms

The catalog handles authentication, pricing discovery, service metadata, and unified execution, making it simple to build applications that leverage multiple sponsor services.

## Features

### Service Aggregation
- **Unified Interface**: Single API for all sponsor integrations
- **Service Discovery**: Browse all available services by category
- **Metadata Management**: Comprehensive service descriptions, capabilities, and schemas
- **Dynamic Pricing**: Per-service pricing configuration

### Multi-Source Integration
- **Dark Research**: Research, document analysis, trend analysis
- **Triton**: Historical blockchain data, token transfers, DEX analytics
- **Gradient**: AI inference, model training, distributed compute
- **OM1**: Trading robots, signals, strategy backtesting

### Developer Experience
- **Type-Safe**: Full TypeScript support with interfaces
- **Schema Validation**: Input schemas for all services
- **Error Handling**: Consistent error messages across integrations
- **Client Management**: Automatic client initialization and lifecycle

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              X402 Integration Catalog                   │
├─────────────────────────────────────────────────────────┤
│  Service Discovery │ Metadata Management │ Execution    │
└──────────┬──────────────────────────────────┬───────────┘
           │                                  │
    ┌──────▼────────┐                 ┌──────▼─────────┐
    │   Browse &    │                 │    Execute     │
    │   Filter      │                 │   Service      │
    └──────┬────────┘                 └──────┬─────────┘
           │                                  │
    ┌──────▼──────────────────────────────────▼─────────┐
    │           Sponsor Service Clients                  │
    ├──────────────┬──────────────┬──────────────┬──────┤
    │ DarkClient   │ TritonClient │ GradientClient│ OM1  │
    └──────┬───────┴──────┬───────┴──────┬───────┴──┬───┘
           │              │              │          │
    ┌──────▼──────┐┌──────▼──────┐┌──────▼──────┐┌─▼────┐
    │   Dark      ││   Triton    ││  Gradient   ││ OM1  │
    │  Research   ││Old Faithful ││  Parallax   ││Robots│
    └─────────────┘└─────────────┘└─────────────┘└──────┘
```

### Component Responsibilities

**SponsorServiceCatalog**
- Service metadata management
- Client initialization
- Service discovery and filtering
- Unified execution interface

**Service Clients**
- DarkResearchClient: AI research operations
- TritonClient: Blockchain data queries
- GradientClient: AI inference and training
- OM1Client: Trading automation

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- TypeScript 5.0 or higher
- Active API keys for desired sponsors

### Install Package

```bash
npm install @x402-upl/integration-catalog
```

### Install Sponsor SDKs

The catalog requires the specific integration packages:

```bash
# Install all sponsor integrations
npm install @x402-upl/integration-dark
npm install @x402-upl/integration-triton
npm install @x402-upl/integration-gradient
npm install @x402-upl/integration-om1

# Or install only what you need
npm install @x402-upl/integration-dark @x402-upl/integration-triton
```

## Configuration

### Environment Variables

```bash
# Dark Research Configuration
DARK_API_KEY=your_dark_research_api_key
DARK_PRICE_PER_CALL=0.001

# Triton/Old Faithful Configuration
TRITON_API_KEY=your_triton_api_key
TRITON_PRICE_PER_CALL=0.0005

# Gradient Parallax Configuration
GRADIENT_API_KEY=your_gradient_api_key
GRADIENT_PRICE_PER_CALL=0.002

# OM1 Robots Configuration
OM1_API_KEY=your_om1_api_key
OM1_PRICE_PER_CALL=0.003

# Solana Network Configuration
SOLANA_NETWORK=mainnet-beta # or devnet, testnet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
RECIPIENT_ADDRESS=your_solana_wallet_address
```

### Catalog Configuration

```typescript
import { SponsorServiceCatalog, SponsorServiceConfig } from '@x402-upl/integration-catalog';

const config: SponsorServiceConfig = {
  // Dark Research - AI-powered research
  dark: {
    apiKey: process.env.DARK_API_KEY!,
    pricePerCall: 0.001, // USDC per call
  },

  // Triton/Old Faithful - Historical blockchain data
  triton: {
    apiKey: process.env.TRITON_API_KEY!,
    pricePerCall: 0.0005,
  },

  // Gradient Parallax - Distributed AI inference
  gradient: {
    apiKey: process.env.GRADIENT_API_KEY!,
    pricePerCall: 0.002,
  },

  // OM1 Robots - Trading automation
  om1: {
    apiKey: process.env.OM1_API_KEY!,
    pricePerCall: 0.003,
  },

  // Solana configuration
  solana: {
    network: 'mainnet-beta',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    recipientAddress: process.env.RECIPIENT_ADDRESS!,
  },
};

const catalog = new SponsorServiceCatalog(config);
```

## Usage

### Service Discovery

List all available services:

```typescript
import { SponsorServiceCatalog } from '@x402-upl/integration-catalog';

const catalog = new SponsorServiceCatalog(config);

// Get all services
const allServices = catalog.getServiceCatalog();

console.log(`Total services: ${allServices.length}`);

allServices.forEach(service => {
  console.log(`\n${service.name}`);
  console.log(`  ID: ${service.id}`);
  console.log(`  Category: ${service.category}`);
  console.log(`  Sponsor: ${service.sponsor}`);
  console.log(`  Price: $${service.pricePerCall} USDC`);
  console.log(`  Capabilities: ${service.capabilities.join(', ')}`);
  console.log(`  Description: ${service.description}`);
});
```

### Filter Services by Category

```typescript
// Get all AI & ML services
const aiServices = allServices.filter(s => s.category === 'AI & ML');

// Get all blockchain data services
const blockchainServices = allServices.filter(s => s.category === 'Blockchain Data');

// Get all research services
const researchServices = allServices.filter(s => s.category === 'Research');

// Get all trading services
const tradingServices = allServices.filter(s => s.category === 'Trading');

console.log(`AI Services: ${aiServices.length}`);
console.log(`Blockchain Services: ${blockchainServices.length}`);
console.log(`Research Services: ${researchServices.length}`);
console.log(`Trading Services: ${tradingServices.length}`);
```

### Filter by Sponsor

```typescript
// Get all Dark Research services
const darkServices = allServices.filter(s => s.sponsor === 'dark');

// Get all Triton services
const tritonServices = allServices.filter(s => s.sponsor === 'triton');

// Get all Gradient services
const gradientServices = allServices.filter(s => s.sponsor === 'gradient');

// Get all OM1 services
const om1Services = allServices.filter(s => s.sponsor === 'om1');
```

### Execute Services

```typescript
// Execute Dark Research service
const researchResult = await catalog.executeService('dark-research', {
  query: 'Latest developments in AI alignment',
  depth: 'deep',
  maxResults: 10,
});

// Execute Triton historical data query
const historicalData = await catalog.executeService('triton-historical-data', {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
  fromSlot: 150000000,
  toSlot: 150010000,
});

// Execute Gradient AI inference
const inferenceResult = await catalog.executeService('gradient-inference', {
  model: 'llama-3-70b',
  input: 'Explain quantum computing',
  parameters: {
    temperature: 0.7,
    max_tokens: 500,
  },
});

// Execute OM1 trading signal
const tradingSignals = await catalog.executeService('om1-signals', {
  market: 'SOL/USDC',
  strategy: 'trend-following',
  minConfidence: 0.75,
});
```

### Access Individual Clients

If you need direct access to sponsor clients:

```typescript
// Get Dark Research client
const darkClient = catalog.getDarkClient();
if (darkClient) {
  const analysis = await darkClient.trendAnalysis('DeFi', '30d');
}

// Get Triton client
const tritonClient = catalog.getTritonClient();
if (tritonClient) {
  const transfers = await tritonClient.getTokenTransfers({
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    fromSlot: 150000000,
    toSlot: 150010000,
  });
}

// Get Gradient client
const gradientClient = catalog.getGradientClient();
if (gradientClient) {
  const job = await gradientClient.submitJob({
    type: 'rendering',
    parameters: { resolution: '4K' },
  });
}

// Get OM1 client
const om1Client = catalog.getOM1Client();
if (om1Client) {
  const robot = await om1Client.createRobot({
    strategy: { type: 'market-making' },
    markets: ['SOL/USDC', 'BTC/USDC'],
    capital: 10000,
  });
}
```

## API Reference

### SponsorServiceCatalog

Main catalog class for service discovery and execution.

#### Constructor

```typescript
constructor(config: SponsorServiceConfig)
```

**Parameters:**
- `config`: SponsorServiceConfig - Configuration for all sponsor integrations

**Example:**
```typescript
const catalog = new SponsorServiceCatalog({
  dark: { apiKey: '...', pricePerCall: 0.001 },
  triton: { apiKey: '...', pricePerCall: 0.0005 },
  gradient: { apiKey: '...', pricePerCall: 0.002 },
  om1: { apiKey: '...', pricePerCall: 0.003 },
  solana: {
    network: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    recipientAddress: '...',
  },
});
```

#### getServiceCatalog()

Get all available services with metadata.

```typescript
getServiceCatalog(): ServiceDefinition[]
```

**Returns:** Array of service definitions

**Example:**
```typescript
const services = catalog.getServiceCatalog();
// Returns all 12+ services from all sponsors
```

#### executeService()

Execute a service by ID with parameters.

```typescript
async executeService(serviceId: string, params: unknown): Promise<unknown>
```

**Parameters:**
- `serviceId`: string - Service ID (e.g., 'dark-research', 'triton-historical-data')
- `params`: unknown - Service-specific parameters

**Returns:** Service execution result

**Throws:** Error if service not found or execution fails

**Example:**
```typescript
const result = await catalog.executeService('dark-research', {
  query: 'AI trends',
  depth: 'standard',
});
```

#### getDarkClient()

Get direct access to Dark Research client.

```typescript
getDarkClient(): DarkResearchClient | undefined
```

**Returns:** DarkResearchClient if configured, undefined otherwise

#### getTritonClient()

Get direct access to Triton client.

```typescript
getTritonClient(): TritonClient | undefined
```

**Returns:** TritonClient if configured, undefined otherwise

#### getGradientClient()

Get direct access to Gradient client.

```typescript
getGradientClient(): GradientClient | undefined
```

**Returns:** GradientClient if configured, undefined otherwise

#### getOM1Client()

Get direct access to OM1 client.

```typescript
getOM1Client(): OM1Client | undefined
```

**Returns:** OM1Client if configured, undefined otherwise

### TypeScript Interfaces

#### SponsorServiceConfig

```typescript
interface SponsorServiceConfig {
  dark?: {
    apiKey: string;
    pricePerCall: number;
  };
  triton?: {
    apiKey: string;
    pricePerCall: number;
  };
  gradient?: {
    apiKey: string;
    pricePerCall: number;
  };
  om1?: {
    apiKey: string;
    pricePerCall: number;
  };
  solana: {
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    rpcUrl: string;
    recipientAddress: string;
  };
}
```

#### ServiceDefinition

```typescript
interface ServiceDefinition {
  id: string;                    // Unique service identifier
  name: string;                  // Human-readable name
  description: string;           // Service description
  category: string;              // Service category
  sponsor: 'dark' | 'triton' | 'gradient' | 'om1';
  pricePerCall: number;          // USDC price per call
  capabilities: string[];        // List of capabilities
  inputSchema: Record<string, unknown>; // Input parameter schema
}
```

## Examples

### Example 1: Multi-Source Research Dashboard

Build a research dashboard using multiple sponsor services:

```typescript
import { SponsorServiceCatalog } from '@x402-upl/integration-catalog';

async function researchDashboard(topic: string) {
  const catalog = new SponsorServiceCatalog(config);

  // Get AI research from Dark
  const darkResult = await catalog.executeService('dark-research', {
    query: topic,
    depth: 'deep',
    maxResults: 20,
  });

  // Get trend analysis
  const trendResult = await catalog.executeService('dark-trend-analysis', {
    topic,
    timeframe: '30d',
  });

  // Get blockchain data if topic is crypto-related
  let blockchainData = null;
  if (topic.toLowerCase().includes('crypto') || topic.toLowerCase().includes('blockchain')) {
    blockchainData = await catalog.executeService('triton-dex-data', {
      market: 'SOL/USDC',
      dexProgram: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
      timeframe: '7d',
    });
  }

  return {
    research: darkResult,
    trends: trendResult,
    blockchain: blockchainData,
    generatedAt: new Date().toISOString(),
  };
}

// Usage
const dashboard = await researchDashboard('Solana DeFi ecosystem');
console.log(JSON.stringify(dashboard, null, 2));
```

### Example 2: Automated Trading System

Combine OM1 trading signals with blockchain data:

```typescript
async function tradingSystem(market: string) {
  const catalog = new SponsorServiceCatalog(config);

  // Get trading signals from OM1
  const signals = await catalog.executeService('om1-signals', {
    market,
    strategy: 'trend-following',
    minConfidence: 0.8,
  });

  // Get historical data from Triton for validation
  const historicalData = await catalog.executeService('triton-dex-data', {
    market,
    dexProgram: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    timeframe: '24h',
  });

  // Analyze with Gradient AI
  const analysis = await catalog.executeService('gradient-inference', {
    model: 'llama-3-70b',
    input: `Analyze these trading signals against historical data: ${JSON.stringify({ signals, historicalData })}`,
    parameters: {
      temperature: 0.3,
      max_tokens: 1000,
    },
  });

  return {
    signals,
    historicalValidation: historicalData,
    aiAnalysis: analysis,
    recommendation: 'EXECUTE' // or 'HOLD' based on analysis
  };
}

// Usage
const tradingDecision = await tradingSystem('SOL/USDC');
```

### Example 3: Service Cost Comparison

Compare pricing across services:

```typescript
function analyzeCosts() {
  const catalog = new SponsorServiceCatalog(config);
  const services = catalog.getServiceCatalog();

  // Group by sponsor
  const costBySponsor = services.reduce((acc, service) => {
    if (!acc[service.sponsor]) {
      acc[service.sponsor] = {
        services: [],
        avgPrice: 0,
        totalServices: 0,
      };
    }

    acc[service.sponsor].services.push(service);
    acc[service.sponsor].totalServices++;

    return acc;
  }, {} as Record<string, any>);

  // Calculate averages
  Object.keys(costBySponsor).forEach(sponsor => {
    const data = costBySponsor[sponsor];
    const totalPrice = data.services.reduce((sum: number, s: any) => sum + s.pricePerCall, 0);
    data.avgPrice = totalPrice / data.totalServices;
  });

  console.log('Cost Analysis by Sponsor:');
  Object.entries(costBySponsor).forEach(([sponsor, data]: [string, any]) => {
    console.log(`\n${sponsor.toUpperCase()}:`);
    console.log(`  Services: ${data.totalServices}`);
    console.log(`  Avg Price: $${data.avgPrice.toFixed(4)} USDC`);
    console.log(`  Range: $${Math.min(...data.services.map((s: any) => s.pricePerCall)).toFixed(4)} - $${Math.max(...data.services.map((s: any) => s.pricePerCall)).toFixed(4)}`);
  });
}

analyzeCosts();
```

### Example 4: Capability-Based Service Discovery

Find services by capability:

```typescript
function findServicesByCapability(capability: string) {
  const catalog = new SponsorServiceCatalog(config);
  const services = catalog.getServiceCatalog();

  return services.filter(service =>
    service.capabilities.some(cap =>
      cap.toLowerCase().includes(capability.toLowerCase())
    )
  );
}

// Find all research services
const researchServices = findServicesByCapability('research');
console.log(`Research services: ${researchServices.map(s => s.name).join(', ')}`);

// Find all inference services
const inferenceServices = findServicesByCapability('inference');

// Find all blockchain services
const blockchainServices = findServicesByCapability('block');
```

## Integration with X402

### Service Registration

Each sponsor service is automatically registered with pricing:

```typescript
// Services are configured with pricing
const config: SponsorServiceConfig = {
  dark: {
    apiKey: process.env.DARK_API_KEY!,
    pricePerCall: 0.001, // $0.001 USDC per research query
  },
  triton: {
    apiKey: process.env.TRITON_API_KEY!,
    pricePerCall: 0.0005, // $0.0005 USDC per historical query
  },
};
```

### Payment Flow

The catalog doesn't handle payments directly - it aggregates services. Each sponsor client handles its own x402 payment flow:

1. **Service Discovery**: Catalog provides metadata and pricing
2. **Service Execution**: Delegates to sponsor-specific client
3. **Payment**: Handled by individual sponsor client (see integration-specific docs)
4. **Response**: Result returned through catalog interface

### Revenue Distribution

Revenue flows directly to sponsor providers based on service usage:

```
User Payment
     │
     ├─> Dark Research (for dark-* services)
     ├─> Triton (for triton-* services)
     ├─> Gradient (for gradient-* services)
     └─> OM1 (for om1-* services)
```

## Troubleshooting

### Service Not Available

**Error**: `Dark Research not configured`

**Solution**: Ensure the sponsor configuration is provided:

```typescript
const catalog = new SponsorServiceCatalog({
  dark: {
    apiKey: process.env.DARK_API_KEY!,
    pricePerCall: 0.001,
  },
  // ... other configs
  solana: { /* ... */ },
});
```

### Unknown Service Error

**Error**: `Unknown service: invalid-service-id`

**Solution**: Check available services:

```typescript
const services = catalog.getServiceCatalog();
const validIds = services.map(s => s.id);
console.log('Valid service IDs:', validIds);
```

### Execution Failures

**Error**: `Service execution failed: dark-research`

**Solution**: Check service-specific parameters against input schema:

```typescript
const service = catalog.getServiceCatalog().find(s => s.id === 'dark-research');
console.log('Expected schema:', service?.inputSchema);
```

### Missing API Keys

**Error**: API key errors from sponsor clients

**Solution**: Verify all required environment variables:

```bash
# Check .env file
echo $DARK_API_KEY
echo $TRITON_API_KEY
echo $GRADIENT_API_KEY
echo $OM1_API_KEY
```

### Type Errors

**Error**: TypeScript type mismatch on executeService

**Solution**: The catalog uses `unknown` for flexibility. Cast results:

```typescript
interface DarkResearchResult {
  findings: string[];
  sources: string[];
}

const result = await catalog.executeService('dark-research', params) as DarkResearchResult;
```

## Security

### API Key Management

Store API keys securely:

```typescript
// ❌ Bad: Hardcoded keys
const config = {
  dark: { apiKey: 'sk_live_123456', pricePerCall: 0.001 },
};

// ✅ Good: Environment variables
const config = {
  dark: {
    apiKey: process.env.DARK_API_KEY!,
    pricePerCall: 0.001,
  },
};
```

### Input Validation

Validate user inputs before execution:

```typescript
import { z } from 'zod';

const ResearchParamsSchema = z.object({
  query: z.string().min(3).max(500),
  depth: z.enum(['quick', 'standard', 'deep']),
  maxResults: z.number().min(1).max(100),
});

async function safeExecute(serviceId: string, params: unknown) {
  // Validate params
  const validated = ResearchParamsSchema.parse(params);

  // Execute
  return await catalog.executeService(serviceId, validated);
}
```

### Rate Limiting

Implement application-level rate limiting:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

async function rateLimitedExecute(userId: string, serviceId: string, params: unknown) {
  const { success } = await ratelimit.limit(userId);

  if (!success) {
    throw new Error('Rate limit exceeded');
  }

  return await catalog.executeService(serviceId, params);
}
```

## Performance

### Service Caching

Cache service catalog for faster discovery:

```typescript
class CachedCatalog {
  private catalog: SponsorServiceCatalog;
  private serviceCache: ServiceDefinition[] | null = null;
  private cacheExpiry: number = 0;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: SponsorServiceConfig) {
    this.catalog = new SponsorServiceCatalog(config);
  }

  getServiceCatalog(): ServiceDefinition[] {
    const now = Date.now();

    if (this.serviceCache && now < this.cacheExpiry) {
      return this.serviceCache;
    }

    this.serviceCache = this.catalog.getServiceCatalog();
    this.cacheExpiry = now + this.cacheTTL;

    return this.serviceCache;
  }

  async executeService(serviceId: string, params: unknown) {
    return await this.catalog.executeService(serviceId, params);
  }
}
```

### Parallel Execution

Execute multiple services in parallel:

```typescript
async function parallelResearch(topics: string[]) {
  const catalog = new SponsorServiceCatalog(config);

  const promises = topics.map(topic =>
    catalog.executeService('dark-research', {
      query: topic,
      depth: 'standard',
      maxResults: 10,
    })
  );

  return await Promise.all(promises);
}

// Execute 5 research queries simultaneously
const results = await parallelResearch([
  'AI trends',
  'Blockchain adoption',
  'DeFi protocols',
  'NFT markets',
  'Web3 infrastructure',
]);
```

### Cost Optimization

Choose cost-effective services:

```typescript
function findCheapestService(category: string) {
  const catalog = new SponsorServiceCatalog(config);
  const services = catalog.getServiceCatalog();

  const categoryServices = services.filter(s => s.category === category);

  return categoryServices.reduce((cheapest, current) =>
    current.pricePerCall < cheapest.pricePerCall ? current : cheapest
  );
}

// Find cheapest research service
const cheapestResearch = findCheapestService('Research');
console.log(`Cheapest research: ${cheapestResearch.name} at $${cheapestResearch.pricePerCall}`);
```

## Related Documentation

- [Dark Research Integration](./dark.md) - AI research and analysis
- [Triton Integration](./triton.md) - Historical blockchain data
- [Gradient Integration](./gradient.md) - Distributed AI inference
- [OM1 Integration](./om1.md) - Trading automation
- [X402 Core](../core/x042-middleware.md) - Payment middleware
- [Service Provider](../core/service-provider.md) - Building x402 services

## Support

- [GitHub Repository](https://github.com/collinsville22/x402-upl)
- [GitHub Issues](https://github.com/collinsville22/x402-upl/issues)
- [Documentation](https://collinsville22.github.io/x402-upl/)
