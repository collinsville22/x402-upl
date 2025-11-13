# Reasoning Engine

Enterprise AI task orchestration engine that decomposes natural language tasks into executable workflows with automatic service discovery, payment orchestration, and multi-step execution.

## Overview

The X402 Reasoning Engine transforms natural language requests into complete workflows that discover services, orchestrate payments, and execute complex multi-step operations autonomously. Powered by Claude 3.5 Sonnet, it handles task decomposition, service matching, cost estimation, and execution monitoring.

**Key Capabilities:**
- **Natural Language Processing**: Convert requests to executable workflows
- **Service Discovery**: Automatically find and match x402 services
- **Payment Orchestration**: Handle micropayments for each step
- **DAG Execution**: Parallel execution where possible
- **Retry & Rollback**: Automatic error handling and compensation
- **Real-time Streaming**: WebSocket updates during execution
- **Cost Management**: Estimation, approval flow, and spending limits

## Architecture

```
┌────────────────────────────────────────────────────────┐
│           User Input (Natural Language)                │
│  "Analyze last 30 days of SOL/USDC trading volume     │
│   and create a trend report with charts"              │
└─────────────────┬──────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────┐
│         AI Task Planner (Claude 3.5 Sonnet)            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Extract Intent                                │  │
│  │    - Classification: data_analysis               │  │
│  │    - Entities: SOL/USDC, 30 days                 │  │
│  │    - Required: blockchain_data, visualization    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 2. Generate Execution Plan (DAG)                 │  │
│  │    Step 1: Fetch DEX data (Triton)               │  │
│  │    Step 2: Analyze volume (Analytics Service)    │  │
│  │    Step 3: Generate chart (Visualization API)    │  │
│  │    Step 4: Create report (Document Service)      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────┐
│            Service Discovery Engine                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Query x402 Registry                              │  │
│  │ - Capability matching                            │  │
│  │ - Reputation filtering (>7000)                   │  │
│  │ - Price comparison                               │  │
│  │ - Availability check                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Matched Services:                                     │
│  - Triton Historical Data API ($0.015)                 │
│  - DEX Analytics Service ($0.02)                       │
│  - Chart Generator API ($0.01)                         │
│  - PDF Report Generator ($0.005)                       │
└─────────────────┬──────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────┐
│           Cost Estimation & Approval                   │
│  Total Cost: $0.05 USDC                                │
│  Est. Time: 45 seconds                                 │
│  Status: AWAITING_APPROVAL                             │
└─────────────────┬──────────────────────────────────────┘
                  │ User Approves
┌─────────────────▼──────────────────────────────────────┐
│          Execution Engine (DAG Runner)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Escrow: Lock $0.05 USDC                          │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Step 1: Fetch DEX data [RUNNING]                 │  │
│  │   → Payment: $0.015 USDC ✓                       │  │
│  │   → Response: 250KB trading data ✓               │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Step 2 & 3: Analyze + Chart [PARALLEL]           │  │
│  │   → Step 2 Payment: $0.02 USDC ✓                 │  │
│  │   → Step 3 Payment: $0.01 USDC ✓                 │  │
│  │   → Responses received ✓                         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Step 4: Generate report [RUNNING]                │  │
│  │   → Payment: $0.005 USDC ✓                       │  │
│  │   → PDF generated ✓                              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Release Escrow: Distribute to services           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────┐
│     WebSocket Stream (Real-time Updates)               │
│  → PLANNING → DISCOVERING → ESTIMATING → EXECUTING     │
│  → STEP_COMPLETED (1/4) → (2/4) → (3/4) → (4/4)       │
│  → COMPLETED: Report ready ✓                           │
└────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install @x402-upl/reasoning
```

### Dependencies

```bash
npm install @anthropic-ai/sdk @solana/web3.js @prisma/client \
  fastify ioredis bullmq pino dotenv zod
```

## Configuration

### Environment Variables

