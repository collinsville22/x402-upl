# Triton/Old Faithful RPC Integration

## Overview

The Triton/Old Faithful RPC Integration is a production-grade monetization layer for Solana's complete historical blockchain data, built on the x402 Universal Payment Layer. This integration transforms Old Faithful RPC (Triton's historical Solana data provider) into a sustainable business model through HTTP 402 Payment Required enforcement, Visa TAP authentication, and on-chain CASH micropayments.

Old Faithful provides access to the complete Solana blockchain history, enabling developers to query historical blocks, transactions, account states, and other archived data that standard RPC nodes typically don't retain. By wrapping Old Faithful with x402's payment infrastructure, data providers can monetize this valuable historical data on a per-request basis with transparent, cryptographic payment verification.

### Key Value Proposition

- **Complete Historical Access**: Query any block, transaction, or account state from Solana's entire blockchain history
- **Pay-per-Use Model**: Only pay for the specific historical data you query, with transparent pricing
- **Automatic Monetization**: Data providers earn CASH tokens automatically for every RPC request
- **TAP Authentication**: Secure, cryptographic identity verification using Visa's Trusted Agent Protocol
- **Dynamic Pricing**: Costs scale based on data age, volume, and query complexity
- **Production Ready**: Built with enterprise-grade monitoring, caching, and rate limiting

## Features

### RPC Proxy with Payment Enforcement

The integration implements a transparent HTTP proxy that sits between clients and Old Faithful RPC servers, intercepting requests to enforce payment requirements before forwarding them upstream:

- **HTTP 402 Payment Required**: Standards-compliant HTTP status code indicating payment is needed
- **Fastify-based Architecture**: High-performance async HTTP server with built-in routing
- **Request Validation**: JSON-RPC 2.0 compliance checking and method validation
- **Automatic Cost Calculation**: Real-time pricing based on request parameters
- **Payment Verification**: On-chain CASH token transfer verification via Solana blockchain
- **Seamless Forwarding**: Transparent proxy behavior once payment is verified

### TAP Authentication

Built-in Visa Trusted Agent Protocol (TAP) authentication ensures every request comes from a verified identity:

- **RFC 9421 HTTP Message Signatures**: Standards-compliant cryptographic signatures
- **Ed25519 & RSA Support**: Multiple signature algorithms for flexibility
- **Identity Registry Integration**: Automatic public key lookup from TAP registry
- **Replay Attack Prevention**: Nonce-based protection against signature reuse
- **Signature Expiration**: Time-limited signatures for enhanced security
- **Identity Caching**: Performance optimization with configurable TTL

### Dynamic Pricing Engine

Sophisticated pricing model that adapts to data characteristics:

- **Base Pricing**: Per-method base costs (e.g., `getBlock` = 0.0001 CASH)
- **Volume Multipliers**: Additional cost based on data size (transactions per block, signatures per address)
- **Age Multipliers**: Higher costs for older data (recent: 1x, 30-180 days: 2x, >180 days: 5x)
- **Complexity Factors**: Pricing adjustments for transaction version support, reward inclusion, etc.
- **Real-time Calculation**: Costs computed dynamically based on current blockchain state
- **Transparent Breakdown**: Detailed cost explanation returned with payment requirements

### Tiered Subscription Model

Support for different usage tiers (primarily for gRPC streaming):

| Tier | Max Filters | Accounts/Filter | Bytes per CASH | Use Case |
|------|-------------|-----------------|----------------|----------|
| Free | 1 | 10 | 1 MB | Testing, small projects |
| Developer | 5 | 100 | 1 MB | Development, prototypes |
| Professional | 20 | 1,000 | 1 MB | Production apps |
| Enterprise | 100 | 10,000 | 1 MB | Large-scale deployments |

### gRPC Streaming Support

Integration with Yellowstone gRPC for real-time blockchain streaming:

- **Quota-based Billing**: Pay for data volume streamed over gRPC connections
- **Rust Interceptor**: High-performance gRPC middleware for quota enforcement
- **Subscription Verification**: TAP authentication for gRPC stream initiation
- **Real-time Monitoring**: Track quota usage and remaining balance per client
- **Graceful Degradation**: Automatic stream closure when quota exhausted

### Production Features

- **Redis Caching**: Optional Redis integration for response caching and nonce storage
- **Rate Limiting**: Configurable requests-per-minute limits per IP/identity
- **Health Checks**: `/health` endpoint for monitoring and load balancer integration
- **Metrics Endpoint**: Real-time statistics on requests, revenue, and performance
- **Structured Logging**: Pino-based JSON logging with pretty-print development mode
- **Docker Deployment**: Production-ready Docker Compose and Kubernetes configurations
- **Graceful Shutdown**: Proper cleanup of connections and in-flight requests

## Architecture

### System Components

```
┌─────────────┐                 ┌──────────────────┐                 ┌─────────────┐
│   Client    │                 │  x402 Triton     │                 │     Old     │
│ Application │◄───────────────►│   RPC Proxy      │◄───────────────►│  Faithful   │
│             │   HTTP 402      │                  │    JSON-RPC     │     RPC     │
└─────────────┘                 └──────────────────┘                 └─────────────┘
       │                                 │
       │                                 │
       │         ┌──────────────────────┼────────────────────┐
       │         │                      │                    │
       ▼         ▼                      ▼                    ▼
┌─────────────┐ ┌──────────────┐ ┌──────────┐      ┌──────────────┐
│    TAP      │ │    x402      │ │  Solana  │      │    Redis     │
│  Registry   │ │   Registry   │ │    RPC   │      │    Cache     │
└─────────────┘ └──────────────┘ └──────────┘      └──────────────┘
```

### Request Flow

1. **Authentication Phase**
   - Client creates JSON-RPC request with desired method and parameters
   - Client signs request with TAP private key using RFC 9421 HTTP signatures
   - Client sends signed request to proxy with `Signature` header

2. **Verification Phase**
   - Proxy verifies TAP signature against public key from registry
   - Proxy checks nonce for replay attack prevention
   - Proxy validates signature expiration and algorithm match

3. **Pricing Phase**
   - Proxy extracts slot number from request parameters (if applicable)
   - Pricing engine calculates base cost, volume cost, and age multiplier
   - Total cost computed: `(Base + Volume) × Age Multiplier`

4. **Payment Phase**
   - If cost > 0 and no payment proof provided:
     - Return HTTP 402 with payment requirements (amount, recipient, mint, requestId)
     - Store payment requirement in Redis with 5-minute TTL
   - If payment proof provided:
     - Retrieve stored payment requirement by requestId
     - Verify CASH token transfer on Solana blockchain
     - Check signature hasn't been used before (replay prevention)
     - Validate amount, recipient, and mint match requirements

5. **Forwarding Phase**
   - Once payment verified, forward request to Old Faithful RPC
   - Wait for response from upstream server
   - Return response to client with status 200

6. **Metrics Phase**
   - Increment request counters
   - Add revenue to running total
   - Update method-specific statistics

### RPC Proxy Architecture

The `OldFaithfulProxy` class is the core component:

```typescript
class OldFaithfulProxy {
  private server: FastifyInstance;           // HTTP server
  private pricing: PricingEngine;            // Cost calculation
  private paymentVerifier: PaymentVerifier;  // Blockchain verification
  private tapVerifier: TAPVerifier;          // Signature verification
  private registryClient: X402RegistryClient; // Service registration
  private redis?: Redis;                     // Optional caching layer
  private metrics: MetricsData;              // Request statistics
}
```

