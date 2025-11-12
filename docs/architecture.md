# X402-UPL Architecture

## Overview

X402-UPL is a production-grade unified payment layer built on Solana that enables frictionless micropayments between AI agents, services, and applications. The platform implements the x402 payment protocol, providing a comprehensive ecosystem for autonomous service discovery, payment processing, and settlement management.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Consumer App  │  Provider Dashboard  │  CLI Tool  │  MCP Bridge│
│   (Port 3002)  │     (Port 3000)      │            │            │
└──────────┬─────────────────┬──────────────┬──────────────────────┘
           │                 │              │
           └─────────────────┼──────────────┘
                             │
           ┌─────────────────▼──────────────────┐
           │        API & Business Logic         │
           ├─────────────────────────────────────┤
           │  Facilitator API  │  Registry API   │
           │   (Port 4001)     │   (Port 4002)   │
           └─────────┬───────────────┬───────────┘
                     │               │
           ┌─────────▼───────────────▼───────────┐
           │      Data & State Layer             │
           ├─────────────────────────────────────┤
           │  PostgreSQL  │  Redis  │  S3/IPFS   │
           └─────────────────────────────────────┘
                     │
           ┌─────────▼───────────────────────────┐
           │      Blockchain Layer                │
           ├─────────────────────────────────────┤
           │  Solana Network  │  Smart Contracts │
           │  SPL Token       │  x402 Registry   │
           └─────────────────────────────────────┘
```

## Core Components

### 1. X042 Core Middleware

**Location:** `packages/X042 Core/`

The core middleware library that enables x402 payment protocol integration across multiple frameworks.

**Supported Frameworks:**
- Express.js
- Fastify
- Next.js (App Router & Pages Router)
- Koa
- NestJS

**Key Features:**
- Ed25519 signature verification
- SPL token payment support (USDC, CASH, SOL)
- Replay attack protection via Redis
- Automated payment verification
- Transaction finality checks
- Configurable pricing models

**Implementation:**
```typescript
// Express example
import { createX402Middleware } from '@x402-upl/core';

app.use('/api/protected', createX402Middleware({
  walletAddress: process.env.WALLET_ADDRESS,
  pricePerCall: 0.001,
  tokenMint: 'CASH_MINT_ADDRESS',
  signatureStore: new RedisSignatureStore(redis)
}));
```

**Flow:**
1. Client makes request to protected endpoint
2. Middleware intercepts and returns 402 Payment Required
3. Client receives payment requirements (amount, recipient, signature)
4. Client creates and signs Solana transaction
5. Client retries request with `X-Payment` header containing signature
6. Middleware verifies signature, checks on-chain transaction
7. If valid, stores signature in Redis and allows request through
8. Service processes request and returns response

### 2. Facilitator API

**Location:** `packages/facilitator/`
**Port:** 4001
**Technology:** Fastify + Prisma + Redis

Central payment routing and facilitation service that handles payment processing, settlement, and service management.

**API Endpoints:**

**Payments:**
- `POST /api/payments/create` - Initialize payment
- `POST /api/payments/verify` - Verify payment completion
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/refund` - Process refund

**Routing:**
- `POST /api/routing/find-service` - Route payment to service
- `GET /api/routing/options` - Get routing options
- `POST /api/routing/execute` - Execute routed payment

**Escrow:**
- `POST /api/escrow/deposit` - Deposit to escrow
- `POST /api/escrow/withdraw` - Withdraw from escrow
- `GET /api/escrow/balance/:address` - Check balance
- `GET /api/escrow/transactions/:address` - Transaction history

**Settlements (Protected):**
- `POST /api/settlement/request` - Request settlement
- `GET /api/settlement/pending` - List pending settlements
- `POST /api/settlement/execute` - Execute settlement (2% platform fee)
- `GET /api/settlement/history` - Settlement history