```bash
# AI Configuration
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
AI_MODEL=claude-3-5-sonnet-20241022

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/reasoning
REDIS_URL=redis://localhost:6379

# X402 Infrastructure
REGISTRY_URL=https://registry.x402.network
FACILITATOR_URL=https://facilitator.x402.network

# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
ESCROW_KEYPAIR=base64_encoded_keypair

# Server
PORT=5000
NODE_ENV=production

# Limits
MAX_WORKFLOW_COST=100.0        # Maximum cost per workflow (USDC)
MAX_EXECUTION_TIME=300000      # Maximum execution time (ms)
MAX_CONCURRENT_WORKFLOWS=10    # Concurrent workflow limit
```

### Generate Escrow Wallet

```bash
node -e "
const {Keypair} = require('@solana/web3.js');
const k = Keypair.generate();
console.log('ESCROW_KEYPAIR=' + Buffer.from(k.secretKey).toString('base64'));
console.log('Address:', k.publicKey.toBase58());
"
```

### Database Setup

```bash
# Initialize Prisma
npx prisma init

# Run migrations
npx prisma migrate dev

# Generate client
npx prisma generate
```

## API Reference

### Create Workflow

Create a new workflow from natural language input.

```http
POST /workflows/create
Content-Type: application/json

{
  "userId": "user_abc123",
  "input": "Analyze last 30 days of Solana DEX volume and create trend report",
  "maxCost": 10.0,
  "maxTime": 120000,
  "approvalRequired": true
}
```

**Response:**

```json
{
  "success": true,
  "workflow": {
    "id": "wf_1699000000_xyz789",
    "status": "planning",
    "userId": "user_abc123",
    "input": "Analyze last 30 days...",
    "createdAt": "2024-11-13T15:30:00Z"
  }
}
```

### Get Workflow Status

```http
GET /workflows/:id
```

**Response:**

```json
{
  "success": true,
  "workflow": {
    "id": "wf_1699000000_xyz789",
    "status": "awaiting_approval",
    "progress": {
      "currentStep": 0,
      "totalSteps": 4,
      "percentage": 0
    },
    "plan": {
      "steps": [
        {
          "id": "step_1",
          "name": "Fetch DEX data",
          "service": "Triton Historical Data",
          "cost": 0.015,
          "status": "pending"
        },
        {
          "id": "step_2",
          "name": "Analyze volume",
          "service": "Analytics API",
          "cost": 0.02,
          "status": "pending",
          "dependencies": ["step_1"]
        }
      ],
      "totalCost": 0.05,
      "estimatedTime": 45000
    }
  }
}
```

### Approve Workflow

```http
POST /workflows/:id/approve
```

Approves and starts execution. System automatically checks escrow balance.

**Response:**

```json
{
  "success": true,
  "message": "Workflow approved and execution started",
  "escrowBalance": 10.5
}
```

### Stream Workflow Progress

```http
GET /workflows/:id/stream
Upgrade: websocket
```

**WebSocket Events:**

```json
{
  "type": "status_change",
  "workflowId": "wf_123",
  "status": "executing",
  "timestamp": "2024-11-13T15:31:00Z"
}

{
  "type": "step_started",
  "stepId": "step_1",
  "stepName": "Fetch DEX data",
  "service": "Triton API"
}

{
  "type": "step_completed",
  "stepId": "step_1",
  "output": { ... },
  "cost": 0.015,
  "duration": 2340
}

{
  "type": "workflow_completed",
  "workflowId": "wf_123",
  "totalCost": 0.05,
  "totalTime": 45231,
  "result": { ... }
}
```

### Cancel Workflow

```http
POST /workflows/:id/cancel
```

### Get Escrow Balance

```http
GET /escrow/balance
```

**Response:**

```json
{
  "address": "8rKw...xY9z",
  "balance": 10.5,
  "currency": "USDC",
  "lockedAmount": 0.15,
  "availableAmount": 10.35
}
```

## Usage Examples

### Example 1: Simple Data Analysis