Key responsibilities:
- HTTP server lifecycle management
- Request routing and middleware setup
- TAP signature verification coordination
- Payment requirement generation and verification
- Upstream RPC request forwarding
- Metrics collection and reporting
- Service registration with x402 marketplace

### Quota Management

For gRPC streaming subscriptions, quota management operates separately:

1. **Subscription Initiation**
   - Client establishes gRPC connection with TAP metadata
   - Rust interceptor verifies TAP signature
   - Interceptor checks subscription tier and quota limits

2. **Data Streaming**
   - Each message sent increments byte counter
   - Interceptor checks remaining quota before each send
   - If quota exceeded, gracefully close stream with error

3. **Quota Replenishment**
   - Client can send additional CASH payment to increase quota
   - Interceptor verifies payment and updates available quota
   - Streaming continues with new quota balance

### Monitoring and Observability

The proxy exposes several monitoring endpoints:

- **`GET /health`**: Service health status, uptime, basic metrics
- **`GET /metrics`**: Detailed statistics (requests, revenue, errors, cache hits)
- **`GET /pricing`**: Current pricing tiers and payment recipient

Metrics tracked:
- `totalRequests`: All incoming RPC requests
- `paidRequests`: Requests that required payment
- `revenue`: Total CASH tokens earned
- `cacheHits`: Successful cache retrievals (if Redis enabled)
- `errors`: Failed requests or upstream errors
- `methodCounts`: Per-method request counts
- `methodRevenue`: Per-method revenue breakdown

## Installation

### Prerequisites

- Node.js 18+ and npm
- Old Faithful RPC server (or access to hosted instance)
- Solana wallet for receiving payments
- TAP Registry server (for identity management)
- x402 Registry server (for service marketplace)
- Redis server (optional, for caching and production deployments)

### Package Installation

```bash
# Clone the x402-upl repository
git clone https://github.com/x402-upl/x402-upl.git
cd x402-upl

# Install dependencies
npm install

# Build all packages
npm run build

# Navigate to Triton integration
cd packages/integrations/triton

# Build the integration
npm run build
```

### Environment Setup

Create a `.env` file in `packages/integrations/triton/`:

```env
# Server Configuration
PORT=3002
HOST=0.0.0.0

# Old Faithful RPC Endpoint
OLD_FAITHFUL_URL=http://localhost:8899

# Payment Configuration
PAYMENT_RECIPIENT=YourSolanaWalletAddress

# Authentication
TAP_REGISTRY_URL=http://localhost:8001

# Service Discovery
X402_REGISTRY_URL=http://localhost:3001

# Blockchain RPC (for payment verification)
SOLANA_RPC_URL=https://api.devnet.solana.com

# Redis (optional, recommended for production)
REDIS_URL=redis://localhost:6379

# Caching (milliseconds)
CACHE_TTL=60000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
```

### Starting the Proxy

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run start:proxy
```

You should see output like:

```
[12:34:56] INFO: Old Faithful x402 Proxy running on 0.0.0.0:3002
[12:34:56] INFO: Registered getBlock in x402 Registry
[12:34:56] INFO: Registered getTransaction in x402 Registry
[12:34:56] INFO: Registered getSignaturesForAddress in x402 Registry
...
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3002 | HTTP server port |
| `HOST` | No | 0.0.0.0 | Bind address (0.0.0.0 for all interfaces) |
| `OLD_FAITHFUL_URL` | Yes | - | Upstream Old Faithful RPC endpoint |
| `PAYMENT_RECIPIENT` | Yes | - | Solana wallet address for receiving CASH payments |
| `TAP_REGISTRY_URL` | No | http://localhost:8001 | TAP identity registry endpoint |
| `X402_REGISTRY_URL` | No | http://localhost:3001 | x402 service registry endpoint |
| `SOLANA_RPC_URL` | No | https://api.devnet.solana.com | Solana RPC for payment verification |
| `REDIS_URL` | No | - | Redis connection URL (redis://host:port) |
| `CACHE_TTL` | No | 60000 | Cache time-to-live in milliseconds |
| `RATE_LIMIT_PER_MINUTE` | No | 100 | Maximum requests per minute per IP |

### Old Faithful Connection

The proxy connects to an Old Faithful RPC server, which provides complete Solana blockchain history:

**Local Development:**
```env
OLD_FAITHFUL_URL=http://localhost:8899
```

**Hosted Instance:**
```env
OLD_FAITHFUL_URL=https://your-old-faithful-instance.com
```

**Docker Compose:**
```env
OLD_FAITHFUL_URL=http://old-faithful:8899
```

Old Faithful servers typically listen on port 8899 and implement the standard Solana JSON-RPC interface with extended historical data availability.

### Pricing Tier Configuration

Pricing tiers are defined in `src/pricing.ts`. To customize pricing:

```typescript
// src/pricing.ts
private initializePricingTiers(): void {
  const tiers: PricingTier[] = [
    {
      method: 'getBlock',
      basePrice: 0.0001,           // Base cost in CASH
      volumeMultiplier: 0.00001,   // Cost per transaction in block
      ageMultiplier: 1.0,          // Enable age-based pricing
    },
    {
      method: 'getTransaction',
      basePrice: 0.00005,
      volumeMultiplier: 0,         // No volume scaling
      ageMultiplier: 1.0,
    },
    // Add custom methods here
  ];
}
```

**Age Multiplier Thresholds:**

```typescript
// Slots per day (approximately 2.5 slots/second × 86400 seconds)
private slotsPerDay = 216000;

// Age calculation in calculateCost()
if (slotAge > this.slotsPerDay * 180) {
  ageMultiplier = 5.0;  // Archive data (>180 days old)
} else if (slotAge > this.slotsPerDay * 30) {
  ageMultiplier = 2.0;  // Historical data (30-180 days old)
} else {
  ageMultiplier = 1.0;  // Recent data (<30 days old)
}
```

### Redis Configuration

Redis is optional but highly recommended for production:

**Benefits:**
- Payment requirement storage (prevents replay attacks)
- Response caching (reduces upstream load)
- Nonce tracking (prevents TAP signature reuse)
- Distributed rate limiting (across multiple proxy instances)

**Setup:**

```bash
# Install Redis
docker run -d -p 6379:6379 redis:7-alpine

# Configure in .env
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://:password@localhost:6379

# With database selection
REDIS_URL=redis://localhost:6379/0
```

**Key Patterns:**
- `payment:{requestId}`: Stored payment requirements (TTL: 300s)
- `triton:payments:{signature}`: Verified payment signatures (TTL: 86400s)
- `tap:nonces:{nonce}`: Used TAP nonces (TTL: 86400s)

### Programmatic Configuration

You can also configure the proxy programmatically:

```typescript
import { OldFaithfulProxy, ProxyConfig } from '@x402-upl/integration-triton';

const config: ProxyConfig = {
  port: 3002,
  host: '0.0.0.0',
  oldFaithfulUrl: 'http://localhost:8899',
  paymentRecipient: 'YourSolanaWalletAddress',
  tapRegistryUrl: 'http://localhost:8001',
  x402RegistryUrl: 'http://localhost:3001',
  solanaRpcUrl: 'https://api.devnet.solana.com',
  redisUrl: 'redis://localhost:6379',
  cacheTTL: 60000,
  rateLimitPerMinute: 100,
};

const proxy = new OldFaithfulProxy(config);

await proxy.start();

// Graceful shutdown
process.on('SIGINT', async () => {
  await proxy.stop();
  process.exit(0);
});
```

## Usage

### Client Setup

To use the Triton RPC proxy, clients need to:

1. Register with TAP Registry
2. Sign RPC requests with TAP signatures
3. Handle HTTP 402 responses
4. Execute CASH payments on Solana
5. Retry requests with payment proof

### Basic RPC Request

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import axios from 'axios';

// Initialize TAP agent
const tapAgent = new VisaTAPAgent({
  registryUrl: 'http://localhost:8001',
  name: 'My Application',
  domain: 'myapp.example.com',
  algorithm: 'ed25519',
});

// Register identity
await tapAgent.register();

// Create RPC request
const rpcRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getSlot',
  params: [],
};