**Services:**
- `POST /api/services/register` - Register new service
- `GET /api/services/search` - Search services
- `GET /api/services/trending` - Trending services
- `GET /api/services/:id` - Service details
- `GET /api/services/:id/stats` - Service statistics
- `POST /api/services/:id/rate` - Rate service
- `GET /api/services/:id/reviews` - Get reviews
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `GET /api/services/recommendations` - Get recommendations
- `GET /api/services/categories` - List categories

**API Keys:**
- `POST /api/keys/generate` - Generate API key
- `GET /api/keys/list` - List user's keys
- `DELETE /api/keys/:id` - Revoke API key
- `POST /api/keys/validate` - Validate API key

**Webhooks:**
- `POST /api/webhooks/register` - Register webhook
- `GET /api/webhooks/list` - List webhooks
- `PUT /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook
- `POST /api/webhooks/test` - Test webhook delivery

**Security Features:**
- Ed25519 wallet signature authentication
- API key authentication with SHA-256 hashing
- HMAC-SHA256 webhook signatures
- Rate limiting per endpoint
- CORS whitelist
- Input validation with Zod schemas

**Database Schema:**
```prisma
model Transaction {
  id            String   @id @default(cuid())
  signature     String   @unique
  from          String
  to            String
  amount        Float
  tokenMint     String
  serviceId     String?
  status        String
  createdAt     DateTime @default(now())
}

model Settlement {
  id            String   @id @default(cuid())
  providerId    String
  amount        Float
  platformFee   Float    @default(0.02)
  status        String
  txSignature   String?
  createdAt     DateTime @default(now())
  executedAt    DateTime?
}

model Service {
  id                String   @id @default(cuid())
  name              String
  description       String
  provider          String
  category          String
  pricePerCall      Float
  tokenMint         String
  endpoint          String
  verified          Boolean  @default(false)
  totalCalls        Int      @default(0)
  totalRevenue      Float    @default(0)
  averageRating     Float?
  uptimePercentage  Float?
  createdAt         DateTime @default(now())
}
```

### 3. Registry API

**Location:** `packages/registry/api/`
**Port:** 4002
**Technology:** Fastify + Prisma + Redis

Service discovery and registry management API with advanced search capabilities.

**Features:**
- Service registration and discovery
- Advanced filtering (category, price range, rating, tokens)
- Full-text search
- Trending services algorithm
- Service recommendations
- Reputation scoring
- Redis caching for performance

### 4. Consumer Application

**Location:** `packages/consumer-app/`
**Port:** 3002
**Technology:** Next.js 15 + React 19 + TypeScript

Full-featured consumer interface for interacting with the x402 ecosystem.

**Pages:**

**Consumer Flow (8 pages):**
1. **Dashboard** (`/`) - Hero section with quick actions and stats
2. **Workflow Creator** (`/workflows/new`) - Natural language workflow creation
3. **Workflow Monitor** (`/workflows/[id]`) - Real-time execution monitoring with WebSocket
4. **Workflows List** (`/workflows`) - All workflows with status filters
5. **Escrow Management** (`/escrow`) - Balance, deposit, withdraw, transaction history
6. **Integrations** (`/integrations`) - Browse available integrations
7. **Analytics** (`/analytics`) - Usage analytics with CSV/JSON export
8. **Service Discovery** (`/discover`) - Advanced service search and discovery

**Provider Flow (5 pages):**
1. **Provider Dashboard** (`/provider`) - Revenue stats and API call metrics
2. **My Services** (`/provider/services`) - Service management
3. **Marketplace** (`/integrations`) - Discover other services
4. **Settlements** (`/provider/settlements`) - Withdraw earnings
5. **Transactions** (`/provider/transactions`) - Payment history

**Key Features:**
- WebSocket streaming for real-time updates
- Natural language workflow creation
- Budget validation against escrow balance
- CSV/JSON export functionality
- Role-based navigation (consumer/provider/both)
- Professional dark theme (#0A0A0A background, #00FF88 accent)

**State Management:**
- Zustand for global state (wallet, escrow balance)
- React Query for server state and caching
- localStorage for persistence

### 5. Provider Dashboard

**Location:** `packages/dashboard/`
**Port:** 3000
**Technology:** Next.js 15 + React 19 + TypeScript

Comprehensive provider dashboard for service management and analytics.

**Pages (11 total):**

1. **Dashboard** (`/dashboard`) - Main landing with overview metrics
2. **Workflows** (`/dashboard/workflows`) - AI workflow management list
3. **Workflow Creator** (`/dashboard/workflows/new`) - Natural language workflow builder
4. **Workflow Monitor** (`/dashboard/workflows/[id]`) - Real-time execution monitoring
5. **Escrow** (`/dashboard/escrow`) - Balance management and history
6. **Integrations** (`/dashboard/integrations`) - Integration showcase
7. **Analytics** (`/dashboard/analytics`) - Comprehensive metrics with export
8. **Service Discovery** (`/dashboard/discover`) - Advanced search and filters
9. **Service Detail** (`/dashboard/discover/[id]`) - 5 tabs (Overview, Docs, Try It, Reviews, Analytics)
10. **Merchant Dashboard** (`/dashboard/merchant`) - Revenue analytics
11. **Settlements** (`/dashboard/settlements`) - Settlement management with export

**Features:**
- Real-time WebSocket streaming for workflows
- Auto-refresh intervals (30-60s)
- Comprehensive error handling
- Professional empty states
- CSV/JSON export for analytics
- Advanced filtering and search
- Rating and review system

### 6. Smart Contracts

**Location:** `packages/contracts/`
**Technology:** Anchor Framework (Solana)
**Program ID:** `85GHuKTjE4RXR2d4tCMKLXSbdwr2wkELVvUhNeyrwEfj`
**Network:** Devnet (ready for mainnet)

On-chain registry for agents, services, and transactions.

**Key Instructions:**

```rust
// Agent Registration
register_agent(
  did: String,
  tap_certificate: String,
  stake_amount: u64  // Minimum 1 SOL
)

