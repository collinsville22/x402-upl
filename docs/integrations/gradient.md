# Gradient Parallax Integration

## Overview

The Gradient Parallax integration provides a production-ready framework for building autonomous AI agents powered by distributed inference infrastructure and the x402 economic layer. This integration combines:

- **Gradient Parallax**: Distributed LLM inference across multiple nodes using pipeline parallelism
- **x402 Network**: Decentralized service discovery, micropayments, and reputation system
- **Autonomous Agents**: ReAct-style reasoning with tool execution and economic decision-making
- **Solana Blockchain**: Fast, low-cost payments for AI inference services

The integration enables developers to build cost-efficient AI agents that can discover services, manage budgets, execute distributed inference, and make autonomous economic decisions in a decentralized marketplace.

## Features

### Core Capabilities

- **Distributed LLM Inference**: Execute inference across multiple Parallax nodes with automatic load balancing
- **ReAct Agent Framework**: Autonomous reasoning with iterative tool execution
- **Service Discovery**: Find and rank AI services by price, reputation, and value
- **Automated Payments**: Seamless micropayments via Solana blockchain
- **Budget Management**: Hourly spending limits, reserve minimums, and cost tracking
- **Economic Metrics**: Real-time tracking of spending, earnings, and cost savings
- **Visa TAP Authentication**: Cryptographic agent identity and authenticated service access
- **Redis Caching**: Optional distributed caching for service discovery results
- **Event-Driven Architecture**: Comprehensive event system for monitoring and logging

### Agent Tools

Built-in tools available to agents:

1. **Parallax Inference Tool**: Execute LLM inference using distributed nodes
2. **Service Discovery Tool**: Find and compare services from x402 network
3. **Wallet Info Tool**: Check balances, spending limits, and payment history

### Economic Features

- Spending limits per hour with automatic enforcement
- Reserve minimum balance protection
- Cost tracking and comparison vs. centralized services
- Value-based service ranking (reputation/price ratio)
- Payment history and transaction logging
- Net profit/loss tracking

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    X402ParallaxAgent                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │  AgentBrain  │   │   ClusterMgr │   │   Discovery  │   │
│  │  (ReAct)     │   │   (Health)   │   │   (Redis)    │   │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   │
│         │                   │                   │            │
│  ┌──────▼───────────────────▼───────────────────▼───────┐  │
│  │              ParallaxX402Client                       │  │
│  │        (Distributed Inference + Payments)            │  │
│  └──────┬────────────────────────────────────────────┬──┘  │
│         │                                              │     │
└─────────┼──────────────────────────────────────────────┼────┘
          │                                              │
    ┌─────▼─────────┐                           ┌────────▼────────┐
    │   Parallax    │                           │  SolanaX402     │
    │   Scheduler   │                           │     Client      │
    │  (Inference)  │                           │   (Payments)    │
    └───┬───────────┘                           └────────┬────────┘
        │                                                 │
   ┌────▼───────┐                                  ┌─────▼─────┐
   │ Node Pool  │                                  │  Solana   │
   │ (Workers)  │                                  │ Blockchain│
   └────────────┘                                  └───────────┘
```

### Parallax Inference Flow

1. **Initialization**:
   - ClusterManager polls scheduler for node status
   - Waits for all configured nodes to be ready
   - Establishes WebSocket connections for inference

2. **Inference Request**:
   - Agent sends chat completion request to scheduler
   - Scheduler distributes work across pipeline stages
   - Nodes execute layers in parallel with KV cache sharing
   - Results streamed back to agent

3. **Payment Flow**:
   - Service discovery queries x402 registry
   - Agent ranks services by value score
   - Payment initiated via SolanaX402Client
   - Transaction signed and submitted to blockchain
   - Confirmation and metrics recorded

### Service Discovery Architecture

```
Agent Request
     │
     ▼
ServiceDiscovery
     │
     ├──► Redis Cache (if configured)
     │    └──► Cache Hit? → Return cached results
     │
     └──► X402RegistryClient
          │
          ▼
     HTTP GET /services/discover
          │
          ▼
     X402 Registry API
          │
          ▼
     Service Rankings
          │
          └──► Value Score = reputation / max(price, 0.001)
```

## Installation

### Prerequisites

- Node.js >= 20.0.0
- A Solana wallet with SOL for transaction fees
- Access to a Parallax scheduler (local or remote)
- Optional: Redis instance for distributed caching

### Install Package

```bash
npm install @x402-upl/integration-gradient
```

### Install Dependencies

The integration requires these peer dependencies:

```bash
npm install @x402-upl/sdk @x402-upl/core @solana/web3.js @solana/spl-token ws ioredis zod
```

### Setup Parallax Nodes

For local development, set up a Parallax cluster:

```bash
# Clone Parallax repository
git clone https://github.com/gradient-ai/parallax
cd parallax

# Install dependencies
pip install -r requirements.txt

# Start scheduler
python -m parallax.scheduler --port 8080 --model llama-3-70b

# Start worker nodes (in separate terminals)
python -m parallax.worker --port 8081 --start-layer 0 --end-layer 20
python -m parallax.worker --port 8082 --start-layer 20 --end-layer 40
python -m parallax.worker --port 8083 --start-layer 40 --end-layer 60
```

### Setup X402 Registry

Start the x402 service registry:

```bash
# Start registry server
npm run dev:registry

# Or use Docker
docker run -p 3001:3001 x402/registry:latest
```

## Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
X402_WALLET_PATH=./wallet.json
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Parallax Configuration
PARALLAX_SCHEDULER_URL=http://localhost:8080
PARALLAX_MODEL=llama-3-70b

# X402 Configuration
X402_REGISTRY_URL=http://localhost:3001
X402_FACILITATOR_URL=http://localhost:4001
X402_SPENDING_LIMIT=100
X402_RESERVE_MINIMUM=50

# Optional: Redis Caching
REDIS_URL=redis://localhost:6379

# Optional: Visa TAP
TAP_REGISTRY_URL=http://localhost:8001
TAP_AGENT_NAME=my-gradient-agent
TAP_AGENT_DOMAIN=agent.example.com
TAP_CONTACT_EMAIL=admin@example.com
```

### Network Settings

#### Solana Networks

```typescript
const networks = {
  mainnet: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    network: 'mainnet-beta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  },
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    network: 'devnet',
    usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
  },
  testnet: {
    rpcUrl: 'https://api.testnet.solana.com',
    network: 'testnet',
    usdcMint: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp'
  }
};
```

#### Parallax Cluster Configuration

```typescript
const parallaxConfig = {
  // Local development cluster
  local: {
    schedulerUrl: 'http://localhost:8080',
    nodes: [
      { nodeId: 'node-0', host: 'localhost', port: 8081 },
      { nodeId: 'node-1', host: 'localhost', port: 8082 },
      { nodeId: 'node-2', host: 'localhost', port: 8083 }
    ],
    isLocalNetwork: true
  },

  // Production cluster
  production: {
    schedulerUrl: 'https://scheduler.parallax.network',
    nodes: [
      { nodeId: 'prod-0', host: 'node0.parallax.network', port: 443 },
      { nodeId: 'prod-1', host: 'node1.parallax.network', port: 443 }
    ],
    isLocalNetwork: false
  }
};
```

## Usage

### Basic Agent Creation