// Sign request
const headers = await tapAgent.signRequest('POST', '/', rpcRequest);

// Send request
const response = await axios.post('http://localhost:3002', rpcRequest, {
  headers,
  validateStatus: () => true, // Accept all status codes
});

if (response.status === 200) {
  console.log('Current slot:', response.data.result);
}
```

### Handling Payment Requirements

```typescript
const response = await axios.post('http://localhost:3002', rpcRequest, {
  headers,
  validateStatus: () => true,
});

if (response.status === 402) {
  // Payment required
  const paymentData = response.data.error.data;

  console.log('Payment Required:');
  console.log(`Amount: ${paymentData.amount} CASH`);
  console.log(`Recipient: ${paymentData.recipient}`);
  console.log(`Request ID: ${paymentData.requestId}`);
  console.log(`Expires: ${new Date(paymentData.expiresAt)}`);

  // Cost breakdown
  console.log('Cost Breakdown:', paymentData.breakdown);
  // {
  //   method: 'getBlock',
  //   params: { param0: 100000 },
  //   dataVolume: 1000,
  //   dataAge: 43200000,
  //   baseCost: 0.0001,
  //   volumeCost: 0.01,
  //   ageMultiplier: 2.0,
  //   totalCost: 0.0202
  // }
}
```

### Executing CASH Payment

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = Keypair.fromSecretKey(/* your secret key */);

// CASH token mint on Solana
const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');

// Get token accounts
const senderTokenAccount = await getAssociatedTokenAddress(
  CASH_MINT,
  wallet.publicKey
);

const recipientTokenAccount = await getAssociatedTokenAddress(
  CASH_MINT,
  new PublicKey(paymentData.recipient)
);

// Create transfer instruction
const transferInstruction = createTransferCheckedInstruction(
  senderTokenAccount,
  CASH_MINT,
  recipientTokenAccount,
  wallet.publicKey,
  paymentData.amount * 1_000_000_000, // Convert to lamports (9 decimals)
  9, // CASH decimals
  [],
  TOKEN_PROGRAM_ID
);

// Send transaction
const { blockhash } = await connection.getLatestBlockhash();
const transaction = new Transaction().add(transferInstruction);
transaction.recentBlockhash = blockhash;
transaction.feePayer = wallet.publicKey;
transaction.sign(wallet);

const signature = await connection.sendRawTransaction(transaction.serialize());
await connection.confirmTransaction(signature, 'confirmed');

console.log('Payment sent:', signature);
```

### Retrying with Payment Proof

```typescript
// Create payment proof
const paymentProof = {
  signature: signature, // Transaction signature from above
  amount: paymentData.amount,
  sender: wallet.publicKey.toBase58(),
  recipient: paymentData.recipient,
  mint: paymentData.mint,
  timestamp: Date.now(),
  requestId: paymentData.requestId,
};

// Sign new request (with fresh nonce)
const retryHeaders = await tapAgent.signRequest('POST', '/', rpcRequest);

// Add payment proof header
retryHeaders['X-Payment-Proof'] = JSON.stringify(paymentProof);

// Retry request
const retryResponse = await axios.post('http://localhost:3002', rpcRequest, {
  headers: retryHeaders,
});

if (retryResponse.status === 200) {
  console.log('Success! Result:', retryResponse.data.result);
} else {
  console.error('Payment verification failed:', retryResponse.data.error);
}
```

### Subscription Management

For gRPC streaming subscriptions (requires Rust interceptor):

```typescript
import { X402RegistryClient } from '@x402-upl/integration-triton';

const registryClient = new X402RegistryClient('http://localhost:3001');

// Discover Old Faithful streaming services
const services = await registryClient.discoverServices({
  category: 'historical-data',
  capabilities: ['gRPC-streaming'],
});

console.log('Available streaming services:', services);

// Subscribe to service
// (gRPC client implementation would go here)
```

### Historical Data Queries

#### Query Recent Block

```typescript
const recentBlockRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getBlock',
  params: [
    270000000, // Recent slot number
    {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
      transactionDetails: 'full',
      rewards: true,
    }
  ],
};

// Cost: ~0.0001 CASH (base) + ~0.01 CASH (volume) × 1.0 (recent) = ~0.0101 CASH
```

#### Query Historical Block (30-180 days old)

```typescript
const historicalBlockRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'getBlock',
  params: [
    250000000, // Historical slot
    {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
      transactionDetails: 'full',
      rewards: false,
    }
  ],
};

// Cost: ~0.0001 CASH (base) + ~0.008 CASH (volume) × 2.0 (historical) = ~0.0162 CASH
```

#### Query Archive Block (>180 days old)

```typescript
const archiveBlockRequest = {
  jsonrpc: '2.0',
  id: 3,
  method: 'getBlock',
  params: [
    100000000, // Archive slot
    {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
      transactionDetails: 'signatures',
      rewards: false,
    }
  ],
};

// Cost: ~0.0001 CASH (base) + ~0.005 CASH (volume) × 5.0 (archive) = ~0.0255 CASH
```

#### Query Transaction by Signature

```typescript
const txRequest = {
  jsonrpc: '2.0',
  id: 4,
  method: 'getTransaction',
  params: [
    '5wHu1qwD7q5ifaN5HHfHzBNKGqvQzWCKqL3j9KYdPgr6vT4kBgc2rSbaDj2jCHeP3J5KdvQzW',
    {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
    }
  ],
};

// Cost: 0.00005 CASH (base) × age_multiplier
// Recent: 0.00005 CASH
// Historical: 0.0001 CASH
// Archive: 0.00025 CASH
```

#### Query Account Transaction History

```typescript
const historyRequest = {
  jsonrpc: '2.0',
  id: 5,
  method: 'getSignaturesForAddress',
  params: [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Example: Token Program
    {
      limit: 1000,
      before: undefined,
    }
  ],
};

// Cost: 0.0001 CASH (base) + (0.000001 × 1000 signatures) = 0.0011 CASH
```

## API Reference

### RPC Methods

All methods follow JSON-RPC 2.0 specification. Request format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "methodName",
  "params": []
}
```

Response format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```

Error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Error description",
    "data": {}
  }
}
```

#### getBlock

Retrieves a confirmed block with all transactions and metadata.

**Parameters:**
1. `slot` (number): Block slot number
2. `config` (object, optional):
   - `encoding`: Encoding format ("json" | "jsonParsed" | "base58" | "base64")
   - `transactionDetails`: Level of detail ("full" | "accounts" | "signatures" | "none")
   - `rewards`: Include reward information (boolean)
   - `maxSupportedTransactionVersion`: Transaction version support (number)

**Returns:** Block object with transactions, metadata, and rewards

**Pricing:**
- Base: 0.0001 CASH
- Volume: 0.00001 CASH per transaction
- Age multiplier: Yes

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getBlock',
  params: [
    166974442,
    {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
      transactionDetails: 'full',
      rewards: true,
    }
  ],
};
```