// Service Registration
register_service(
  name: String,
  endpoint: String,
  pricing: ServicePricing,
  token_mint: Pubkey
)

// Transaction Recording
record_transaction(
  service_pubkey: Pubkey,
  amount: u64,
  token_mint: Pubkey,
  signature: String
)

// Service Rating
rate_service(
  service_pubkey: Pubkey,
  rating: u16  // 1-500 scale
)

// Fraud Slashing
slash_for_fraud(
  agent_pubkey: Pubkey,
  slash_percentage: u8  // 1-100
)

// Service Verification
verify_service(
  service_pubkey: Pubkey
)
```

**Security Features:**
- PDA-based account derivation
- Wallet ownership verification
- Rate limiting (10s between transactions)
- Timelock for unstaking (30 days)
- Slash cooldown (24 hours)
- Rating update cooldown (7 days)
- Credit limit system for high-reputation agents

**Reputation System:**
- 0-10000 scale
- Based on transaction count, ratings, uptime
- Enables credit limits for trusted agents
- Slashing for fraud reduces reputation

### 7. Software Development Kits (SDKs)

Multi-language client libraries for x402 integration.

#### JavaScript/TypeScript SDK

**Location:** `packages/sdk/javascript/`
**Package:** `@x402-upl/sdk`

```typescript
import { X402Client, ServiceDiscovery } from '@x402-upl/sdk';

const client = new X402Client({
  wallet: keypair,
  network: 'devnet'
});

// Discover services
const discovery = new ServiceDiscovery('https://registry.x402.dev');
const services = await discovery.search({ category: 'ai-inference' });

// Call service with automatic payment
const result = await client.callService(
  services[0].endpoint,
  { prompt: 'Analyze this data...' }
);
```

#### Python SDK

**Location:** `packages/sdk/python/`
**Package:** `x402-upl`

```python
from x402_upl import X402Client, ServiceDiscovery