```typescript
import { Keypair } from '@solana/web3.js';
import { X402ParallaxAgent } from '@x402-upl/integration-gradient';
import * as fs from 'fs';

// Load wallet
const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

// Create agent
const agent = new X402ParallaxAgent({
  parallax: {
    schedulerUrl: 'http://localhost:8080',
    model: 'llama-3-70b',
    nodes: [
      { nodeId: 'node-0', host: 'localhost', port: 8081 },
      { nodeId: 'node-1', host: 'localhost', port: 8082 }
    ],
    isLocalNetwork: true
  },
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    wallet,
    network: 'devnet'
  },
  x402: {
    registryUrl: 'http://localhost:3001',
    spendingLimitPerHour: 100,
    reserveMinimum: 50
  },
  agent: {
    name: 'my-agent',
    systemPrompt: 'You are an autonomous AI agent with access to distributed inference.',
    tools: [],
    maxIterations: 10,
    budget: 50
  }
});

// Initialize and run
await agent.initialize();
const result = await agent.run('Explain quantum computing in 100 words');
console.log(result.answer);

await agent.shutdown();
```

### Service Discovery

```typescript
import { ServiceDiscovery } from '@x402-upl/integration-gradient';

// Create discovery client
const discovery = new ServiceDiscovery({
  registryUrl: 'http://localhost:3001',
  cacheTimeout: 60000, // 1 minute cache
  redisUrl: 'redis://localhost:6379' // optional
});

// Discover services
const services = await discovery.discoverServices({
  category: 'ai-inference',
  maxPrice: 0.01,
  minReputation: 3.5,
  limit: 10
});

console.log(`Found ${services.length} services`);

// Rank by value
const ranked = discovery.rankServicesByValue(services, 'value');
console.log('Best value service:', ranked[0].service.name);
console.log('Value score:', ranked[0].valueScore);

// Find single best service
const best = await discovery.findBestService({
  category: 'ai-inference',
  optimizeFor: 'value'
});

console.log('Best service:', best?.name, '- Price:', best?.pricePerCall);
```

### Event Monitoring

```typescript
// Cluster events
agent.on('cluster:operational', () => {
  console.log('All Parallax nodes are ready');
});

agent.on('node:ready', ({ nodeId }) => {
  console.log(`Node ${nodeId} is ready`);
});

// Task execution events
agent.on('task:started', ({ task, conversationId }) => {
  console.log(`Task started: ${task}`);
});

agent.on('iteration:start', ({ iteration }) => {
  console.log(`Iteration ${iteration} started`);
});

agent.on('tool:executing', ({ toolName, args }) => {
  console.log(`Executing tool: ${toolName}`, args);
});

agent.on('tool:executed', ({ toolName, success, cost, latencyMs }) => {
  console.log(`Tool ${toolName} completed:`, { success, cost, latencyMs });
});

// Payment events
agent.on('payment:success', ({ amount, currency, signature }) => {
  console.log(`Payment successful: ${amount} ${currency}`);
  console.log(`Transaction: ${signature}`);
});

agent.on('payment:error', ({ error }) => {
  console.error('Payment failed:', error);
});

// Discovery events
agent.on('discovery:success', ({ count, category }) => {
  console.log(`Discovered ${count} services in category ${category}`);
});

agent.on('discovery:cache_hit', ({ cacheKey }) => {
  console.log('Service discovery cache hit');
});

// Inference events
agent.on('inference:complete', (metrics) => {
  console.log('Inference completed:', {
    latency: metrics.totalLatencyMs,
    tokens: metrics.totalTokens,
    throughput: metrics.throughputTokensPerSec
  });
});
```

### Custom Tools

Create custom tools for your agent:

```typescript
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from '@x402-upl/integration-gradient';

class WeatherTool extends BaseTool {
  constructor() {
    super({
      name: 'get_weather',
      description: 'Get current weather for a city',
      parameters: {
        city: {
          type: 'string',
          description: 'City name'
        },
        units: {
          type: 'string',
          description: 'Temperature units (celsius or fahrenheit)'
        }
      },
      required: ['city']
    });
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();

    try {
      this.validateArgs(args);

      // Call weather API
      const response = await fetch(
        `https://api.weather.com/v1/current?city=${args.city}&units=${args.units || 'celsius'}`
      );
      const data = await response.json();

      return {
        success: true,
        result: {
          temperature: data.temp,
          conditions: data.conditions,
          humidity: data.humidity
        },
        latencyMs: performance.now() - startTime,
        cost: 0.001 // Cost in USDC
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: performance.now() - startTime
      };
    }
  }
}

// Add to agent
const agent = new X402ParallaxAgent({
  // ... config
  customTools: [new WeatherTool()]
});
```

### Streaming Inference

```typescript
import { ParallaxClient } from '@x402-upl/integration-gradient';

const client = new ParallaxClient({
  schedulerUrl: 'http://localhost:8080',
  model: 'llama-3-70b'
});

let fullResponse = '';

await client.streamChatCompletion(
  {
    model: 'llama-3-70b',
    messages: [
      { role: 'user', content: 'Write a poem about AI' }
    ],
    max_tokens: 500
  },
  (chunk) => {
    // Handle each token
    process.stdout.write(chunk);
    fullResponse += chunk;
  },
  (metrics) => {
    // Handle final metrics
    console.log('\n\nMetrics:', {
      latency: metrics.totalLatencyMs,
      ttft: metrics.ttftMs,
      throughput: metrics.throughputTokensPerSec
    });
  }
);