#### getTransaction

Retrieves a confirmed transaction by signature.

**Parameters:**
1. `signature` (string): Transaction signature (base58)
2. `config` (object, optional):
   - `encoding`: Encoding format ("json" | "jsonParsed" | "base58" | "base64")
   - `maxSupportedTransactionVersion`: Transaction version support (number)
   - `commitment`: Commitment level ("finalized" | "confirmed")

**Returns:** Transaction object with full details and metadata

**Pricing:**
- Base: 0.00005 CASH
- Volume: None
- Age multiplier: Yes

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getTransaction',
  params: [
    '5wHu1qwD7q5ifaN5HHfHzBNKGqvQzWCKqL3j9KYdPgr6vT4kBgc2rSbaDj2jCHeP3J5KdvQzW',
    {
      encoding: 'jsonParsed',
      maxSupportedTransactionVersion: 0,
    }
  ],
};
```

#### getSignaturesForAddress

Returns confirmed signatures for transactions involving an address, with optional time filtering.

**Parameters:**
1. `address` (string): Account public key (base58)
2. `config` (object, optional):
   - `limit`: Maximum number of signatures (1-1000)
   - `before`: Start searching backwards from this signature
   - `until`: Search until this signature
   - `commitment`: Commitment level ("finalized" | "confirmed")

**Returns:** Array of signature information objects

**Pricing:**
- Base: 0.0001 CASH
- Volume: 0.000001 CASH per signature
- Age multiplier: No

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getSignaturesForAddress',
  params: [
    'Vote111111111111111111111111111111111111111',
    {
      limit: 100,
    }
  ],
};
```

#### getBlockTime

Returns the estimated production time of a block as Unix timestamp.

**Parameters:**
1. `slot` (number): Block slot number

**Returns:** Unix timestamp (seconds) or null if not available

**Pricing:**
- Base: 0.00001 CASH
- Volume: None
- Age multiplier: Yes

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getBlockTime',
  params: [166974442],
};
```

#### getGenesisHash

Returns the genesis hash of the blockchain.

**Parameters:** None

**Returns:** Genesis hash (base58 string)

**Pricing:**
- Base: 0.000005 CASH
- Volume: None
- Age multiplier: No

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getGenesisHash',
  params: [],
};
```

#### getVersion

Returns the current Solana version running on the node.

**Parameters:** None

**Returns:** Object with `solana-core` version and feature set identifier

**Pricing:**
- Base: 0.000005 CASH
- Volume: None
- Age multiplier: No

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getVersion',
  params: [],
};
```

#### getSlot

Returns the current slot the node is processing.

**Parameters:**
1. `config` (object, optional):
   - `commitment`: Commitment level ("finalized" | "confirmed" | "processed")

**Returns:** Current slot number

**Pricing:**
- Base: 0.000005 CASH
- Volume: None
- Age multiplier: No

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getSlot',
  params: [],
};
```

#### getFirstAvailableBlock

Returns the slot of the lowest confirmed block available for retrieval.

**Parameters:** None

**Returns:** Slot number (number)

**Pricing:**
- Base: 0.00001 CASH
- Volume: None
- Age multiplier: No

**Example:**

```typescript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getFirstAvailableBlock',
  params: [],
};
```

### Proxy Endpoints

#### GET /health

Health check endpoint for monitoring and load balancer integration.

**Response:**

```json
{
  "status": "healthy",
  "uptime": 3600.5,
  "metrics": {
    "totalRequests": 1234,
    "paidRequests": 567,
    "revenue": 12.345,
    "cacheHits": 234,
    "errors": 5
  }
}
```

**Use Cases:**
- Load balancer health checks
- Monitoring system integration
- Service discovery probes

#### GET /pricing

Returns current pricing tiers and payment configuration.

**Response:**

```json
{
  "tiers": [
    {
      "method": "getBlock",
      "basePrice": 0.0001,
      "volumeMultiplier": 0.00001,
      "ageMultiplier": 1.0
    },
    {
      "method": "getTransaction",
      "basePrice": 0.00005,
      "volumeMultiplier": 0,
      "ageMultiplier": 1.0
    }
  ],
  "currency": "CASH",
  "paymentRecipient": "YourSolanaWalletAddress"
}
```

**Use Cases:**
- Client-side cost estimation
- Price comparison
- Documentation generation

#### GET /metrics

Detailed metrics for monitoring and analytics.

**Response:**

```json
{
  "totalRequests": 5432,
  "paidRequests": 2456,
  "revenue": 234.56,
  "cacheHits": 1234,
  "errors": 23,
  "methodCounts": {
    "getBlock": 1234,
    "getTransaction": 890,
    "getSignaturesForAddress": 456
  },
  "methodRevenue": {
    "getBlock": 123.45,
    "getTransaction": 67.89,
    "getSignaturesForAddress": 43.22
  }
}
```

**Use Cases:**
- Revenue tracking
- Usage analytics
- Performance monitoring
- Method popularity analysis

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32600 | Invalid Request | Malformed JSON-RPC request |
| -32601 | Method not found | RPC method doesn't exist |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 | Upstream RPC error | Error from Old Faithful RPC |
| -32001 | TAP authentication failed | Signature verification failed |
| -32002 | Invalid or expired payment request | Payment requirement not found or expired |
| -32003 | Payment verification failed | CASH payment not verified on blockchain |
| 402 | Payment Required | Payment needed to process request |

### HTTP Headers

#### Request Headers

**Signature** (required):
TAP signature header following RFC 9421 format.

```
Signature: keyid="client123",algorithm="ed25519",headers="@method @path content-digest",created=1699564800,nonce="abc123",signature="base64..."
```

**X-Payment-Proof** (conditional):
JSON-encoded payment proof for retry after HTTP 402.

```json
{
  "signature": "5wHu1qwD...",
  "amount": 0.0101,
  "sender": "SenderWalletAddress",
  "recipient": "RecipientWalletAddress",
  "mint": "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT",
  "timestamp": 1699564800000,
  "requestId": "abc123def456"
}
```

**Content-Type** (required):
```
Content-Type: application/json
```

#### Response Headers

**Content-Type**:
```
Content-Type: application/json
```

**X-Request-Cost** (optional):
May be included in successful responses to show actual cost charged.

```
X-Request-Cost: 0.0101
```

## Examples

### Complete Historical Query Flow

This example demonstrates the complete flow from authentication through payment to data retrieval:

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import axios from 'axios';

const PROXY_URL = 'http://localhost:3002';
const SOLANA_RPC = 'https://api.devnet.solana.com';
const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');