```typescript
import { ReasoningEngine } from '@x402-upl/reasoning';

const engine = new ReasoningEngine({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  database: prisma,
  redis,
});

// Create workflow
const workflow = await engine.createWorkflow({
  userId: 'user_123',
  input: 'Get current weather for New York and San Francisco',
  maxCost: 1.0,
});

// Approve and execute
await engine.approveWorkflow(workflow.id);

// Wait for completion
const result = await engine.waitForCompletion(workflow.id);

console.log(result.data);
// {
//   ny_weather: { temp: 68, condition: 'cloudy' },
//   sf_weather: { temp: 72, condition: 'sunny' }
// }
```

### Example 2: Complex Multi-Step Workflow

```typescript
const workflow = await engine.createWorkflow({
  userId: 'analyst_456',
  input: `
    1. Fetch last 7 days of SOL/USDC trading data from Switchboard
    2. Calculate VWAP and trading volume
    3. Analyze sentiment from crypto Twitter
    4. Generate correlation chart
    5. Create PDF report with findings
  `,
  maxCost: 5.0,
  maxTime: 180000,
});

// Monitor progress via WebSocket
const ws = new WebSocket(`ws://localhost:5000/workflows/${workflow.id}/stream`);

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log(`[${event.type}]`, event);
});

// Approve
await engine.approveWorkflow(workflow.id);
```

### Example 3: Error Handling & Retry

```typescript
const workflow = await engine.createWorkflow({
  userId: 'user_789',
  input: 'Translate "Hello" to Spanish, French, and German',
  maxCost: 0.1,
  retryPolicy: {
    maxRetries: 3,
    backoff: 'exponential',
    retryableErrors: ['timeout', 'service_unavailable'],
  },
});

await engine.approveWorkflow(workflow.id);

const result = await engine.waitForCompletion(workflow.id);

if (result.status === 'failed') {
  console.log('Failed steps:', result.failedSteps);
  console.log('Error:', result.error);
}
```

### Example 4: Real-time Streaming

```typescript
import { FastifyInstance } from 'fastify';

app.get('/workflows/:id/stream', { websocket: true }, (connection, req) => {
  const { id } = req.params;

  const subscription = engine.subscribe(id, (event) => {
    connection.socket.send(JSON.stringify(event));
  });

  connection.socket.on('close', () => {
    subscription.unsubscribe();
  });
});
```

## Advanced Features

### Custom Service Filters

```typescript
const workflow = await engine.createWorkflow({
  userId: 'user_123',
  input: 'Analyze blockchain data',
  maxCost: 10.0,
  serviceFilters: {
    minReputation: 8000,
    maxPrice: 0.05,
    requiredCapabilities: ['blockchain_data', 'analytics'],
    excludeProviders: ['untrusted_provider_id'],
  },
});
```

### Conditional Execution

```typescript
const plan = {
  steps: [
    {
      id: 'step_1',
      name: 'Fetch price',
      service: 'price_api',
    },
    {
      id: 'step_2',
      name: 'Buy if price < $100',
      service: 'trading_api',
      condition: (previousResults) => {
        return previousResults.step_1.price < 100;
      },
      dependencies: ['step_1'],
    },
  ],
};
```

### Rollback on Failure

```typescript
const workflow = await engine.createWorkflow({
  userId: 'user_123',
  input: 'Execute multi-step trade',
  rollbackPolicy: {
    enabled: true,
    compensationSteps: {
      step_2: async (result) => {
        // Reverse the trade if step 3 fails
        await tradingAPI.cancelOrder(result.orderId);
      },
    },
  },
});
```

## Cost Management

### Pre-Execution Estimation

```typescript
const estimate = await engine.estimateWorkflow({
  input: 'Complex analysis task',
});

console.log('Estimated cost:', estimate.totalCost);
console.log('Estimated time:', estimate.estimatedTime);
console.log('Confidence:', estimate.confidence);

if (estimate.totalCost < userBudget) {
  await engine.createWorkflow({ ... });
}
```

### Spending Limits

```typescript
const engine = new ReasoningEngine({
  // ...
  limits: {
    maxCostPerWorkflow: 10.0,
    maxCostPerUser: 100.0,
    maxCostPerDay: 1000.0,
  },
});
```

### Cost Tracking

```typescript
const stats = await engine.getUserStats('user_123');