console.log('\nFull response:', fullResponse);
```

## API Reference

### X402ParallaxAgent

Main agent class combining Parallax inference and x402 payments.

#### Constructor

```typescript
new X402ParallaxAgent(config: X402ParallaxAgentConfig)
```

**Parameters:**

- `config.parallax`: Parallax cluster configuration
  - `schedulerUrl` (string): URL of Parallax scheduler
  - `model` (string): Model name/path
  - `nodes` (array): Array of node configurations
  - `isLocalNetwork` (boolean): Whether cluster is local
- `config.solana`: Solana blockchain configuration
  - `rpcUrl` (string): Solana RPC endpoint
  - `wallet` (Keypair): Solana wallet keypair
  - `network` (string): Network name (mainnet-beta, devnet, testnet)
- `config.x402`: X402 network configuration
  - `registryUrl` (string): X402 registry API URL
  - `facilitatorUrl` (string, optional): Payment facilitator URL
  - `spendingLimitPerHour` (number, optional): Max spend per hour in USDC
  - `reserveMinimum` (number, optional): Minimum balance to maintain
- `config.agent`: Agent behavior configuration
  - `name` (string): Agent identifier
  - `systemPrompt` (string): System instructions for agent
  - `tools` (array): Additional tool configurations
  - `maxIterations` (number): Maximum reasoning iterations
  - `budget` (number, optional): Total budget for task
- `config.customTools` (array, optional): Custom tool instances

#### Methods

##### initialize()

Initialize the agent and Parallax cluster.

```typescript
await agent.initialize(): Promise<void>
```

Starts cluster manager, waits for nodes to be operational, and performs health checks.

**Throws:** Error if cluster fails to become operational or health check fails.

##### run()

Execute a task with autonomous reasoning.

```typescript
await agent.run(task: string): Promise<AgentExecutionResult>
```

**Parameters:**
- `task` (string): Task description or question for the agent

**Returns:**
```typescript
{
  success: boolean;
  answer?: string;
  totalCost: number;
  iterations: number;
  error?: string;
}
```

##### shutdown()

Gracefully shut down the agent.

```typescript
await agent.shutdown(): Promise<void>
```

Stops cluster manager and cleans up resources.

##### getClusterStatus()

Get current Parallax cluster status.

```typescript
agent.getClusterStatus(): ClusterStatus
```

**Returns:**
```typescript
{
  schedulerUrl: string;
  model: string;
  nodes: ClusterNode[];
  totalNodes: number;
  readyNodes: number;
  isOperational: boolean;
}
```

##### getEconomicMetrics()

Get economic metrics for the agent.

```typescript
agent.getEconomicMetrics(): EconomicMetrics
```

**Returns:**
```typescript
{
  totalSpent: number;
  totalEarned: number;
  netProfit: number;
  transactionCount: number;
  averageCostPerInference: number;
  costSavingsVsHosted?: number;
}
```

##### getWalletBalance()

Get wallet balance for a currency.

```typescript
await agent.getWalletBalance(currency?: string): Promise<number>
```

**Parameters:**
- `currency` (string, optional): Currency code (default: 'SOL')

**Returns:** Balance as number

##### getRemainingBudget()

Get remaining hourly spending budget.

```typescript
agent.getRemainingBudget(): number
```

**Returns:** Remaining budget in USDC

##### getAgentState()

Get current agent state.

```typescript
agent.getAgentState(): AgentState
```

**Returns:**
```typescript
{
  conversationId: string;
  messages: ChatMessage[];
  totalCost: number;
  iterationCount: number;
  isComplete: boolean;
  finalAnswer?: string;
}
```

##### getPaymentHistory()

Get payment transaction history.

```typescript
agent.getPaymentHistory(limit?: number): PaymentRecord[]
```

**Parameters:**
- `limit` (number, optional): Maximum number of records

**Returns:** Array of payment records

##### getWalletAddress()

Get agent's Solana wallet address.

```typescript
agent.getWalletAddress(): string
```

**Returns:** Base58-encoded public key

### TAPEnabledGradientAgent

Extended agent with Visa TAP authentication support.

#### Constructor

```typescript
new TAPEnabledGradientAgent(config: TAPEnabledAgentConfig)
```

Extends `X402ParallaxAgentConfig` with additional `tap` configuration:

```typescript
{
  tap: {
    registryUrl?: string;
    name: string;
    domain: string;
    description?: string;
    contactEmail?: string;
    algorithm?: 'ed25519' | 'rsa-pss-sha256';
  };
  ownerDID: string;
}
```

#### Methods

##### callServiceWithTAP()

Call a service with TAP authentication.

```typescript
await agent.callServiceWithTAP(
  url: string,
  options?: { tag?: 'agent-browser-auth' | 'agent-payer-auth' }
): Promise<any>
```

**Parameters:**
- `url` (string): Service URL
- `options.tag` (string, optional): Authentication tag type

**Returns:** Service response

##### executeTaskWithTAP()

Execute a task with TAP identity.

```typescript
await agent.executeTaskWithTAP(task: string): Promise<any>
```

**Parameters:**
- `task` (string): Task description

**Returns:** Execution result

##### getTAPIdentity()

Get TAP identity information.

```typescript
agent.getTAPIdentity(): TAPIdentity | null
```

**Returns:**
```typescript
{
  keyId: string;
  algorithm: string;
  publicKey: string;
  agent: AgentResponse | null;
} | null
```

##### isTAPRegistered()

Check if TAP is registered.

```typescript
agent.isTAPRegistered(): boolean
```

##### exportTAPPrivateKey()

Export TAP private key for backup.

```typescript
agent.exportTAPPrivateKey(): string | null
```

**Returns:** PEM-encoded private key or null

##### loadFromTAPRegistry() (static)

Load agent with existing TAP credentials.

```typescript
await TAPEnabledGradientAgent.loadFromTAPRegistry(
  config: TAPEnabledAgentConfig,
  tapPrivateKey: string,
  tapKeyId: string
): Promise<TAPEnabledGradientAgent>
```

**Parameters:**
- `config`: Agent configuration
- `tapPrivateKey`: PEM-encoded private key
- `tapKeyId`: TAP key identifier

**Returns:** Initialized agent instance

### ServiceDiscovery

Service discovery and ranking client.

#### Constructor

```typescript
new ServiceDiscovery(config: DiscoveryConfig)
```

**Parameters:**
- `config.registryUrl` (string): X402 registry URL
- `config.cacheTimeout` (number, optional): Cache TTL in milliseconds (default: 60000)
- `config.redisUrl` (string, optional): Redis connection URL

#### Methods

##### discoverServices()

Discover services matching criteria.

```typescript
await discovery.discoverServices(
  request?: ServiceDiscoveryRequest
): Promise<ServiceInfo[]>
```

**Parameters:**
```typescript
{
  category?: string;
  maxPrice?: number;
  minReputation?: number;
  limit?: number;
}
```

**Returns:** Array of service information

##### rankServicesByValue()

Rank services by value score.

```typescript
discovery.rankServicesByValue(
  services: ServiceInfo[],
  optimizeFor?: 'value' | 'price' | 'reputation'
): ValueScore[]
```

**Parameters:**
- `services`: Array of services to rank
- `optimizeFor`: Optimization strategy (default: 'value')

**Returns:**
```typescript
Array<{
  service: ServiceInfo;
  valueScore: number;
  priceScore: number;
  reputationScore: number;
}>
```

##### findBestService()

Find single best service.

```typescript
await discovery.findBestService(
  request: ServiceDiscoveryRequest & { optimizeFor?: string }
): Promise<ServiceInfo | null>
```

##### compareServices()

Compare multiple services.

```typescript
await discovery.compareServices(
  request: ServiceDiscoveryRequest,
  minimumComparisons?: number
): Promise<ValueScore[]>
```

##### clearCache()

Clear discovery cache.

```typescript
await discovery.clearCache(): Promise<void>
```

##### disconnect()

Disconnect from Redis.

```typescript
await discovery.disconnect(): Promise<void>
```

### ClusterManager

Manages Parallax cluster health and status.

#### Constructor

```typescript
new ClusterManager(config: ParallaxClusterConfig)
```

#### Methods

##### start()

Start cluster monitoring.

```typescript
await manager.start(): Promise<void>
```

##### stop()

Stop cluster monitoring.

```typescript
await manager.stop(): Promise<void>
```

##### getStatus()

Get cluster status.

```typescript
manager.getStatus(): ClusterStatus
```

##### getNodeById()

Get specific node information.

```typescript
manager.getNodeById(nodeId: string): ClusterNode | undefined
```

##### waitUntilOperational()

Wait for cluster to become operational.

```typescript
await manager.waitUntilOperational(timeoutMs?: number): Promise<boolean>
```

**Parameters:**
- `timeoutMs` (number, optional): Timeout in milliseconds (default: 60000)

**Returns:** true if operational, false if timeout

### ParallaxClient

Low-level Parallax inference client.

#### Constructor

```typescript
new ParallaxClient(config: ParallaxClientConfig)
```

**Parameters:**
- `config.schedulerUrl` (string): Scheduler URL
- `config.model` (string, optional): Model name
- `config.timeout` (number, optional): Request timeout in ms

#### Methods

##### chatCompletion()

Execute chat completion.

```typescript
await client.chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse>
```

##### streamChatCompletion()

Stream chat completion.

```typescript
await client.streamChatCompletion(
  request: ChatCompletionRequest,
  onChunk: (chunk: string) => void,
  onMetrics?: (metrics: InferenceMetrics) => void
): Promise<void>
```

##### healthCheck()

Check scheduler health.

```typescript
await client.healthCheck(): Promise<boolean>
```

##### getSchedulerUrl()

Get configured scheduler URL.

```typescript
client.getSchedulerUrl(): string
```

##### getModel()

Get configured model name.

```typescript
client.getModel(): string
```

## Examples

### Example 1: Economic Research Agent

An agent that discovers and compares AI services for cost-effective research.

```typescript
import { Keypair } from '@solana/web3.js';
import { X402ParallaxAgent } from '@x402-upl/integration-gradient';
import * as fs from 'fs';

const wallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('./wallet.json', 'utf-8')))
);

const agent = new X402ParallaxAgent({
  parallax: {
    schedulerUrl: 'http://localhost:8080',
    model: 'llama-3-70b',
    nodes: [
      { nodeId: 'node-0', host: 'localhost', port: 8081 },
      { nodeId: 'node-1', host: 'localhost', port: 8082 }
    ],
    isLocalNetwork: true
  },
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    wallet,
    network: 'devnet'
  },
  x402: {
    registryUrl: 'http://localhost:3001',
    spendingLimitPerHour: 200,
    reserveMinimum: 100
  },
  agent: {
    name: 'economic-research-agent',
    systemPrompt: `You are an autonomous economic research agent.

Your capabilities:
- Use Parallax for distributed LLM inference
- Discover and compare AI services from x402 network
- Make cost-effective service selections
- Track spending and optimize for value

Always compare at least 3 services before making decisions.
Optimize for value (reputation/price ratio).`,
    tools: [],
    maxIterations: 15,
    budget: 50
  }
});

// Event monitoring
agent.on('discovery:success', ({ count }) => {
  console.log(`Discovered ${count} services`);
});

agent.on('payment:success', ({ amount, signature }) => {
  console.log(`Payment: ${amount} USDC - ${signature}`);
});

await agent.initialize();

const result = await agent.run(`
  Research decentralized AI inference networks.
  Compare at least 3 services from x402 network.
  Analyze pricing, reputation, and capabilities.
  Recommend best value option for distributed LLM inference.
`);

console.log('Answer:', result.answer);
console.log('Total Cost:', result.totalCost, 'USDC');
console.log('Iterations:', result.iterations);

const metrics = agent.getEconomicMetrics();
console.log('Economic Metrics:', {
  totalSpent: metrics.totalSpent,
  avgCost: metrics.averageCostPerInference,
  transactions: metrics.transactionCount
});

await agent.shutdown();
```

### Example 2: Cost Optimization Agent

Agent designed to demonstrate maximum cost savings.

```typescript
import { Keypair } from '@solana/web3.js';
import { X402ParallaxAgent } from '@x402-upl/integration-gradient';

const agent = new X402ParallaxAgent({
  parallax: {
    schedulerUrl: 'http://localhost:8080',
    model: 'llama-3-8b',
    nodes: [
      { nodeId: 'node-0', host: 'localhost', port: 8081 },
      { nodeId: 'node-1', host: 'localhost', port: 8082 }
    ],
    isLocalNetwork: true
  },
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    wallet: Keypair.generate(),
    network: 'devnet'
  },
  x402: {
    registryUrl: 'http://localhost:3001',
    spendingLimitPerHour: 500
  },
  agent: {
    name: 'cost-optimizer',
    systemPrompt: `You are an economic optimization agent.

Strategies:
1. Always discover and compare at least 5 services
2. Calculate value score as (reputation / price)
3. Use Parallax when available (usually cheapest)
4. Track cost savings vs centralized APIs
5. Provide detailed cost analysis`,
    tools: [],
    maxIterations: 20,
    budget: 100
  }
});

let totalSavings = 0;

agent.on('payment:success', ({ amount }) => {
  const centralizedCost = amount * 5; // Assume 5x more expensive
  const savings = centralizedCost - amount;
  totalSavings += savings;

  console.log(`Saved ${savings.toFixed(2)} USDC (${((savings/centralizedCost)*100).toFixed(0)}%)`);
});

await agent.initialize();

const tasks = [
  'Explain distributed inference in 100 words',
  'Compare pipeline vs model parallelism',
  'Describe benefits of KV cache sharing',
  'List 5 advantages of P2P AI networks'
];

for (const task of tasks) {
  const result = await agent.run(task);
  console.log(`Task: ${task}`);
  console.log(`Cost: ${result.totalCost.toFixed(4)} USDC\n`);
}

const metrics = agent.getEconomicMetrics();
console.log('Final Results:');
console.log(`Total Saved: ${totalSavings.toFixed(2)} USDC`);
console.log(`Avg Cost/Task: ${(metrics.totalSpent / tasks.length).toFixed(4)} USDC`);

await agent.shutdown();
```

### Example 3: Multi-Agent Collaboration

Multiple agents working together with shared budget.

```typescript
import { X402ParallaxAgent } from '@x402-upl/integration-gradient';
import { Keypair } from '@solana/web3.js';

// Shared wallet for all agents
const sharedWallet = Keypair.generate();

// Research agent
const researcher = new X402ParallaxAgent({
  parallax: {
    schedulerUrl: 'http://localhost:8080',
    model: 'llama-3-70b',
    nodes: [
      { nodeId: 'node-0', host: 'localhost', port: 8081 },
      { nodeId: 'node-1', host: 'localhost', port: 8082 }
    ],
    isLocalNetwork: true
  },
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    wallet: sharedWallet,
    network: 'devnet'
  },
  x402: {
    registryUrl: 'http://localhost:3001',
    spendingLimitPerHour: 50
  },
  agent: {
    name: 'researcher',
    systemPrompt: 'You are a research agent. Gather information and summarize findings.',
    tools: [],
    maxIterations: 10,
    budget: 25
  }
});

// Analysis agent
const analyzer = new X402ParallaxAgent({
  parallax: {
    schedulerUrl: 'http://localhost:8080',
    model: 'llama-3-70b',
    nodes: [
      { nodeId: 'node-0', host: 'localhost', port: 8081 },
      { nodeId: 'node-1', host: 'localhost', port: 8082 }
    ],
    isLocalNetwork: true
  },
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    wallet: sharedWallet,
    network: 'devnet'
  },
  x402: {
    registryUrl: 'http://localhost:3001',
    spendingLimitPerHour: 50
  },
  agent: {
    name: 'analyzer',
    systemPrompt: 'You are an analysis agent. Analyze data and provide insights.',
    tools: [],
    maxIterations: 10,
    budget: 25
  }
});

await Promise.all([
  researcher.initialize(),
  analyzer.initialize()
]);

// Step 1: Research
const researchResult = await researcher.run(
  'Research the current state of distributed AI inference. Focus on cost and performance.'
);

console.log('Research findings:', researchResult.answer);

// Step 2: Analyze
const analysisResult = await analyzer.run(
  `Analyze these research findings and provide actionable insights:\n\n${researchResult.answer}`
);

console.log('Analysis:', analysisResult.answer);

// Combined metrics
const researcherMetrics = researcher.getEconomicMetrics();
const analyzerMetrics = analyzer.getEconomicMetrics();

console.log('Total collaboration cost:',
  researcherMetrics.totalSpent + analyzerMetrics.totalSpent, 'USDC'
);

await Promise.all([
  researcher.shutdown(),
  analyzer.shutdown()
]);
```

### Example 4: TAP-Enabled Agent

Agent with Visa TAP authentication for secure service access.

```typescript
import { Keypair } from '@solana/web3.js';
import { TAPEnabledGradientAgent } from '@x402-upl/integration-gradient';