client = X402Client(
    private_key=private_key,
    network='devnet'
)

# Discover and call service
discovery = ServiceDiscovery('https://registry.x402.dev')
services = discovery.search(category='ai-inference')

result = client.call_service(
    services[0]['endpoint'],
    {'prompt': 'Analyze this data...'}
)
```

#### Rust SDK

**Location:** `packages/sdk/rust/`
**Crate:** `x402-upl`

```rust
use x402_upl::{X402Client, ServiceDiscovery};

#[tokio::main]
async fn main() -> Result<()> {
    let client = X402Client::new(keypair, Network::Devnet)?;

    let discovery = ServiceDiscovery::new("https://registry.x402.dev");
    let services = discovery.search("category", "ai-inference").await?;

    let result = client.call_service(
        &services[0].endpoint,
        serde_json::json!({"prompt": "Analyze this data..."})
    ).await?;

    Ok(())
}
```

#### Go SDK

**Location:** `packages/sdk/go/`
**Module:** `github.com/x402-upl/x402-upl-go`

```go
import "github.com/x402-upl/x402-upl-go"

client := x402upl.NewClient(privateKey, x402upl.Devnet)

discovery := x402upl.NewServiceDiscovery("https://registry.x402.dev")
services, _ := discovery.Search(map[string]string{"category": "ai-inference"})

result, _ := client.CallService(services[0].Endpoint, map[string]interface{}{
    "prompt": "Analyze this data...",
})
```

### 8. CLI Tool

**Location:** `packages/cli/`
**Binary:** `x402`
**Technology:** Commander.js + Inquirer

Command-line interface for x402 operations.

**Commands:**
```bash
# Initialize configuration
x402 init

# Discover services
x402 discover --category ai-inference

# Register service
x402 register --name "My Service" --price 0.001

# Make payment
x402 pay --service <id> --amount 0.001

# Check wallet balance
x402 wallet balance

# View earnings
x402 earnings

# Configure TAP authentication
x402 tap setup

# Test service
x402 test --endpoint <url>

# Verify payment
x402 verify --signature <sig>

# Enable service
x402 enable --service <id>

# Deploy service
x402 deploy --config ./service.json
```

**Configuration:**
Stored in `~/.x402/config.json`:
```json
{
  "walletPath": "~/.config/solana/id.json",
  "network": "devnet",
  "rpcUrl": "https://api.devnet.solana.com",
  "registryUrl": "https://registry.x402.dev",
  "facilitatorUrl": "https://facilitator.x402.dev"
}
```

### 9. MCP Bridge

**Location:** `packages/mcp-bridge/`
**Technology:** Model Context Protocol + Solana

Enables Claude Desktop integration with automatic payment handling.

**Features:**
- MCP protocol implementation
- Automatic payment via x402-axios
- Service discovery integration (60s refresh)
- Error handling and retry logic
- Production logging with Pino

**Configuration:**
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "x402-solana": {
      "command": "node",
      "args": ["/path/to/solana-mcp-server.js"],
      "env": {
        "PRIVATE_KEY": "[base58-encoded-key]",
        "RPC_URL": "https://api.devnet.solana.com",
        "BAZAAR_URL": "https://registry.x402.dev"
      }
    }
  }
}
```

**Usage in Claude:**
```
User: Call the sentiment analysis service on this text: "..."
Claude: [Uses MCP bridge to discover service, make payment, call endpoint]
```

## Production Integrations

### 1. Switchboard Oracle Marketplace

**Location:** `packages/integrations/switchboard/`
**Status:** Production-ready

Oracle data marketplace using Switchboard on-demand protocol.

**Features:**
- Real Switchboard protocol integration
- TAP (RFC 9421) authentication
- CASH payment gating
- Custom feed creation
- Multi-source aggregation (median/mean)
- WebSocket real-time streaming
- Pre-defined feeds (BTC/USD, ETH/USD, SOL/USD)