console.log('Total spent:', stats.totalSpent);
console.log('Workflows executed:', stats.workflowsExecuted);
console.log('Average cost:', stats.averageCost);
console.log('Success rate:', stats.successRate);
```

## Monitoring

### Metrics Endpoint

```http
GET /metrics
```

**Response:**

```json
{
  "workflows": {
    "total": 1523,
    "active": 12,
    "completed": 1489,
    "failed": 22
  },
  "performance": {
    "averageExecutionTime": 34567,
    "averageCost": 0.234,
    "successRate": 0.985
  },
  "escrow": {
    "totalLocked": 12.45,
    "totalReleased": 234.56
  }
}
```

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai": "operational",
    "escrow": "funded"
  },
  "uptime": 345678
}
```

## Troubleshooting

### Workflow Stuck in Planning

**Cause**: AI planner timeout or API rate limit

**Solution**:
```typescript
// Increase timeout
const workflow = await engine.createWorkflow({
  input: '...',
  planningTimeout: 60000, // 60 seconds
});

// Check AI API status
const health = await engine.checkAIHealth();
console.log('AI service status:', health);
```

### Payment Failures

**Cause**: Insufficient escrow balance

**Solution**:
```bash
# Check escrow balance
curl http://localhost:5000/escrow/balance

# Fund escrow wallet
solana transfer <ESCROW_ADDRESS> 10 --url devnet
```

### Service Discovery Fails

**Cause**: Registry unavailable or no matching services

**Solution**:
```typescript
// Check registry connection
const services = await engine.discoverServices({
  capabilities: ['data_analytics'],
});

console.log('Available services:', services.length);

// Use fallback services
const workflow = await engine.createWorkflow({
  input: '...',
  fallbackServices: {
    data_analytics: 'https://backup-analytics-api.com',
  },
});
```

## Performance Optimization

### Caching

```typescript
const engine = new ReasoningEngine({
  // ...
  caching: {
    enabled: true,
    redis,
    ttl: 3600, // 1 hour
    cacheKeys: ['service_discovery', 'cost_estimation'],
  },
});
```

### Parallel Execution

The engine automatically executes independent steps in parallel:

```typescript
// These steps run in parallel
const plan = {
  steps: [
    { id: 'fetch_weather', ... },
    { id: 'fetch_price', ... },
    { id: 'fetch_news', ... },
    {
      id: 'analyze',
      dependencies: ['fetch_weather', 'fetch_price', 'fetch_news'],
    },
  ],
};
```

### Connection Pooling

```typescript
const engine = new ReasoningEngine({
  // ...
  database: new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
    log: ['error'],
    // Connection pool settings
    connection: {
      pool: {
        min: 2,
        max: 10,
      },
    },
  }),
});
```

## Security

### Input Validation

All inputs are validated:

```typescript
import { z } from 'zod';

const WorkflowInputSchema = z.object({
  userId: z.string().min(1).max(100),
  input: z.string().min(1).max(5000),
  maxCost: z.number().min(0).max(1000),
  maxTime: z.number().min(1000).max(600000),
});
```

### Escrow Security

- Multi-signature wallet support
- Time-locked fund releases
- Automatic refunds on failure

### API Authentication

```typescript
app.post('/workflows/create', {
  preHandler: async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || !await validateApiKey(apiKey)) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  },
}, async (request, reply) => {
  // Create workflow
});
```

## Related Documentation

- [X042 Core Middleware](./x042-middleware.md) - Payment middleware
- [CLI Tool](./cli.md) - Service management
- [Service Provider Guide](./service-provider.md) - Building services
- [JavaScript SDK](../sdks/javascript.md) - Client library

## Support

- [GitHub Repository](https://github.com/collinsville22/x402-upl)
- [GitHub Issues](https://github.com/collinsville22/x402-upl/issues)