const agent = new TAPEnabledGradientAgent({
  parallax: {
    schedulerUrl: 'http://localhost:8080',
    model: 'llama-3-70b',
    nodes: [
      { nodeId: 'node-0', host: 'localhost', port: 8081 }
    ],
    isLocalNetwork: true
  },
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    wallet: Keypair.generate(),
    network: 'devnet'
  },
  x402: {
    registryUrl: 'http://localhost:3001',
    spendingLimitPerHour: 100
  },
  agent: {
    name: 'TAP Agent',
    systemPrompt: 'You are an authenticated AI agent with TAP credentials.',
    tools: [],
    maxIterations: 10
  },
  tap: {
    registryUrl: 'http://localhost:8001',
    name: 'Gradient AI Agent',
    domain: 'agent.gradient.network',
    description: 'Distributed inference agent with TAP auth',
    contactEmail: 'admin@gradient.network',
    algorithm: 'ed25519'
  },
  ownerDID: 'did:x402:owner:alice'
});

agent.on('tap:registered', ({ keyId, algorithm }) => {
  console.log('TAP registered:', { keyId, algorithm });
});

await agent.initialize();

// Get TAP identity
const identity = agent.getTAPIdentity();
console.log('TAP Identity:', {
  keyId: identity?.keyId,
  algorithm: identity?.algorithm,
  publicKey: identity?.publicKey.slice(0, 50) + '...'
});

// Execute task with TAP authentication
const result = await agent.executeTaskWithTAP(
  'Find the best AI model API for sentiment analysis'
);

// Export credentials for later use
const privateKey = agent.exportTAPPrivateKey();
console.log('Save this private key to restore agent later');

await agent.shutdown();

// Later: Reload agent with saved credentials
const restoredAgent = await TAPEnabledGradientAgent.loadFromTAPRegistry(
  {
    // ... same config
  },
  privateKey!,
  identity!.keyId
);

console.log('Agent restored with TAP credentials');
```

### Example 5: Streaming Inference with Metrics

Real-time streaming with detailed performance tracking.

```typescript
import { ParallaxClient } from '@x402-upl/integration-gradient';

const client = new ParallaxClient({
  schedulerUrl: 'http://localhost:8080',
  model: 'llama-3-70b',
  timeout: 120000
});

// Track metrics
let tokenCount = 0;
let startTime: number;

console.log('Streaming response:\n');

await client.streamChatCompletion(
  {
    model: 'llama-3-70b',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.'
      },
      {
        role: 'user',
        content: 'Explain the benefits of distributed AI inference in detail.'
      }
    ],
    max_tokens: 1000,
    temperature: 0.7
  },
  (chunk) => {
    // Stream each token
    process.stdout.write(chunk);
    tokenCount++;

    if (!startTime) {
      startTime = performance.now();
    }
  },
  (metrics) => {
    // Final metrics
    const elapsed = (performance.now() - startTime) / 1000;

    console.log('\n\n=== Performance Metrics ===');
    console.log('Total Latency:', metrics.totalLatencyMs?.toFixed(0), 'ms');
    console.log('Time to First Token:', metrics.ttftMs?.toFixed(0), 'ms');
    console.log('Prompt Tokens:', metrics.promptTokens);
    console.log('Completion Tokens:', metrics.completionTokens);
    console.log('Total Tokens:', metrics.totalTokens);
    console.log('Throughput:', metrics.throughputTokensPerSec?.toFixed(2), 'tokens/sec');
    console.log('Tokens Streamed:', tokenCount);
    console.log('Stream Duration:', elapsed.toFixed(2), 'seconds');
  }
);
```

## Integration with X402

### Payment Flow

The x402 integration automates the entire payment workflow:

1. **Service Discovery**:
   - Query x402 registry for available services
   - Filter by category, price, reputation
   - Rank services by value score

2. **Service Selection**:
   - Agent evaluates service options
   - Calculates value score: `reputation / max(price, 0.001)`
   - Selects highest value service

3. **Payment Initiation**:
   - Create payment request with recipient, amount, memo
   - Check spending limits and reserve minimum
   - Sign transaction with agent wallet

4. **Transaction Execution**:
   - Submit to Solana blockchain
   - Wait for confirmation
   - Record transaction in payment history

5. **Service Invocation**:
   - Include payment proof in service request
   - Execute service call
   - Receive and process response

6. **Metrics Recording**:
   - Update total spent
   - Calculate average cost per inference
   - Track cost savings vs centralized services

### Service Discovery Process

```typescript
import { ServiceDiscovery } from '@x402-upl/integration-gradient';

const discovery = new ServiceDiscovery({
  registryUrl: 'http://localhost:3001',
  redisUrl: 'redis://localhost:6379'
});

// Step 1: Discover services
const services = await discovery.discoverServices({
  category: 'ai-inference',
  maxPrice: 0.01,        // Max 1 cent per call
  minReputation: 3.0,    // Min 3/5 stars
  limit: 10
});

// Step 2: Rank by value
const ranked = discovery.rankServicesByValue(services, 'value');

// Step 3: Select best service
const best = ranked[0];

console.log('Selected service:', {
  name: best.service.name,
  price: best.service.pricePerCall,
  reputation: best.service.reputation,
  valueScore: best.valueScore,
  provider: best.service.provider
});

// Step 4: Make payment and call service
// (handled automatically by agent)
```

### Reputation System

Services in the x402 network have reputation scores:

- **Range**: 0 to 5 (star rating system)
- **Factors**: Uptime, latency, accuracy, user ratings
- **Updates**: Real-time based on service performance
- **Impact**: Higher reputation = higher value score

```typescript
// Reputation in service info
interface ServiceInfo {
  reputation: number;      // 0-5 rating
  totalRatings: number;    // Number of ratings
  uptime: number;          // Percentage uptime
  averageLatency: number;  // Average response time
}

// Value calculation
const valueScore = (service.reputation / Math.max(service.pricePerCall, 0.001));

// Agents optimize for highest value score
```

### Economic Optimization

The integration implements several cost-optimization strategies:

#### 1. Service Comparison
Always compare multiple services before selection:

```typescript
const comparison = await discovery.compareServices({
  category: 'ai-inference',
  maxPrice: 0.02
}, 5); // Compare at least 5 services

console.log('Top 3 services by value:');
comparison.slice(0, 3).forEach((scored, i) => {
  console.log(`${i+1}. ${scored.service.name}`);
  console.log(`   Price: $${scored.service.pricePerCall}`);
  console.log(`   Reputation: ${scored.service.reputation}/5`);
  console.log(`   Value: ${scored.valueScore.toFixed(2)}`);
});
```

#### 2. Spending Limits
Automatic enforcement of hourly budgets:

```typescript
const agent = new X402ParallaxAgent({
  // ...
  x402: {
    registryUrl: 'http://localhost:3001',
    spendingLimitPerHour: 100,  // Max $100/hour
    reserveMinimum: 50           // Keep $50 reserve
  }
});

// Agent will reject payments exceeding limits
agent.on('payment:error', ({ error }) => {
  if (error.includes('spending limit')) {
    console.log('Hourly spending limit reached');
  }
});
```

#### 3. Cost Tracking
Real-time economic metrics:

```typescript
const metrics = agent.getEconomicMetrics();

console.log('Economic Performance:');
console.log('Total Spent:', metrics.totalSpent, 'USDC');
console.log('Total Earned:', metrics.totalEarned, 'USDC');
console.log('Net Profit:', metrics.netProfit, 'USDC');
console.log('Transactions:', metrics.transactionCount);
console.log('Avg Cost/Inference:', metrics.averageCostPerInference, 'USDC');