**Pricing:**
- BTC/USD: 0.0001 CASH
- ETH/USD: 0.0001 CASH
- SOL/USD: 0.00005 CASH

**API Endpoints:**
```
GET /feeds - List all feeds
GET /feeds/:id - Get feed data
POST /feeds/custom - Create custom feed
POST /feeds/:id/subscribe - Subscribe to real-time updates
```

### 2. CDP Agent Integration

**Location:** `packages/integrations/cdp-agent/`
**Status:** Production-ready

Coinbase Developer Platform autonomous agent integration.

**Features:**
- CDP wallet integration
- AI-powered agent brain (OpenAI)
- Autonomous trading capabilities
- Market analysis agents
- Portfolio management

**Example Agents:**
- Simple agent for basic operations
- Market analysis agent
- Trading strategy agent

### 3. Phantom CASH Integration

**Location:** `packages/integrations/phantom-cash/`
**Status:** Production-ready

Phantom wallet + CASH token integration.

**Features:**
- Phantom wallet connection
- CASH token transfers
- SPL token operations
- OpenAI integration for AI agents

### 4. Gradient Parallax

**Location:** `packages/integrations/gradient/`
**Status:** Production-ready

Distributed inference integration with Gradient network.

**Features:**
- P2P networking
- Distributed AI inference
- Autonomous agent framework
- Solana payment integration
- WebSocket support

## Production Plugins

### Eliza Plugin

**Location:** `packages/plugins/eliza-plugin/`
**Package:** `@x402-upl/eliza-plugin`

Integration plugin for the Eliza AI framework.

**Features:**
- On-chain reputation integration
- Autonomous agent marketplace access
- Solana payment processing
- Service discovery integration

**Usage:**
```typescript
import { X402Plugin } from '@x402-upl/eliza-plugin';

const plugin = new X402Plugin({
  wallet: keypair,
  network: 'devnet'
});

// Register with Eliza
eliza.use(plugin);
```

## Data Flow

### Payment Flow

```
┌─────────────────┐
│  Consumer/Agent │
└────────┬────────┘
         │ 1. HTTP Request
         ▼
┌────────────────────────────┐
│  Service Provider          │
│  (X042 Core Middleware)    │
└────────┬───────────────────┘
         │ 2. Returns 402 Payment Required
         │    + Payment Requirements
         ▼
┌─────────────────┐
│  Consumer/Agent │
│  Creates TX     │
└────────┬────────┘
         │ 3. Signs & Submits Solana TX
         ▼
┌─────────────────┐
│  Solana Network │
└────────┬────────┘
         │ 4. Transaction Confirmed
         ▼
┌─────────────────┐
│  Consumer/Agent │
│  Retry Request  │
│  + X-Payment    │
└────────┬────────┘
         │ 5. Request with Signature
         ▼
┌────────────────────────────┐
│  X042 Core Middleware      │
│  - Verify Signature        │
│  - Check Amount/Recipient  │
│  - Verify On-chain TX      │
│  - Check Replay (Redis)    │
└────────┬───────────────────┘
         │ 6. Signature Valid
         │    Store in Redis
         ▼
┌────────────────────────────┐
│  Service Handler           │
│  Process Request           │
└────────┬───────────────────┘
         │ 7. Return Response
         ▼
┌─────────────────┐
│  Consumer/Agent │
│  Receives Data  │
└─────────────────┘
```

### Settlement Flow