async function queryHistoricalBlock(slot: number) {
  // Step 1: Initialize TAP agent
  const tapAgent = new VisaTAPAgent({
    registryUrl: 'http://localhost:8001',
    name: 'Historical Data Client',
    domain: 'client.example.com',
    algorithm: 'ed25519',
  });

  await tapAgent.register();
  console.log('✓ TAP identity registered');

  // Step 2: Create RPC request
  const rpcRequest = {
    jsonrpc: '2.0' as const,
    id: 1,
    method: 'getBlock',
    params: [
      slot,
      {
        encoding: 'json',
        maxSupportedTransactionVersion: 0,
        transactionDetails: 'full',
        rewards: true,
      }
    ],
  };

  // Step 3: Sign request
  const headers = await tapAgent.signRequest('POST', '/', rpcRequest);
  console.log('✓ Request signed with TAP');

  // Step 4: Send initial request
  let response = await axios.post(PROXY_URL, rpcRequest, {
    headers,
    validateStatus: () => true,
  });

  // Step 5: Handle payment requirement
  if (response.status === 402) {
    console.log('Payment required');

    const paymentData = response.data.error.data;
    console.log(`Amount: ${paymentData.amount} CASH`);
    console.log(`Recipient: ${paymentData.recipient}`);
    console.log('Breakdown:', paymentData.breakdown);

    // Step 6: Execute CASH payment
    const wallet = Keypair.fromSecretKey(/* your secret key */);
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    const senderTokenAccount = await getAssociatedTokenAddress(
      CASH_MINT,
      wallet.publicKey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      CASH_MINT,
      new PublicKey(paymentData.recipient)
    );

    const transferInstruction = createTransferCheckedInstruction(
      senderTokenAccount,
      CASH_MINT,
      recipientTokenAccount,
      wallet.publicKey,
      Math.ceil(paymentData.amount * 1_000_000_000),
      9,
      [],
      TOKEN_PROGRAM_ID
    );

    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction().add(transferInstruction);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    transaction.sign(wallet);

    const signature = await connection.sendRawTransaction(
      transaction.serialize()
    );

    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✓ Payment sent:', signature);

    // Step 7: Retry with payment proof
    const paymentProof = {
      signature,
      amount: paymentData.amount,
      sender: wallet.publicKey.toBase58(),
      recipient: paymentData.recipient,
      mint: paymentData.mint,
      timestamp: Date.now(),
      requestId: paymentData.requestId,
    };

    const retryHeaders = await tapAgent.signRequest('POST', '/', rpcRequest);
    retryHeaders['X-Payment-Proof'] = JSON.stringify(paymentProof);

    response = await axios.post(PROXY_URL, rpcRequest, {
      headers: retryHeaders,
    });
  }

  // Step 8: Process result
  if (response.status === 200) {
    const block = response.data.result;
    console.log('✓ Block retrieved');
    console.log(`Block height: ${block.blockHeight}`);
    console.log(`Transactions: ${block.transactions.length}`);
    console.log(`Block time: ${new Date(block.blockTime * 1000).toISOString()}`);
    console.log(`Parent slot: ${block.parentSlot}`);

    return block;
  } else {
    throw new Error(`Request failed: ${response.data.error?.message}`);
  }
}

// Usage
queryHistoricalBlock(166974442).catch(console.error);
```

### Block Data Analysis

Analyzing historical block data to extract insights:

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import axios from 'axios';

interface BlockStats {
  slot: number;
  blockTime: Date;
  transactionCount: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalFees: number;
  uniqueSigners: Set<string>;
  programUsage: Map<string, number>;
}

async function analyzeBlockRange(startSlot: number, endSlot: number): Promise<BlockStats[]> {
  const tapAgent = new VisaTAPAgent({
    registryUrl: 'http://localhost:8001',
    name: 'Block Analyzer',
    domain: 'analyzer.example.com',
    algorithm: 'ed25519',
  });

  await tapAgent.register();

  const stats: BlockStats[] = [];

  for (let slot = startSlot; slot <= endSlot; slot++) {
    const rpcRequest = {
      jsonrpc: '2.0' as const,
      id: slot,
      method: 'getBlock',
      params: [
        slot,
        {
          encoding: 'json',
          maxSupportedTransactionVersion: 0,
          transactionDetails: 'full',
          rewards: false,
        }
      ],
    };

    const headers = await tapAgent.signRequest('POST', '/', rpcRequest);

    const response = await axios.post('http://localhost:3002', rpcRequest, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 402) {
      // Handle payment (implementation from previous example)
      continue;
    }

    if (response.status === 200) {
      const block = response.data.result;

      const blockStats: BlockStats = {
        slot,
        blockTime: new Date(block.blockTime * 1000),
        transactionCount: block.transactions.length,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalFees: 0,
        uniqueSigners: new Set(),
        programUsage: new Map(),
      };

      for (const tx of block.transactions) {
        if (tx.meta.err) {
          blockStats.failedTransactions++;
        } else {
          blockStats.successfulTransactions++;
        }

        blockStats.totalFees += tx.meta.fee;

        // Track signers
        for (const signature of tx.transaction.signatures) {
          blockStats.uniqueSigners.add(signature);
        }

        // Track program usage
        for (const instruction of tx.transaction.message.instructions) {
          const programId = tx.transaction.message.accountKeys[instruction.programIdIndex];
          const count = blockStats.programUsage.get(programId) || 0;
          blockStats.programUsage.set(programId, count + 1);
        }
      }

      stats.push(blockStats);

      console.log(`Analyzed slot ${slot}: ${blockStats.transactionCount} transactions`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return stats;
}

// Usage
analyzeBlockRange(166974442, 166974452)
  .then(stats => {
    console.log('\nAnalysis Summary:');
    console.log(`Total blocks: ${stats.length}`);
    console.log(`Total transactions: ${stats.reduce((sum, s) => sum + s.transactionCount, 0)}`);
    console.log(`Average transactions per block: ${
      stats.reduce((sum, s) => sum + s.transactionCount, 0) / stats.length
    }`);
  })
  .catch(console.error);
```

### Transaction Lookup and Verification

Looking up specific transactions and verifying their execution:

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import axios from 'axios';

interface TransactionDetails {
  signature: string;
  slot: number;
  blockTime: Date;
  success: boolean;
  fee: number;
  computeUnitsConsumed: number;
  preBalances: number[];
  postBalances: number[];
  logMessages: string[];
  innerInstructions: any[];
}

async function lookupTransaction(signature: string): Promise<TransactionDetails | null> {
  const tapAgent = new VisaTAPAgent({
    registryUrl: 'http://localhost:8001',
    name: 'Transaction Lookup Tool',
    domain: 'lookup.example.com',
    algorithm: 'ed25519',
  });

  await tapAgent.register();

  const rpcRequest = {
    jsonrpc: '2.0' as const,
    id: 1,
    method: 'getTransaction',
    params: [
      signature,
      {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0,
      }
    ],
  };

  const headers = await tapAgent.signRequest('POST', '/', rpcRequest);

  const response = await axios.post('http://localhost:3002', rpcRequest, {
    headers,
    validateStatus: () => true,
  });

  if (response.status === 402) {
    // Handle payment (implementation from previous example)
    console.log('Payment required:', response.data.error.data);
    return null;
  }

  if (response.status === 200 && response.data.result) {
    const tx = response.data.result;

    return {
      signature,
      slot: tx.slot,
      blockTime: new Date(tx.blockTime * 1000),
      success: !tx.meta.err,
      fee: tx.meta.fee,
      computeUnitsConsumed: tx.meta.computeUnitsConsumed || 0,
      preBalances: tx.meta.preBalances,
      postBalances: tx.meta.postBalances,
      logMessages: tx.meta.logMessages || [],
      innerInstructions: tx.meta.innerInstructions || [],
    };
  }

  return null;
}