// Calculate savings vs centralized
const centralizedCost = metrics.totalSpent * 5; // Assume 5x more
const savings = centralizedCost - metrics.totalSpent;
console.log('Savings:', savings, 'USDC', `(${(savings/centralizedCost*100).toFixed(0)}%)`);
```

## Troubleshooting

### Issue 1: Cluster Nodes Not Connecting

**Symptoms**: `cluster:error` events, nodes stuck in 'pending' status

**Solutions**:
1. Check Parallax scheduler is running:
   ```bash
   curl http://localhost:8080/health
   ```

2. Verify node configuration matches scheduler:
   ```typescript
   // Ensure ports match actual node ports
   nodes: [
     { nodeId: 'node-0', host: 'localhost', port: 8081 },
     { nodeId: 'node-1', host: 'localhost', port: 8082 }
   ]
   ```

3. Check scheduler logs for node registration:
   ```bash
   # Parallax scheduler logs should show nodes connecting
   tail -f parallax-scheduler.log
   ```

4. Increase timeout for node readiness:
   ```typescript
   await clusterManager.waitUntilOperational(120000); // 2 minutes
   ```

### Issue 2: Payment Transaction Failures

**Symptoms**: `payment:error` events, transactions not confirming

**Solutions**:
1. Check wallet has sufficient SOL for fees:
   ```typescript
   const balance = await agent.getWalletBalance('SOL');
   console.log('SOL balance:', balance);
   // Need at least 0.01 SOL for transaction fees
   ```

2. Verify network configuration:
   ```typescript
   // Ensure RPC URL matches wallet network
   solana: {
     rpcUrl: 'https://api.devnet.solana.com',
     network: 'devnet' // Must match!
   }
   ```

3. Check USDC token account exists:
   ```bash
   spl-token accounts --owner <wallet-address>
   ```

4. Increase transaction timeout:
   ```typescript
   // In SolanaX402Client configuration
   timeout: 60000 // Increase to 60 seconds
   ```

### Issue 3: Service Discovery Returns Empty

**Symptoms**: `discoverServices()` returns empty array

**Solutions**:
1. Verify registry is running and accessible:
   ```bash
   curl http://localhost:3001/services/discover
   ```

2. Check query parameters:
   ```typescript
   // May be too restrictive
   const services = await discovery.discoverServices({
     category: 'ai-inference',
     maxPrice: 0.001,      // Too low?
     minReputation: 4.5,   // Too high?
     limit: 10
   });
   ```

3. Query without filters first:
   ```typescript
   // Get all services to see what's available
   const all = await discovery.discoverServices({});
   console.log('Total services:', all.length);
   ```

4. Clear cache and retry:
   ```typescript
   await discovery.clearCache();
   const services = await discovery.discoverServices(query);
   ```

### Issue 4: Redis Connection Errors

**Symptoms**: Redis connection errors in logs

**Solutions**:
1. Check Redis is running:
   ```bash
   redis-cli ping
   # Should return PONG
   ```

2. Verify connection string:
   ```typescript
   // Correct Redis URL format
   redisUrl: 'redis://localhost:6379'
   // Or with auth:
   redisUrl: 'redis://:password@localhost:6379'
   ```

3. Use in-memory cache instead:
   ```typescript
   // Omit redisUrl to use Map-based cache
   const discovery = new ServiceDiscovery({
     registryUrl: 'http://localhost:3001',
     // redisUrl: undefined // Optional, will use in-memory cache
   });
   ```

### Issue 5: Inference Timeouts

**Symptoms**: Requests timeout, `inference:error` events

**Solutions**:
1. Increase client timeout:
   ```typescript
   const client = new ParallaxClient({
     schedulerUrl: 'http://localhost:8080',
     model: 'llama-3-70b',
     timeout: 180000 // Increase to 3 minutes
   });
   ```

2. Reduce token limit:
   ```typescript
   await client.chatCompletion({
     model: 'llama-3-70b',
     messages: [...],
     max_tokens: 512 // Reduce from 2048
   });
   ```

3. Check cluster has sufficient nodes:
   ```typescript
   const status = agent.getClusterStatus();
   console.log('Ready nodes:', status.readyNodes, '/', status.totalNodes);
   ```

### Issue 6: Agent Stuck in Loop

**Symptoms**: Agent reaches `maxIterations` without completing

**Solutions**:
1. Improve system prompt clarity:
   ```typescript
   systemPrompt: `You are an AI agent. Use tools to gather info.

   IMPORTANT: When you have enough information, respond with:
   FINAL ANSWER: [your answer]

   Do not repeat the same tool calls.`
   ```

2. Increase iteration limit:
   ```typescript
   agent: {
     maxIterations: 20 // Increase from 10
   }
   ```

3. Add tool call tracking to prevent loops:
   ```typescript
   const usedTools = new Set();

   agent.on('tool:executing', ({ toolName, args }) => {
     const key = `${toolName}:${JSON.stringify(args)}`;
     if (usedTools.has(key)) {
       console.warn('Tool called twice with same args:', key);
     }
     usedTools.add(key);
   });
   ```

### Issue 7: TAP Registration Failures

**Symptoms**: `tap:error` events during initialization

**Solutions**:
1. Check TAP registry is accessible:
   ```bash
   curl http://localhost:8001/health
   ```

2. Verify domain configuration:
   ```typescript
   tap: {
     name: 'My Agent',
     domain: 'agent.example.com', // Must be valid domain format
     algorithm: 'ed25519'
   }
   ```

3. Check wallet has SOL for registration:
   ```typescript
   // TAP registration requires blockchain transaction
   const balance = await agent.getWalletBalance('SOL');
   console.log('SOL balance:', balance);
   ```

### Issue 8: Memory Leaks with Long-Running Agents

**Symptoms**: Increasing memory usage over time

**Solutions**:
1. Limit conversation history:
   ```typescript
   // Periodically trim conversation
   agent.on('iteration:complete', ({ iteration }) => {
     if (iteration > 50) {
       // Consider restarting agent or clearing history
     }
   });
   ```

2. Clear caches periodically:
   ```typescript
   setInterval(async () => {
     await discovery.clearCache();
   }, 3600000); // Every hour
   ```

3. Disconnect Redis when done:
   ```typescript
   await discovery.disconnect();
   ```

### Issue 9: WebSocket Connection Drops

**Symptoms**: Inference fails with connection errors

**Solutions**:
1. Implement retry logic:
   ```typescript
   let retries = 0;
   const maxRetries = 3;

   while (retries < maxRetries) {
     try {
       const result = await agent.run(task);
       break;
     } catch (error) {
       if (error.message.includes('connection')) {
         retries++;
         console.log(`Retry ${retries}/${maxRetries}`);
         await new Promise(r => setTimeout(r, 2000));
       } else {
         throw error;
       }
     }
   }
   ```

2. Check network stability:
   ```bash
   ping -c 10 scheduler-hostname
   ```

3. Use local cluster for development:
   ```typescript
   parallax: {
     schedulerUrl: 'http://localhost:8080', // Localhost is more stable
     isLocalNetwork: true
   }
   ```

### Issue 10: High Inference Costs

**Symptoms**: Economic metrics show unexpectedly high costs

**Solutions**:
1. Use smaller models:
   ```typescript
   parallax: {
     model: 'llama-3-8b' // Instead of llama-3-70b
   }
   ```

2. Reduce token limits:
   ```typescript
   max_tokens: 256 // Instead of 2048
   ```

3. Optimize service selection:
   ```typescript
   const services = await discovery.discoverServices({
     category: 'ai-inference',
     maxPrice: 0.005, // Lower max price
     optimizeFor: 'price' // Prioritize cheapest
   });
   ```

### Issue 11: Zod Validation Errors

**Symptoms**: Schema validation errors in requests/responses

**Solutions**:
1. Check request format matches schema:
   ```typescript
   // Ensure all required fields present
   const request = {
     model: 'llama-3-70b',
     messages: [
       { role: 'user', content: 'Hello' }
     ],
     max_tokens: 100 // Must be positive integer
   };
   ```

2. Validate manually before sending:
   ```typescript
   import { ChatCompletionRequestSchema } from '@x402-upl/integration-gradient';

   const result = ChatCompletionRequestSchema.safeParse(request);
   if (!result.success) {
     console.error('Validation errors:', result.error);
   }
   ```

### Issue 12: Event Handler Memory Leaks

**Symptoms**: EventEmitter warnings about max listeners

**Solutions**:
1. Remove listeners when done:
   ```typescript
   const handler = (data) => console.log(data);
   agent.on('tool:executed', handler);

   // Later
   agent.off('tool:executed', handler);
   ```

2. Use `once()` for one-time events:
   ```typescript
   agent.once('cluster:operational', () => {
     console.log('Cluster ready');
   });
   ```

3. Increase max listeners if intentional:
   ```typescript
   agent.setMaxListeners(20);
   ```

### Issue 13: Slow Service Discovery

**Symptoms**: Discovery calls take several seconds

**Solutions**:
1. Enable Redis caching:
   ```typescript
   const discovery = new ServiceDiscovery({
     registryUrl: 'http://localhost:3001',
     redisUrl: 'redis://localhost:6379',
     cacheTimeout: 300000 // 5 minute cache
   });
   ```

2. Reduce discovery limit:
   ```typescript
   const services = await discovery.discoverServices({
     limit: 5 // Fetch fewer services
   });
   ```

3. Use `findBestService()` instead of full discovery:
   ```typescript
   // Returns only best match, faster
   const best = await discovery.findBestService({
     category: 'ai-inference',
     optimizeFor: 'value'
   });
   ```

### Issue 14: TypeScript Type Errors

**Symptoms**: Type checking errors during development

**Solutions**:
1. Import types explicitly:
   ```typescript
   import type {
     X402ParallaxAgentConfig,
     AgentExecutionResult,
     ServiceInfo
   } from '@x402-upl/integration-gradient';
   ```

2. Use type guards:
   ```typescript
   if (result.success && result.answer) {
     // TypeScript knows answer exists here
     console.log(result.answer);
   }
   ```

3. Check TypeScript version:
   ```bash
   # Requires TypeScript >= 5.0
   npm list typescript
   ```

### Issue 15: Cluster Status Always Shows Not Operational

**Symptoms**: `isOperational` remains false even with ready nodes

**Solutions**:
1. Check all configured nodes are running:
   ```typescript
   const status = agent.getClusterStatus();
   console.log('Ready:', status.readyNodes, 'Total:', status.totalNodes);
   // isOperational = readyNodes === totalNodes
   ```

2. Remove non-existent nodes from config:
   ```typescript
   nodes: [
     // Only include actually running nodes
     { nodeId: 'node-0', host: 'localhost', port: 8081 },
     // Don't include node-1 if it's not running
   ]
   ```

3. Wait longer for nodes to be ready:
   ```typescript
   const operational = await clusterManager.waitUntilOperational(120000);
   if (!operational) {
     console.error('Cluster did not become operational');
   }
   ```

## Security

### Wallet Security

Protect your Solana wallet private keys:

```typescript
// DO NOT commit wallet.json to version control
// Add to .gitignore:
// wallet.json
// *.key