```
┌─────────────────┐
│  Service        │
│  Provider       │
└────────┬────────┘
         │ 1. Request Settlement
         ▼
┌────────────────────────────┐
│  Facilitator API           │
│  POST /api/settlement/     │
│        request             │
└────────┬───────────────────┘
         │ 2. Calculate Fees
         │    Revenue - 2% platform fee
         ▼
┌────────────────────────────┐
│  Database                  │
│  Create Settlement Record  │
└────────┬───────────────────┘
         │ 3. Settlement Created
         │    Status: PENDING
         ▼
┌────────────────────────────┐
│  Cron Job (Every 1 hour)   │
│  Process Pending           │
└────────┬───────────────────┘
         │ 4. Execute Settlement
         ▼
┌─────────────────┐
│  Solana Network │
│  Transfer Funds │
└────────┬────────┘
         │ 5. TX Confirmed
         ▼
┌────────────────────────────┐
│  Facilitator API           │
│  Update Status: COMPLETED  │
│  Store TX Signature        │
└────────┬───────────────────┘
         │ 6. Send Webhook
         │    (HMAC Signed)
         ▼
┌─────────────────┐
│  Service        │
│  Provider       │
│  Webhook Handler│
└─────────────────┘
```

### Service Discovery Flow

```
┌─────────────────┐
│  Provider       │
└────────┬────────┘
         │ 1. Register Service
         ▼
┌────────────────────────────┐
│  Facilitator API           │
│  POST /api/services/       │
│        register            │
└────────┬───────────────────┘
         │ 2. Store in PostgreSQL
         ▼
┌────────────────────────────┐
│  Database                  │
│  Services Table            │
└────────┬───────────────────┘
         │ 3. Optional: On-chain
         ▼
┌─────────────────┐
│  Smart Contract │
│  x402-registry  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Consumer       │
│  Search Request │
└────────┬────────┘
         │ 4. Query Registry
         ▼
┌────────────────────────────┐
│  Registry API              │
│  GET /api/services/search  │
│  - Category Filter         │
│  - Price Range             │
│  - Rating Filter           │
│  - Token Filter            │
│  - Full-text Search        │
└────────┬───────────────────┘
         │ 5. Query Database
         │    + Redis Cache
         ▼
┌────────────────────────────┐
│  Results                   │
│  - Service Details         │
│  - Stats (calls, revenue)  │
│  - Reviews/Ratings         │
│  - API Schema              │
└────────┬───────────────────┘
         │ 6. Return Results
         ▼
┌─────────────────┐
│  Consumer       │
│  Browse/Select  │
└─────────────────┘
```

### Workflow Execution Flow

```
┌─────────────────┐
│  Consumer       │
│  Dashboard UI   │
└────────┬────────┘
         │ 1. Natural Language Input
         │    "Analyze sentiment and summarize"
         ▼
┌────────────────────────────┐
│  Reasoning Server          │
│  (AI Orchestrator)         │
└────────┬───────────────────┘
         │ 2. Plan DAG
         │    Step 1: Sentiment Analysis
         │    Step 2: Summarization
         │    Step 3: Translation
         ▼
┌────────────────────────────┐
│  Estimate Costs            │
│  - Service Discovery       │
│  - Price Calculation       │
└────────┬───────────────────┘
         │ 3. Request Approval
         │    Total: 0.0045 CASH
         ▼
┌─────────────────┐
│  Consumer       │
│  Approves       │
└────────┬────────┘
         │ 4. Execute Workflow
         ▼
┌────────────────────────────┐
│  Reasoning Server          │
│  For each step:            │
│  - Call service (x402)     │
│  - Track progress          │
│  - Stream events (WS)      │
│  - Handle payments         │
└────────┬───────────────────┘
         │ 5. Real-time Updates
         │    via WebSocket
         ▼
┌─────────────────┐
│  Dashboard UI   │
│  /workflows/[id]│
│  - Step Status  │
│  - Costs        │
│  - Results      │
└────────┬────────┘
         │ 6. Workflow Complete
         ▼
┌────────────────────────────┐
│  Final Results             │
│  - All Step Outputs        │
│  - Total Cost: 0.0043 CASH │
│  - Execution Time: 12.3s   │
└────────────────────────────┘
```

## Security Architecture

### Authentication Mechanisms