async function verifyTokenTransfer(
  signature: string,
  expectedSender: string,
  expectedRecipient: string,
  expectedAmount: number
): Promise<boolean> {
  const details = await lookupTransaction(signature);

  if (!details || !details.success) {
    return false;
  }

  // Parse transaction for token transfer
  // This is a simplified example; actual parsing depends on instruction format
  const transferInstruction = details.innerInstructions
    .flat()
    .find(ix =>
      ix.parsed?.type === 'transfer' &&
      ix.parsed?.info?.source === expectedSender &&
      ix.parsed?.info?.destination === expectedRecipient
    );

  if (!transferInstruction) {
    return false;
  }

  const actualAmount = parseFloat(transferInstruction.parsed.info.amount);
  return actualAmount === expectedAmount;
}

// Usage
lookupTransaction('5wHu1qwD7q5ifaN5HHfHzBNKGqvQzWCKqL3j9KYdPgr6vT4kBgc2rSbaDj2jCHeP3J5KdvQzW')
  .then(details => {
    if (details) {
      console.log('Transaction Details:');
      console.log(`Slot: ${details.slot}`);
      console.log(`Time: ${details.blockTime.toISOString()}`);
      console.log(`Success: ${details.success}`);
      console.log(`Fee: ${details.fee} lamports`);
      console.log(`Compute Units: ${details.computeUnitsConsumed}`);
      console.log(`Log Messages: ${details.logMessages.length}`);
    }
  })
  .catch(console.error);
```

### Account History Retrieval

Retrieving complete transaction history for an account:

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import axios from 'axios';

async function getAccountHistory(
  address: string,
  limit: number = 1000
): Promise<any[]> {
  const tapAgent = new VisaTAPAgent({
    registryUrl: 'http://localhost:8001',
    name: 'Account History Client',
    domain: 'history.example.com',
    algorithm: 'ed25519',
  });

  await tapAgent.register();

  const allSignatures: any[] = [];
  let before: string | undefined = undefined;

  while (allSignatures.length < limit) {
    const rpcRequest = {
      jsonrpc: '2.0' as const,
      id: allSignatures.length,
      method: 'getSignaturesForAddress',
      params: [
        address,
        {
          limit: Math.min(1000, limit - allSignatures.length),
          before,
        }
      ],
    };

    const headers = await tapAgent.signRequest('POST', '/', rpcRequest);

    const response = await axios.post('http://localhost:3002', rpcRequest, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 402) {
      // Handle payment
      console.log('Payment required for batch:', response.data.error.data);
      break;
    }

    if (response.status === 200) {
      const signatures = response.data.result;

      if (signatures.length === 0) {
        break;
      }

      allSignatures.push(...signatures);
      before = signatures[signatures.length - 1].signature;

      console.log(`Retrieved ${allSignatures.length} signatures so far...`);
    } else {
      console.error('Error:', response.data.error);
      break;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allSignatures;
}

// Usage: Get full history for Token Program
getAccountHistory('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 5000)
  .then(signatures => {
    console.log(`\nTotal signatures retrieved: ${signatures.length}`);

    // Analyze signature distribution by status
    const statusCounts = signatures.reduce((acc, sig) => {
      const status = sig.err ? 'failed' : 'success';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Status distribution:', statusCounts);

    // Find oldest and newest transactions
    if (signatures.length > 0) {
      const newest = signatures[0];
      const oldest = signatures[signatures.length - 1];

      console.log(`Newest: Slot ${newest.slot}, ${new Date(newest.blockTime * 1000).toISOString()}`);
      console.log(`Oldest: Slot ${oldest.slot}, ${new Date(oldest.blockTime * 1000).toISOString()}`);
    }
  })
  .catch(console.error);
```

## Integration with X402

The Triton integration is deeply integrated with the x402 Universal Payment Layer ecosystem:

### Payment Per RPC Call

Each RPC call incurs a cost based on:

1. **Method Base Cost**: Minimum cost for executing the method
2. **Data Volume**: Size of response (number of transactions, signatures, etc.)
3. **Data Age**: Historical data costs more (recent: 1x, historical: 2x, archive: 5x)

The formula:
```
Total Cost = (Base Cost + Volume Cost) × Age Multiplier
```

Example calculations:

**Recent Block (1000 transactions, <30 days):**
```
Cost = (0.0001 + 0.00001 × 1000) × 1.0 = 0.0101 CASH
```

**Historical Block (800 transactions, 60 days):**
```
Cost = (0.0001 + 0.00001 × 800) × 2.0 = 0.0162 CASH
```

**Archive Block (500 transactions, 200 days):**
```
Cost = (0.0001 + 0.00001 × 500) × 5.0 = 0.0255 CASH
```

### Quota Tracking

The proxy tracks various quotas and limits:

**Rate Limiting:**
- Default: 100 requests per minute per IP
- Configurable via `RATE_LIMIT_PER_MINUTE`
- Enforced by Fastify rate-limit plugin
- Returns HTTP 429 when exceeded

**Payment Verification:**
- Each payment signature can only be used once
- Tracked in Redis with 24-hour TTL
- Prevents double-spending attacks
- Automatic cleanup of expired entries

**TAP Nonce Tracking:**
- Each TAP nonce can only be used once
- Prevents replay attacks on authentication
- Stored in Redis with 24-hour TTL
- Enforced before cost calculation

### Service Registry Integration

The proxy automatically registers all available RPC methods in the x402 Service Registry:

```typescript
async registerServices(): Promise<void> {
  const tiers = this.pricing.getAllPricingTiers();

  for (const tier of tiers) {
    await this.registryClient.registerService({
      name: `Old Faithful ${tier.method}`,
      description: `Access historical Solana ${tier.method} data via Old Faithful`,
      category: 'historical-data',
      url: `http://${this.config.host}:${this.config.port}`,
      pricePerCall: tier.basePrice,
      ownerWalletAddress: this.config.paymentRecipient,
      acceptedTokens: ['CASH', 'USDC', 'SOL'],
      capabilities: ['historical-blocks', 'transaction-data', 'tap-auth'],
      metadata: {
        method: tier.method,
        volumeMultiplier: tier.volumeMultiplier,
        ageMultiplier: tier.ageMultiplier,
      },
    });
  }
}
```

**Registry Benefits:**
- Automatic service discovery by clients
- Price comparison across providers
- Reputation tracking
- Usage statistics
- Marketplace integration

### Revenue Distribution

All CASH payments are sent directly to the configured `PAYMENT_RECIPIENT` wallet:

```typescript
// In payment verification flow
const paymentRequirement = {
  amount: totalCost,
  recipient: this.config.paymentRecipient,
  currency: 'CASH',
  mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
  expiresAt: Date.now() + 300000, // 5 minutes
  requestId: randomBytes(16).toString('hex'),
};
```

The proxy owner can monitor revenue in real-time:

```bash
curl http://localhost:3002/metrics
```

Response:
```json
{
  "totalRequests": 5432,
  "paidRequests": 2456,
  "revenue": 234.56,
  "methodRevenue": {
    "getBlock": 123.45,
    "getTransaction": 67.89,
    "getSignaturesForAddress": 43.22
  }
}
```

### Multi-Token Support

While CASH is the primary payment token, the architecture supports multiple tokens:

```typescript
interface PaymentRequirement {
  amount: number;
  recipient: string;
  currency: 'CASH' | 'USDC' | 'SOL';
  mint?: string; // SPL token mint address
}
```

To add support for additional tokens, update the payment verifier:

```typescript
const TOKEN_MINTS = {
  CASH: new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  // Add more tokens here
};
```

## Troubleshooting

### Common RPC Issues

#### Error: TAP authentication failed

**Symptom:**
```json
{
  "error": {
    "code": -32001,
    "message": "TAP authentication failed",
    "data": "No signature header present"
  }
}
```

**Causes:**
- Missing `Signature` header in request
- Invalid signature format
- Expired signature (check `expires` parameter)
- Nonce reused (replay attack prevention)
- Unknown key ID (not registered in TAP Registry)

**Solutions:**
1. Ensure TAP agent is registered:
   ```typescript
   await tapAgent.register();
   ```

2. Sign each request:
   ```typescript
   const headers = await tapAgent.signRequest('POST', '/', rpcRequest);
   ```

3. Use fresh nonce for each request (handled automatically by TAP agent)

4. Check signature expiration:
   ```typescript
   // In TAP agent configuration
   const tapAgent = new VisaTAPAgent({
     // ...
     signatureExpiration: 300, // 5 minutes
   });
   ```

#### Error: Payment verification failed

**Symptom:**
```json
{
  "error": {
    "code": -32003,
    "message": "Payment verification failed"
  }
}
```

**Causes:**
- Transaction not confirmed on Solana blockchain
- Incorrect payment amount
- Wrong recipient address
- Wrong token mint
- Transaction signature already used
- Payment request expired (>5 minutes old)

**Solutions:**
1. Wait for transaction confirmation:
   ```typescript
   await connection.confirmTransaction(signature, 'confirmed');
   ```

2. Verify payment amount matches requirement:
   ```typescript
   const amount = Math.ceil(paymentData.amount * 1_000_000_000); // CASH has 9 decimals
   ```

3. Check recipient address matches:
   ```typescript
   console.log('Expected:', paymentData.recipient);
   console.log('Actual:', recipientTokenAccount.toBase58());
   ```

4. Verify CASH mint:
   ```typescript
   const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');
   ```

5. Don't reuse payment signatures

#### Error: Invalid or expired payment request

**Symptom:**
```json
{
  "error": {
    "code": -32002,
    "message": "Invalid or expired payment request"
  }
}
```

**Causes:**
- Payment request expired (>5 minutes since HTTP 402 response)
- Request ID not found in Redis
- Redis connection lost

**Solutions:**
1. Complete payment within 5 minutes of receiving HTTP 402

2. If expired, retry from beginning to get fresh payment requirement

3. Check Redis connectivity:
   ```bash
   redis-cli ping
   ```

4. Verify Redis URL in configuration:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

#### Error: Upstream RPC error

**Symptom:**
```json
{
  "error": {
    "code": -32000,
    "message": "Upstream RPC error",
    "data": "Connection timeout"
  }
}
```

**Causes:**
- Old Faithful RPC server unreachable
- Network timeout
- Invalid RPC method or parameters
- Old Faithful server overloaded

**Solutions:**
1. Verify Old Faithful URL:
   ```bash
   curl -X POST http://localhost:8899 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

2. Check network connectivity between proxy and Old Faithful

3. Increase timeout if needed:
   ```typescript
   const response = await axios.post(this.config.oldFaithfulUrl, rpcRequest, {
     timeout: 60000, // 60 seconds
   });
   ```

4. Monitor Old Faithful logs for errors

### Connection Issues

#### Redis connection failed

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**
1. Start Redis server:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. Verify Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. Check firewall rules allow connection to port 6379

4. If Redis is optional for your deployment, remove `REDIS_URL` from `.env`

#### Solana RPC connection failed

**Symptom:**
```
Error: Failed to verify payment: Network request failed
```

**Solutions:**
1. Test Solana RPC endpoint:
   ```bash
   curl https://api.devnet.solana.com -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

2. Use alternative RPC providers:
   ```env
   # Mainnet
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

   # Devnet
   SOLANA_RPC_URL=https://api.devnet.solana.com

   # Testnet
   SOLANA_RPC_URL=https://api.testnet.solana.com
   ```

3. Consider using paid RPC service for production (Helius, QuickNode, etc.)

### Rate Limiting

**Symptom:**
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded, retry in 1 minute"
}
```

**Solutions:**
1. Increase rate limit:
   ```env
   RATE_LIMIT_PER_MINUTE=200
   ```