// Use environment variable for wallet path
const walletPath = process.env.WALLET_PATH || './wallet.json';

// Validate wallet file permissions (Unix)
const stats = fs.statSync(walletPath);
if (stats.mode & 0o077) {
  console.warn('WARNING: Wallet file has unsafe permissions');
  console.warn('Run: chmod 600', walletPath);
}

// Encrypt wallet at rest
import { encrypt, decrypt } from 'crypto';

const encrypted = encrypt(walletData, process.env.WALLET_PASSWORD!);
fs.writeFileSync('wallet.enc', encrypted);
```

### API Key Management

Secure API endpoints and registry access:

```typescript
// Use authentication headers
const discovery = new ServiceDiscovery({
  registryUrl: 'https://registry.x402.network',
  headers: {
    'Authorization': `Bearer ${process.env.X402_API_KEY}`,
    'X-API-Version': '2.0'
  }
});

// Validate SSL certificates
const client = new ParallaxClient({
  schedulerUrl: 'https://scheduler.parallax.network',
  validateCerts: true
});
```

### Spending Limits

Implement multiple layers of budget protection:

```typescript
const agent = new X402ParallaxAgent({
  // ...
  x402: {
    // Hourly limit
    spendingLimitPerHour: 100,

    // Reserve minimum (never spend below this)
    reserveMinimum: 50,

    // Additional checks
    maxPaymentSize: 10, // Max single payment
  },
  agent: {
    // Per-task budget
    budget: 25
  }
});

// Monitor spending in real-time
agent.on('payment:success', ({ amount }) => {
  const remaining = agent.getRemainingBudget();

  if (remaining < 10) {
    console.warn('LOW BUDGET WARNING:', remaining, 'USDC remaining');
  }

  if (remaining < 5) {
    console.error('CRITICAL: Budget nearly exhausted');
    agent.shutdown();
  }
});
```

### Service Authentication

Verify service authenticity:

```typescript
// Check service reputation before using
const service = await discovery.findBestService({
  category: 'ai-inference',
  minReputation: 4.0, // Only high-reputation services
  optimizeFor: 'value'
});

if (!service) {
  throw new Error('No trusted services available');
}

// Verify service endpoint SSL
const url = new URL(service.endpoint);
if (url.protocol !== 'https:') {
  throw new Error('Service must use HTTPS');
}

// Check provider reputation
if (service.totalRatings < 10) {
  console.warn('Service has limited rating history');
}
```

### TAP Security

Secure TAP private keys:

```typescript
// Export and encrypt TAP key
const tapKey = agent.exportTAPPrivateKey();
if (tapKey) {
  const encrypted = encryptKey(tapKey, process.env.TAP_KEY_PASSWORD!);

  // Store in secure key management system
  await keyVault.store('tap-key', encrypted);

  // Never log or expose private key
  console.log('TAP key exported and encrypted');
}

// Rotate keys periodically
if (daysSinceKeyCreation > 90) {
  console.log('Key rotation recommended');
  // Create new TAP identity
  const newAgent = new TAPEnabledGradientAgent({...});
}
```

### Network Security

Secure network communications:

```typescript
// Use private networks for sensitive workloads
const agent = new X402ParallaxAgent({
  parallax: {
    schedulerUrl: 'https://private-scheduler.internal',
    nodes: [
      { nodeId: 'node-0', host: '10.0.1.10', port: 8081 }
    ],
    isLocalNetwork: true // Assumes trusted network
  },
  // Use VPC endpoints
  x402: {
    registryUrl: 'https://registry.internal.x402.network'
  }
});