**1. Wallet Signature Authentication**
```typescript
// Ed25519 signature verification
function verifyWalletSignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = bs58.decode(signature);
  const publicKeyBytes = bs58.decode(publicKey);

  return nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes
  );
}
```

**2. API Key Authentication**
```typescript
// SHA-256 hashed API keys
function generateApiKey(): { key: string, hash: string } {
  const key = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash };
}
```

**3. TAP (Trustless Agent Protocol) - RFC 9421**
```typescript
// HTTP message signatures
Signature-Input: sig1=("@method" "@authority" "@path" "content-digest");
  created=1618884473;keyid="agent-key-1";alg="ed25519"
Signature: sig1=:K2qGT5srn2OGbOIDzQ6kYT+ruaycnDAAUpKv+ePFfD0RAxn/1BUe...
```

### Replay Protection

**Redis-based signature store:**
```typescript
class RedisSignatureStore {
  async hasSignature(signature: string): Promise<boolean> {
    return await this.redis.exists(`sig:${signature}`) === 1;
  }

  async storeSignature(signature: string, ttl: number = 3600): Promise<void> {
    await this.redis.setex(`sig:${signature}`, ttl, '1');
  }
}
```

### Rate Limiting

```typescript
// Per-endpoint rate limiting
const rateLimiter = {
  '/api/services/search': { max: 100, window: '1m' },
  '/api/payments/create': { max: 10, window: '1m' },
  '/api/settlement/request': { max: 5, window: '1h' }
};
```

### Input Validation

```typescript
// Zod schema validation
const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  category: z.enum(['ai-inference', 'data-oracle', 'storage']),
  pricePerCall: z.number().positive(),
  tokenMint: z.string().regex(/^[A-Za-z0-9]{32,44}$/),
  endpoint: z.string().url()
});
```

### Webhook Security

```typescript
// HMAC-SHA256 webhook signatures
function generateWebhookSignature(payload: object, secret: string): string {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

function verifyWebhookSignature(
  payload: object,
  signature: string,
  secret: string
): boolean {
  const expected = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

## Deployment Architecture

### Development Environment

```yaml
services:
  facilitator:
    build: ./packages/facilitator
    ports:
      - "4001:4001"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
      - SOLANA_RPC_URL=https://api.devnet.solana.com

  registry:
    build: ./packages/registry/api
    ports:
      - "4002:4002"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379

  dashboard:
    build: ./packages/dashboard
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_FACILITATOR_URL=http://localhost:4001
      - NEXT_PUBLIC_REGISTRY_URL=http://localhost:4002

  consumer-app:
    build: ./packages/consumer-app
    ports:
      - "3002:3002"
    environment:
      - NEXT_PUBLIC_FACILITATOR_URL=http://localhost:4001
      - NEXT_PUBLIC_REGISTRY_URL=http://localhost:4002

  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

### Production Deployment

**Infrastructure:**
- **Frontend:** Vercel (Next.js apps with edge functions)
- **Backend APIs:** Railway/Fly.io/AWS ECS
- **Database:** Supabase (PostgreSQL)
- **Redis:** Upstash (serverless Redis)
- **CDN:** Cloudflare
- **Monitoring:** Datadog/New Relic
- **Logging:** Axiom/Better Stack

**Environment Variables:**
```bash
# Production
NODE_ENV=production
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
DATABASE_URL=postgresql://prod-db.supabase.com/...
REDIS_URL=redis://prod.upstash.io/...
JWT_SECRET=[64-char-secret]
API_KEY_SALT=[64-char-salt]
WEBHOOK_SIGNING_SECRET=[64-char-secret]
ALLOWED_ORIGINS=https://app.x402.dev,https://dashboard.x402.dev
```

## Performance Considerations

### Caching Strategy