2. Implement client-side rate limiting:
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between requests
   ```

3. Use multiple proxy instances behind load balancer

4. Implement exponential backoff:
   ```typescript
   async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 5) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.response?.status === 429 && i < maxRetries - 1) {
           await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
         } else {
           throw error;
         }
       }
     }
   }
   ```

### Debugging Tips

1. **Enable verbose logging:**
   ```typescript
   // In proxy configuration
   logger: {
     level: 'debug',
     transport: {
       target: 'pino-pretty',
       options: {
         colorize: true,
         translateTime: 'HH:MM:ss',
       },
     },
   }
   ```

2. **Check health endpoint:**
   ```bash
   curl http://localhost:3002/health
   ```

3. **Monitor metrics:**
   ```bash
   watch -n 1 'curl -s http://localhost:3002/metrics | jq .'
   ```

4. **Test TAP authentication separately:**
   ```bash
   # Get TAP identity
   curl http://localhost:8001/agents/key/your-key-id
   ```

5. **Verify CASH balance:**
   ```bash
   solana balance --token CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT YourWalletAddress
   ```

## Security

### RPC Security Best Practices

1. **Authentication Required:**
   - All requests must have valid TAP signatures
   - No anonymous access allowed
   - Signatures expire after configurable time (default: 5 minutes)

2. **Replay Attack Prevention:**
   - Nonces tracked in Redis
   - Each nonce can only be used once
   - Automatic cleanup after 24 hours

3. **Payment Security:**
   - On-chain verification only (no off-chain trust)
   - Payment signatures tracked to prevent reuse
   - Atomic verification (either payment valid or request rejected)

4. **Input Validation:**
   - JSON-RPC 2.0 compliance checking
   - Method whitelist (only registered methods allowed)
   - Parameter type validation

5. **Error Handling:**
   - No sensitive information in error messages
   - Stack traces only in development mode
   - Structured error codes for programmatic handling

### Rate Limiting

Multiple layers of rate limiting protect the service:

**Per-IP Rate Limiting:**
```typescript
this.server.register(rateLimit, {
  max: this.config.rateLimitPerMinute,
  timeWindow: '1 minute',
});
```

**Per-Identity Rate Limiting (future):**
```typescript
// Track requests per TAP identity
const identityRequestCount = await redis.incr(`rate:${identity.keyId}`);
if (identityRequestCount > IDENTITY_LIMIT) {
  throw new Error('Identity rate limit exceeded');
}
```

**Global Rate Limiting:**
- Protect against DDoS attacks
- Configurable maximum concurrent requests
- Circuit breaker pattern for upstream failures

### DDoS Protection

**Built-in Protection:**
1. Rate limiting (described above)
2. Request size limits (Fastify bodyLimit)
3. Timeout enforcement (30s default)
4. Connection limits

**Recommended Additional Layers:**

1. **Cloudflare Integration:**
   ```yaml
   # docker-compose.yml
   services:
     cloudflared:
       image: cloudflare/cloudflared:latest
       command: tunnel --no-autoupdate run
       environment:
         - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
   ```

2. **Nginx Reverse Proxy:**
   ```nginx
   upstream old_faithful_proxy {
       server localhost:3002;

       # Connection limits
       keepalive 32;
   }

   server {
       listen 80;

       # Rate limiting
       limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
       limit_req zone=api burst=20 nodelay;

       # Request size limit
       client_max_body_size 1M;

       location / {
           proxy_pass http://old_faithful_proxy;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

3. **Fail2Ban Integration:**
   ```ini
   # /etc/fail2ban/filter.d/old-faithful-proxy.conf
   [Definition]
   failregex = .*TAP authentication failed.*<HOST>
               .*Payment verification failed.*<HOST>
   ignoreregex =
   ```

### Payment Verification Security

**On-Chain Verification:**
```typescript
async verifyPayment(proof: PaymentProof, requirement: PaymentRequirement): Promise<boolean> {
  // 1. Check signature not already used
  if (await this.signatureStore.has(proof.signature)) {
    return false;
  }

  // 2. Verify request ID matches
  if (proof.requestId !== requirement.requestId) {
    return false;
  }

  // 3. Verify amount sufficient
  if (proof.amount < requirement.amount) {
    return false;
  }

  // 4. Check not expired
  if (Date.now() > requirement.expiresAt) {
    return false;
  }

  // 5. Fetch transaction from blockchain
  const transaction = await this.connection.getParsedTransaction(
    proof.signature,
    { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
  );

  // 6. Validate transaction details
  if (!transaction || transaction.meta.err) {
    return false;
  }

  // 7. Find token transfer instruction
  const validTransfer = this.validateTransaction(transaction, proof, requirement);

  // 8. Mark signature as used
  if (validTransfer) {
    await this.signatureStore.add(proof.signature, 86400);
  }

  return validTransfer;
}
```

**Security Guarantees:**
- No trusted third parties
- Cryptographic proof of payment
- Atomic verification
- Double-spend prevention
- Amount verification
- Recipient verification
- Token mint verification

### Access Control

**TAP Identity-Based Access:**
```typescript
// Future: Whitelist/blacklist by identity
const identity = await this.tapVerifier.verifySignature(...);

if (identity.domain === 'blocked.example.com') {
  return reply.code(403).send({
    error: { code: -32004, message: 'Access denied' }
  });
}
```

**Role-Based Access Control (future):**
```typescript
// Different pricing tiers based on identity reputation
if (identity.reputation > 0.9) {
  cost *= 0.8; // 20% discount for high-reputation clients
}
```

## Performance

### Caching Strategies

**Response Caching:**
```typescript
// Check cache before processing request
if (this.redis) {
  const cacheKey = `rpc:${rpcRequest.method}:${JSON.stringify(rpcRequest.params)}`;
  const cached = await this.redis.get(cacheKey);

  if (cached) {
    this.metrics.cacheHits++;
    return reply.send(JSON.parse(cached));
  }

  // ... process request ...

  // Cache successful responses
  if (response.result) {
    await this.redis.setex(
      cacheKey,
      this.config.cacheTTL / 1000,
      JSON.stringify(response)
    );
  }
}
```

**Cache Invalidation:**
- Time-based (TTL): Default 60 seconds
- Method-specific TTLs:
  - `getSlot`: 5 seconds (near real-time)
  - `getBlock`: 300 seconds (immutable)
  - `getTransaction`: 300 seconds (immutable)
  - `getGenesisHash`: 3600 seconds (constant)

**Cache Key Design:**
```typescript
// Include all parameters in cache key
const cacheKey = crypto
  .createHash('sha256')
  .update(`${rpcRequest.method}:${JSON.stringify(rpcRequest.params)}`)
  .digest('hex');
```

### gRPC Optimization

**Connection Pooling:**
```rust
// In Rust gRPC interceptor
use tonic::transport::Channel;

lazy_static! {
    static ref CHANNEL_POOL: ConnectionPool = ConnectionPool::new(10);
}

pub struct ConnectionPool {
    channels: Vec<Channel>,
}
```

**Streaming Backpressure:**
```rust
// Implement backpressure to prevent overwhelming clients
async fn stream_updates(
    &self,
    request: Request<SubscribeRequest>,
) -> Result<Response<Self::SubscribeStream>, Status> {
    let (tx, rx) = mpsc::channel(100); // Bounded channel

    tokio::spawn(async move {
        // If channel full, slow down upstream
        while tx.send(update).await.is_err() {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    });

    Ok(Response::new(rx))
}
```

**Compression:**
```rust
// Enable gRPC compression
use tonic::codec::CompressionEncoding;

Server::builder()
    .add_service(
        YellowstoneServer::new(service)
            .send_compressed(CompressionEncoding::Gzip)
            .accept_compressed(CompressionEncoding::Gzip)
    )
    .serve(addr)
    .await?;
```

### Performance Metrics

**Target Metrics:**
- Request latency p50: <100ms
- Request latency p99: <500ms
- Payment verification: <2s average
- Throughput: 1000 RPC req/s per instance
- Streaming: 10,000 concurrent subscriptions
- Uptime: 99.9% SLA

**Monitoring:**
```typescript
// Track request timing
const startTime = Date.now();

// ... process request ...

const duration = Date.now() - startTime;
this.metrics.avgRequestTime =
  (this.metrics.avgRequestTime * this.metrics.totalRequests + duration) /
  (this.metrics.totalRequests + 1);
```

**Prometheus Metrics (future):**
```typescript
import { register, Counter, Histogram } from 'prom-client';

const requestCounter = new Counter({
  name: 'old_faithful_proxy_requests_total',
  help: 'Total number of RPC requests',
  labelNames: ['method', 'status'],
});

const requestDuration = new Histogram({
  name: 'old_faithful_proxy_request_duration_seconds',
  help: 'RPC request duration in seconds',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
```

### Load Balancing

**Multiple Proxy Instances:**
```yaml
# docker-compose.yml
services:
  old-faithful-proxy-1:
    # ... configuration ...

  old-faithful-proxy-2:
    # ... configuration ...

  old-faithful-proxy-3:
    # ... configuration ...

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - old-faithful-proxy-1
      - old-faithful-proxy-2
      - old-faithful-proxy-3
```

**Nginx Configuration:**
```nginx
upstream proxy_pool {
    least_conn;  # Route to least busy instance

    server old-faithful-proxy-1:3002 max_fails=3 fail_timeout=30s;
    server old-faithful-proxy-2:3002 max_fails=3 fail_timeout=30s;
    server old-faithful-proxy-3:3002 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;

    location / {
        proxy_pass http://proxy_pool;

        # Health checks
        proxy_next_upstream error timeout http_502 http_503 http_504;

        # Connection pooling
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

### Resource Optimization

**Memory Management:**
```typescript
// Limit cache size
const MAX_CACHE_ENTRIES = 10000;

if (this.redis) {
  // Use Redis for unbounded cache
} else {
  // In-memory LRU cache with size limit
  const cache = new Map<string, any>();

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}
```

**Connection Pooling:**
```typescript
// Reuse Redis connections
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  connectionName: 'old-faithful-proxy',
});
```

**Graceful Degradation:**
```typescript
// Continue operating without Redis
if (!this.redis) {
  this.server.log.warn('Redis not available, operating without cache');
}

// Continue without x402 registry
try {
  await this.registerServices();
} catch (error) {
  this.server.log.warn('Failed to register services, continuing without registry');
}
```

---

## Additional Resources

- [Old Faithful Documentation](https://github.com/rpcpool/yellowstone-faithful)
- [x402 Universal Payment Layer](../index.md)
- [Visa TAP Specification](../components/tap-registry.md)
- [Solana JSON-RPC API](https://docs.solana.com/api/http)
- [CASH Token Information](https://solana.com/ecosystem/cash)

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- GitHub: https://github.com/x402-upl/x402-upl
- Issues: https://github.com/x402-upl/x402-upl/issues
- Discussions: https://github.com/x402-upl/x402-upl/discussions