// Implement request signing
// All x402 requests include cryptographic signatures
// No additional configuration needed - handled automatically
```

### Data Privacy

Protect sensitive data in prompts:

```typescript
// Sanitize sensitive information
function sanitizePrompt(prompt: string): string {
  // Remove emails
  prompt = prompt.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

  // Remove phone numbers
  prompt = prompt.replace(/\d{3}-\d{3}-\d{4}/g, '[PHONE]');

  // Remove API keys
  prompt = prompt.replace(/[A-Za-z0-9]{32,}/g, '[KEY]');

  return prompt;
}

const result = await agent.run(sanitizePrompt(userInput));
```

## Performance

### Optimization Strategies

#### 1. Use Smaller Models When Possible

```typescript
// Map tasks to appropriate model sizes
const modelSizes = {
  'simple': 'llama-3-8b',      // Fast, cheap
  'medium': 'llama-3-70b',     // Balanced
  'complex': 'llama-3-405b'    // Powerful, expensive
};

function selectModel(taskComplexity: string) {
  return modelSizes[taskComplexity] || modelSizes.medium;
}

const agent = new X402ParallaxAgent({
  parallax: {
    model: selectModel('simple')
  }
});
```

#### 2. Implement Request Batching

```typescript
// Batch multiple tasks
const tasks = [
  'Summarize document A',
  'Summarize document B',
  'Summarize document C'
];

// Execute in parallel with shared cluster
const results = await Promise.all(
  tasks.map(task => agent.run(task))
);

// vs. sequential (slower)
for (const task of tasks) {
  await agent.run(task); // Waits for each
}
```

#### 3. Optimize Token Usage

```typescript
// Reduce token limits
await client.chatCompletion({
  model: 'llama-3-70b',
  messages: [...],
  max_tokens: 256,    // Lower limit
  temperature: 0.3,   // Less random = fewer tokens
  top_p: 0.9         // Nucleus sampling
});

// Use stop sequences
await client.chatCompletion({
  model: 'llama-3-70b',
  messages: [...],
  max_tokens: 500,
  stop: ['\n\n', 'END', '---'] // Stop early
});
```

#### 4. Enable Redis Caching

```typescript
// Cache service discovery results
const discovery = new ServiceDiscovery({
  registryUrl: 'http://localhost:3001',
  redisUrl: 'redis://localhost:6379',
  cacheTimeout: 300000 // 5 minutes
});

// First call: hits registry
const services1 = await discovery.discoverServices({ category: 'ai' });

// Second call: cache hit (much faster)
const services2 = await discovery.discoverServices({ category: 'ai' });
```

#### 5. Use Connection Pooling

```typescript
// Reuse agent instances
const agentPool = new Map();

function getAgent(modelSize: string) {
  if (!agentPool.has(modelSize)) {
    agentPool.set(modelSize, new X402ParallaxAgent({
      parallax: { model: modelSize, /* ... */ },
      // ... other config
    }));
  }
  return agentPool.get(modelSize);
}

// Reuse agents
const agent = getAgent('llama-3-8b');
await agent.initialize(); // Only once

// Use multiple times
await agent.run('Task 1');
await agent.run('Task 2');
await agent.run('Task 3');
```

#### 6. Optimize Cluster Configuration

```typescript
// More nodes = better parallelism
const agent = new X402ParallaxAgent({
  parallax: {
    schedulerUrl: 'http://localhost:8080',
    model: 'llama-3-70b',
    nodes: [
      // Distribute layers across nodes
      { nodeId: 'node-0', host: 'node0', port: 8081, startLayer: 0, endLayer: 20 },
      { nodeId: 'node-1', host: 'node1', port: 8082, startLayer: 20, endLayer: 40 },
      { nodeId: 'node-2', host: 'node2', port: 8083, startLayer: 40, endLayer: 60 },
      { nodeId: 'node-3', host: 'node3', port: 8084, startLayer: 60, endLayer: 80 }
    ]
  }
});
```

### Scaling Strategies

#### Horizontal Scaling

```typescript
// Run multiple agent instances
const agents = await Promise.all([
  createAgent('agent-1'),
  createAgent('agent-2'),
  createAgent('agent-3')
]);

// Distribute work
const taskChunks = chunkArray(allTasks, 3);

const results = await Promise.all(
  agents.map((agent, i) =>
    Promise.all(taskChunks[i].map(task => agent.run(task)))
  )
);
```

#### Load Balancing

```typescript
// Round-robin task distribution
class AgentPool {
  private agents: X402ParallaxAgent[] = [];
  private current = 0;

  async addAgent(agent: X402ParallaxAgent) {
    await agent.initialize();
    this.agents.push(agent);
  }

  async run(task: string) {
    const agent = this.agents[this.current];
    this.current = (this.current + 1) % this.agents.length;
    return await agent.run(task);
  }
}

const pool = new AgentPool();
await pool.addAgent(agent1);
await pool.addAgent(agent2);

// Balanced execution
await pool.run('Task 1'); // agent1
await pool.run('Task 2'); // agent2
await pool.run('Task 3'); // agent1
```

#### Auto-Scaling

```typescript
// Scale based on load
class AutoScalingPool {
  private agents: X402ParallaxAgent[] = [];
  private pendingTasks = 0;

  async run(task: string) {
    this.pendingTasks++;

    // Scale up if needed
    if (this.pendingTasks / this.agents.length > 10) {
      await this.addAgent();
    }

    const result = await this.getAgent().run(task);

    this.pendingTasks--;

    // Scale down if idle
    if (this.pendingTasks === 0 && this.agents.length > 1) {
      await this.removeAgent();
    }

    return result;
  }
}
```

### Performance Monitoring

```typescript
// Track performance metrics
class PerformanceMonitor {
  private metrics: any[] = [];

  recordInference(metrics: InferenceMetrics) {
    this.metrics.push({
      timestamp: Date.now(),
      latency: metrics.totalLatencyMs,
      tokens: metrics.totalTokens,
      throughput: metrics.throughputTokensPerSec
    });
  }

  getStats() {
    const latencies = this.metrics.map(m => m.latency);
    const throughputs = this.metrics.map(m => m.throughput);

    return {
      avgLatency: avg(latencies),
      p50Latency: percentile(latencies, 0.5),
      p95Latency: percentile(latencies, 0.95),
      p99Latency: percentile(latencies, 0.99),
      avgThroughput: avg(throughputs)
    };
  }
}

const monitor = new PerformanceMonitor();

agent.on('inference:complete', (metrics) => {
  monitor.recordInference(metrics);
});

// Periodically log stats
setInterval(() => {
  console.log('Performance stats:', monitor.getStats());
}, 60000);
```

### Benchmarking

```typescript
// Benchmark different configurations
async function benchmark() {
  const configs = [
    { model: 'llama-3-8b', nodes: 2 },
    { model: 'llama-3-70b', nodes: 4 },
    { model: 'llama-3-405b', nodes: 8 }
  ];

  const task = 'Explain quantum computing';

  for (const config of configs) {
    const agent = createAgent(config);
    await agent.initialize();

    const start = performance.now();
    await agent.run(task);
    const elapsed = performance.now() - start;

    console.log(`${config.model} with ${config.nodes} nodes: ${elapsed}ms`);

    await agent.shutdown();
  }
}
```

---

## Additional Resources

- [Gradient Parallax Documentation](https://docs.gradient.ai/parallax)
- [x402 Network Guide](https://docs.x402.network)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Visa TAP Specification](https://visa.github.io/tap/)

## Support

For issues and questions:
- GitHub Issues: [x402-upl/x402](https://github.com/x402-upl/x402/issues)
- Discord: [x402 Community](https://discord.gg/x402)
- Email: support@x402.network

## License

MIT License - See LICENSE file for details