**Redis Caching:**
```typescript
// Service discovery cache (5 minutes)
const cachedServices = await redis.get('services:trending');
if (cachedServices) return JSON.parse(cachedServices);

const services = await db.service.findMany({ /* query */ });
await redis.setex('services:trending', 300, JSON.stringify(services));
```

**React Query Caching:**
```typescript
// Client-side caching
const { data } = useQuery({
  queryKey: ['services', filters],
  queryFn: () => fetchServices(filters),
  staleTime: 60000, // 1 minute
  cacheTime: 300000 // 5 minutes
});
```

### Database Optimization

```sql
-- Indexes for performance
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_rating ON services(average_rating DESC);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_settlements_provider ON settlements(provider_id, status);
```

### Rate Limiting & DDoS Protection

```typescript
// Distributed rate limiting with Redis
const rateLimiter = new RateLimiter({
  redis: redis,
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per window
  keyGenerator: (req) => req.headers['x-wallet-address']
});
```

## Monitoring & Observability

### Health Checks

```typescript
// /health endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    solana: await checkSolanaRPC(),
    uptime: process.uptime()
  };

  const healthy = Object.values(checks).every(c => c === true);
  res.status(healthy ? 200 : 503).json(checks);
});
```

### Metrics

```typescript
// Prometheus metrics
const metrics = {
  requestsTotal: new Counter('http_requests_total'),
  requestDuration: new Histogram('http_request_duration_seconds'),
  paymentsProcessed: new Counter('payments_processed_total'),
  settlementsExecuted: new Counter('settlements_executed_total'),
  activeConnections: new Gauge('active_websocket_connections')
};
```

### Logging

```typescript
// Structured logging with Pino
logger.info({
  event: 'payment_verified',
  signature: signature,
  amount: amount,
  from: from,
  to: to,
  duration: duration
});
```

## Testing Strategy

### Unit Tests

```typescript
// Vitest for unit tests
describe('PaymentVerifier', () => {
  it('should verify valid payment signature', async () => {
    const verifier = new PaymentVerifier(config);
    const result = await verifier.verify(signature, payment);
    expect(result).toBe(true);
  });
});
```

### Integration Tests

```typescript
// API integration tests
describe('Facilitator API', () => {
  it('should process payment end-to-end', async () => {
    const payment = await createPayment();
    const verification = await verifyPayment(payment.signature);
    expect(verification.status).toBe('confirmed');
  });
});
```

### E2E Tests

```typescript
// Playwright for E2E
test('complete service discovery flow', async ({ page }) => {
  await page.goto('/discover');
  await page.fill('[data-testid="search"]', 'sentiment analysis');
  await page.click('[data-testid="search-button"]');
  await expect(page.locator('.service-card')).toHaveCount(3);
});
```

## Future Enhancements

### Planned Features

1. **Multi-chain Support**
   - Ethereum L2s (Arbitrum, Optimism)
   - Other L1s (Avalanche, Polygon)
   - Cross-chain bridges

2. **Advanced Analytics**
   - Machine learning for fraud detection
   - Predictive analytics for service performance
   - Usage pattern analysis

3. **Enhanced Discovery**
   - AI-powered service recommendations
   - Semantic search with embeddings
   - Reputation-weighted ranking

4. **Governance**
   - DAO for platform decisions
   - Token-based voting
   - Community-driven service verification

5. **Enterprise Features**
   - Multi-tenant support
   - Advanced access controls
   - Custom pricing models
   - White-label solutions

## Conclusion

X402-UPL provides a comprehensive, production-ready platform for autonomous payments in the AI agent economy. The architecture is designed for scalability, security, and developer experience, with multi-language SDKs, comprehensive APIs, and production-grade infrastructure.

The system successfully demonstrates:
- Frictionless micropayments via x402 protocol
- Multi-framework middleware support
- Comprehensive service discovery and registry
- Professional frontend applications
- Production integrations with major platforms
- Enterprise-grade security and monitoring
- Multi-language SDK support

For setup instructions, see [SETUP.md](./SETUP.md).
