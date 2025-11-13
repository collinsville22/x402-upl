# Switchboard Oracle Integration

**Version:** 1.0.0
**Package:** `@x402-upl/switchboard`
**License:** MIT

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [API Reference](#api-reference)
8. [Examples](#examples)
9. [Integration with X402](#integration-with-x402)
10. [Troubleshooting](#troubleshooting)
11. [Security](#security)
12. [Performance](#performance)

---

## Overview

The Switchboard Oracle Integration provides a production-grade oracle data marketplace built on Switchboard's on-demand oracle protocol, enhanced with x402 micropayments and TAP authentication. This integration enables autonomous agents and applications to access high-quality, cryptographically-verified oracle data with pay-per-query pricing using CASH tokens.

### What is Switchboard?

Switchboard is a decentralized oracle network that provides reliable, tamper-proof data feeds for blockchain applications. The on-demand oracle protocol allows for:

- **Custom Oracle Jobs**: Define data sources and aggregation logic
- **Multi-Source Aggregation**: Combine data from multiple APIs with median/mean calculations
- **Cryptographic Verification**: All oracle data is signed by TEE-secured nodes
- **Low Latency**: 300-400ms average response time for oracle updates
- **Cost-Effective**: Pay only for the oracle updates you need

### Why x402 Integration?

The x402 integration layer adds:

- **Micropayments**: Pay per query using CASH tokens on Solana
- **TAP Authentication**: RFC 9421 HTTP message signatures for secure API access
- **Service Discovery**: Automatic registration in the x402 service registry
- **HTTP 402 Payment Gating**: Standards-compliant payment requirements
- **Reputation Tracking**: Service quality metrics and ratings

### Use Cases

- **Trading Bots**: Real-time price feeds for automated trading strategies
- **DeFi Protocols**: Price oracles for lending, derivatives, and DEX aggregators
- **Insurance Products**: Weather data, event outcomes, and risk parameters
- **Prediction Markets**: Sports scores, election results, and real-world events
- **NFT Platforms**: Dynamic NFT attributes based on external data
- **GameFi**: Real-world data integration for blockchain games

---

## Features

### Core Capabilities

#### Real Switchboard Integration
- Full integration with Switchboard's on-demand oracle network
- Support for Solana mainnet-beta and devnet
- Automatic lookup table (LUT) management
- Transaction optimization with compute unit pricing
- Cryptographic signature verification

#### TAP Authentication
- RFC 9421 HTTP message signature authentication
- Support for Ed25519 and RSA-PSS-SHA256 algorithms
- Nonce-based replay attack prevention
- Automatic agent identity verification via TAP registry
- Signature expiration handling
- Identity caching for performance

#### HTTP 402 Payment Gating
- Standards-compliant HTTP 402 "Payment Required" responses
- Pay-per-query pricing model
- Payment proof verification via Solana blockchain
- Request ID tracking to prevent double-spending
- Configurable payment expiration (default: 5 minutes)
- CASH token payment support

#### x402 Service Registry Integration
- Automatic feed registration as marketplace services
- Service discovery by category and capabilities
- Reputation and rating system
- Total calls and response time tracking
- Metadata-rich service listings

#### Pre-Defined Oracle Feeds

**BTC/USD** - Bitcoin Price Feed
- **Sources**: Binance, Coinbase, Kraken
- **Aggregation**: Median (3 sources)
- **Price**: 0.0001 CASH per update
- **Frequency**: High (real-time capable)
- **Signatures**: 5 oracle nodes
- **Staleness**: 25 seconds maximum

**ETH/USD** - Ethereum Price Feed
- **Sources**: Binance, Coinbase, Kraken
- **Aggregation**: Median (3 sources)
- **Price**: 0.0001 CASH per update
- **Frequency**: High (real-time capable)
- **Signatures**: 5 oracle nodes
- **Staleness**: 25 seconds maximum

**SOL/USD** - Solana Price Feed
- **Sources**: Binance, Coinbase, Kraken
- **Aggregation**: Median (3 sources)
- **Price**: 0.00005 CASH per update
- **Frequency**: High (real-time capable)
- **Signatures**: 3 oracle nodes
- **Staleness**: 25 seconds maximum

#### Custom Feed Creation

Create oracle feeds from any HTTP/JSON API:

- **Crypto Exchanges**: Binance, Coinbase, Kraken, Bitstamp, etc.
- **Stock Markets**: Alpha Vantage, Finnhub, IEX Cloud, Polygon.io
- **Weather APIs**: OpenWeather, WeatherAPI, NOAA
- **Sports Data**: ESPN, The Odds API, SportsRadar
- **IoT Sensors**: Any HTTP-accessible sensor data
- **Custom APIs**: Your own data sources

**Supported Aggregation Methods**:
- Median (recommended for price data)
- Mean (average across sources)
- Minimum
- Maximum

**Supported Transformations**:
- Multiply by scalar
- Divide by scalar
- Add constant
- Subtract constant
- Conditional logic
- Caching for multi-step jobs

#### Real-Time WebSocket Streaming

- Subscribe to continuous feed updates
- 5-second update intervals (configurable)
- Automatic reconnection handling
- Connection-level authentication
- Multiple concurrent subscriptions
- Low-overhead streaming protocol

#### Production-Ready Features

- **Rate Limiting**: 100 requests/minute per client (configurable)
- **CORS Support**: Configurable origin restrictions
- **Request Validation**: Zod schema validation for all inputs
- **Error Handling**: Comprehensive error messages and status codes
- **Logging**: Structured JSON logging with Pino
- **Metrics**: Built-in performance and revenue tracking
- **Health Checks**: `/health` endpoint for monitoring
- **Caching**: Redis integration for payment requests and nonces
- **Graceful Shutdown**: Proper cleanup of connections and resources

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Applications                        │
│         (dApps, Trading Bots, Analytics Platforms)          │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP + TAP Signatures
             ▼
┌─────────────────────────────────────────────────────────────┐
│         Switchboard x402 Marketplace Server                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TAP Authentication Middleware                        │   │
│  │  - RFC 9421 signature verification                    │   │
│  │  - Agent identity validation                          │   │
│  │  - Replay attack prevention                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HTTP 402 Payment Gateway                             │   │
│  │  - Oracle feed cost calculation                       │   │
│  │  - CASH payment requirements                          │   │
│  │  - Payment proof verification                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Oracle Data Marketplace                              │   │
│  │  - Pre-defined feeds (BTC, ETH, SOL, etc.)           │   │
│  │  - Custom feed creation                               │   │
│  │  - Multi-source aggregation                           │   │
│  │  - Real-time streaming (WebSocket)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  x402 Service Registry Integration                    │   │
│  │  - Auto-register feeds as services                    │   │
│  │  - Service discovery                                  │   │
│  │  - Reputation tracking                                │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │ Switchboard Protocol
             ▼
┌─────────────────────────────────────────────────────────────┐
│              Switchboard On-Demand Network                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Crossbar Gateway                                     │   │
│  │  - Job execution orchestration                        │   │
│  │  - Oracle node routing                                │   │
│  │  - Quote aggregation                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Oracle Nodes (TEE-secured)                           │   │
│  │  - HTTP data fetching                                 │   │
│  │  - JSON parsing                                       │   │
│  │  - Data aggregation (median/mean)                     │   │
│  │  - Cryptographic signing                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. SwitchboardOracleClient

The core client for interacting with the Switchboard on-demand oracle network.

**Responsibilities**:
- Oracle job creation and encoding
- Feed hash generation
- Feed simulation via Crossbar
- On-chain oracle updates with transaction submission
- Lookup table management
- Custom feed creation from user-defined specifications

**Key Methods**:
- `initialize()`: Load lookup tables
- `createFeedFromJob(job)`: Generate feed hash from oracle job definition
- `simulateFeed(feedHash)`: Simulate feed execution without on-chain cost
- `fetchFeedUpdate(request, payer)`: Execute on-chain oracle update
- `createCustomFeed(config)`: Build custom feed from data sources
- `batchSimulateFeeds(feedHashes)`: Simulate multiple feeds in parallel

#### 2. OracleDataMarketplace

High-level marketplace orchestration layer.

**Responsibilities**:
- Feed catalog management (pre-defined + custom)
- Payment requirement generation
- Payment verification coordination
- Subscription management
- x402 registry integration
- Batch operations

**Key Methods**:
- `initialize()`: Load pre-defined feeds and register in x402
- `createCustomFeed(request, owner)`: Create and register custom feeds
- `requestFeedUpdate(feedId, payer)`: Generate payment requirement
- `fulfillFeedUpdate(proof, payer)`: Verify payment and execute update
- `simulateFeed(feedId)`: Free simulation for testing
- `listFeeds(category?)`: Discover available feeds
- `discoverMarketplaceServices(category?, maxPrice?)`: x402 service discovery

#### 3. SwitchboardMarketplaceServer

Fastify-based HTTP server with TAP and payment middleware.

**Responsibilities**:
- HTTP API endpoint routing
- TAP signature verification on all requests
- HTTP 402 payment gating
- WebSocket subscription management
- Rate limiting and CORS
- Metrics collection
- Health monitoring

**Endpoints**:
- `GET /feeds` - List all available feeds
- `GET /feeds/:feedId` - Get specific feed details
- `POST /feeds/:feedId/simulate` - Free simulation
- `POST /feeds/:feedId/update` - Paid oracle update (402 gating)
- `POST /feeds/custom` - Create custom feed
- `POST /feeds/batch/simulate` - Batch simulation
- `GET /marketplace/services` - Discover x402 services
- `GET /health` - Health check
- `GET /metrics` - Server metrics
- `WS /ws/feed/:feedId` - Real-time updates

#### 4. PaymentVerifier

On-chain CASH token payment verification.

**Responsibilities**:
- Solana transaction verification
- SPL token transfer validation
- Signature replay prevention
- Amount and recipient verification
- Mint address validation
- Expiration enforcement

**Verification Steps**:
1. Check signature hasn't been used before (replay prevention)
2. Validate request ID matches payment requirement
3. Confirm payment amount meets or exceeds requirement
4. Check payment hasn't expired
5. Fetch and parse on-chain transaction
6. Verify transaction succeeded
7. Validate SPL token transfer to correct recipient
8. Confirm correct token mint (CASH)
9. Store signature to prevent reuse

#### 5. TAPVerifier

RFC 9421 HTTP message signature verification.

**Responsibilities**:
- Parse Signature header components
- Fetch agent identity from TAP registry
- Verify signature cryptographically
- Nonce tracking for replay prevention
- Signature expiration checking
- Identity caching for performance

**Verification Flow**:
1. Parse Signature header
2. Check signature hasn't expired
3. Check nonce hasn't been used (replay attack prevention)
4. Fetch agent public key from TAP registry
5. Build signature base from HTTP request
6. Verify cryptographic signature
7. Store nonce to prevent replay
8. Return verified identity

#### 6. X402RegistryClient

Integration client for the x402 service registry.

**Responsibilities**:
- Service registration
- Service discovery
- Service updates
- Rating submission
- Search functionality

**Key Features**:
- Automatic feed registration with metadata
- Category-based discovery
- Price filtering
- Capability matching
- Reputation-based sorting

### Data Flow

#### Feed Simulation (Free)

```
Client → [TAP Sign] → Server
Server → [Verify TAP] → TAP Registry
Server → [Simulate] → Crossbar Gateway
Crossbar → [Execute Job] → Oracle Nodes
Oracle Nodes → [Fetch APIs] → External APIs
Oracle Nodes → [Aggregate] → Crossbar
Crossbar → Server → Client
```

#### Paid Oracle Update

```
Client → [TAP Sign + Request Update] → Server
Server → [Verify TAP] → TAP Registry
Server → [Generate Payment Requirement] → Client (HTTP 402)

Client → [Create CASH Payment] → Solana Blockchain
Client → [TAP Sign + Payment Proof] → Server
Server → [Verify Payment] → Solana RPC
Server → [Fetch Oracle Update] → Switchboard
Switchboard → [Execute & Sign] → Oracle Nodes
Switchboard → [Submit Transaction] → Solana
Server → [Return Result + Tx Signature] → Client
```

#### Custom Feed Creation

```
Client → [TAP Sign + Feed Config] → Server
Server → [Verify TAP] → TAP Registry
Server → [Build Oracle Job] → Job Definition
Server → [Generate Feed Hash] → Feed ID
Server → [Register in Registry] → x402 Registry
Server → [Store in Catalog] → Internal DB
Server → [Return Feed Details] → Client
```

### Switchboard On-Demand Protocol

The integration uses Switchboard's on-demand oracle protocol, which differs from traditional push oracles:

**Traditional Push Oracles**:
- Oracle updates on fixed schedule
- Users pay for all updates, needed or not
- Higher latency for specific update needs

**Switchboard On-Demand**:
- Oracle updates on user request only
- Pay only for the updates you need
- Lower latency for specific needs
- Cryptographic verification of all data
- TEE (Trusted Execution Environment) security

**On-Demand Update Flow**:
1. Client requests oracle update
2. Marketplace generates quote fetch instruction
3. Switchboard gateway routes to oracle nodes
4. Oracle nodes fetch data from APIs in TEE
5. Oracle nodes aggregate and sign data
6. Quote is stored on-chain with signatures
7. Client can verify signatures cryptographically

### Multi-Source Aggregation

Oracle jobs can fetch data from multiple sources and aggregate:

```javascript
// Example: 3-source BTC price with median aggregation
{
  tasks: [
    // Source 1: Binance
    { httpTask: { url: 'https://api.binance.com/...' } },
    { jsonParseTask: { path: '$.price' } },
    { cacheTask: { variableName: 'BINANCE' } },

    // Source 2: Coinbase
    { httpTask: { url: 'https://api.coinbase.com/...' } },
    { jsonParseTask: { path: '$.data.amount' } },
    { cacheTask: { variableName: 'COINBASE' } },

    // Source 3: Kraken
    { httpTask: { url: 'https://api.kraken.com/...' } },
    { jsonParseTask: { path: '$.result.XXBTZUSD.c[0]' } },
    { cacheTask: { variableName: 'KRAKEN' } },

    // Aggregation
    {
      medianTask: {
        tasks: [
          { cacheTask: { variableName: 'BINANCE' } },
          { cacheTask: { variableName: 'COINBASE' } },
          { cacheTask: { variableName: 'KRAKEN' } }
        ]
      }
    }
  ]
}
```

---

## Installation

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: v9 or higher
- **Solana CLI**: Latest version (for production deployments)
- **Redis**: Optional, for production (signature storage and caching)

### Package Installation

```bash
# Clone the repository
git clone https://github.com/x402-upl/x402-upl.git
cd x402-upl

# Install dependencies
npm install

# Build the Switchboard integration
cd packages/integrations/switchboard
npm run build
```

### Dependencies

The integration requires the following key dependencies:

```json
{
  "@x402-upl/core": "workspace:*",
  "@switchboard-xyz/on-demand": "^1.2.21",
  "@switchboard-xyz/common": "^5.2.9",
  "@solana/web3.js": "^1.95.8",
  "@solana/spl-token": "^0.4.9",
  "fastify": "^5.2.0",
  "@fastify/cors": "^10.0.1",
  "@fastify/rate-limit": "^10.1.1",
  "@fastify/websocket": "^11.0.1",
  "ioredis": "^5.4.2",
  "pino": "^9.5.0",
  "zod": "^3.24.1",
  "axios": "^1.7.9"
}
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `packages/integrations/switchboard/` directory:

```bash
# Server Configuration
PORT=3003
HOST=0.0.0.0

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SWITCHBOARD_QUEUE_KEY=A43DyUGA7s8eXPxqEjJY5CfCZaKdYxCmCKe5wGMuYiCe
NETWORK=devnet

# Payment Configuration
PAYMENT_RECIPIENT=YourSolanaWalletAddress

# External Services
TAP_REGISTRY_URL=http://localhost:8001
X402_REGISTRY_URL=http://localhost:3001

# Optional: Redis for Production
REDIS_URL=redis://localhost:6379

# Optional: Marketplace URL
MARKETPLACE_URL=http://localhost:3003
```

#### Configuration Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `PORT` | No | HTTP server port | `3003` |
| `HOST` | No | HTTP server host | `0.0.0.0` |
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint | - |
| `SWITCHBOARD_QUEUE_KEY` | Yes | Switchboard oracle queue public key | - |
| `NETWORK` | No | Solana network (`mainnet-beta` or `devnet`) | `devnet` |
| `PAYMENT_RECIPIENT` | Yes | Solana wallet address for receiving payments | - |
| `TAP_REGISTRY_URL` | Yes | TAP registry service URL | - |
| `X402_REGISTRY_URL` | Yes | x402 service registry URL | - |
| `REDIS_URL` | No | Redis connection URL (recommended for production) | In-memory |
| `MARKETPLACE_URL` | No | Public marketplace URL | `http://localhost:3003` |

### Switchboard Configuration

#### Devnet Configuration

For testing and development:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SWITCHBOARD_QUEUE_KEY=A43DyUGA7s8eXPxqEjJY5CfCZaKdYxCmCKe5wGMuYiCe
NETWORK=devnet
```

#### Mainnet-Beta Configuration

For production deployments:

```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SWITCHBOARD_QUEUE_KEY=YOUR_MAINNET_QUEUE_KEY
NETWORK=mainnet-beta
```

**Note**: Obtain mainnet queue keys from [Switchboard Documentation](https://docs.switchboard.xyz/).

### Feed Configuration

#### Pre-Defined Feed Pricing

Modify pricing in `src/marketplace.ts`:

```typescript
const predefinedFeeds: OracleFeedConfig[] = [
  {
    feedId: '0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0',
    name: 'BTC/USD',
    pricePerUpdate: 0.0001, // CASH tokens
    currency: 'CASH',
    updateFrequency: 'high',
    minSignatures: 5,
    maxStaleness: 25, // seconds
    // ...
  },
];
```

#### Custom Feed Frequency Pricing

Configure pricing tiers for custom feeds:

```typescript
const frequencies = {
  realtime: 0.001,   // High-frequency updates
  high: 0.0005,      // ~1-5 second updates
  medium: 0.0002,    // ~10-30 second updates
  low: 0.0001,       // ~1-5 minute updates
};
```

### Rate Limiting Configuration

Adjust rate limits in server configuration:

```typescript
this.server.register(rateLimit, {
  max: 100,              // Max requests per time window
  timeWindow: '1 minute', // Time window
  redis: redisClient,    // Optional: Redis for distributed rate limiting
});
```

### CORS Configuration

Configure allowed origins:

```typescript
this.server.register(cors, {
  origin: true, // Allow all origins (development)
  // origin: ['https://yourdapp.com'], // Production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Signature', 'X-Payment-Proof'],
});
```

---

## Usage

### Starting the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm run start:server
```

### Client Integration

#### Step 1: Initialize TAP Agent

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';

const tapAgent = new VisaTAPAgent({
  registryUrl: 'http://localhost:8001',
  name: 'Oracle Consumer Bot',
  domain: 'consumer.x402.local',
  description: 'Autonomous trading bot consuming oracle data',
  algorithm: 'ed25519',
});

await tapAgent.register();
console.log(`Registered as: ${tapAgent.getTAPIdentity()?.keyId}`);
```

#### Step 2: List Available Feeds

```typescript
import axios from 'axios';

const headers = await tapAgent.signRequest('GET', '/feeds');

const response = await axios.get('http://localhost:3003/feeds', {
  headers,
});

console.log(`Available feeds: ${response.data.length}`);
for (const feed of response.data) {
  console.log(`${feed.name}: ${feed.pricePerUpdate} ${feed.currency}`);
}
```

#### Step 3: Simulate Feed (Free)

```typescript
const btcFeed = response.data.find(f => f.name === 'BTC/USD');

const simulateHeaders = await tapAgent.signRequest(
  'POST',
  `/feeds/${btcFeed.feedId}/simulate`
);

const result = await axios.post(
  `http://localhost:3003/feeds/${btcFeed.feedId}/simulate`,
  {},
  { headers: simulateHeaders }
);

console.log(`BTC Price: $${result.data.value}`);
console.log(`Timestamp: ${new Date(result.data.timestamp).toISOString()}`);
```

#### Step 4: Request Paid Update

```typescript
const updateHeaders = await tapAgent.signRequest(
  'POST',
  `/feeds/${btcFeed.feedId}/update`
);

const updateResponse = await axios.post(
  `http://localhost:3003/feeds/${btcFeed.feedId}/update`,
  {},
  {
    headers: updateHeaders,
    validateStatus: () => true, // Don't throw on 402
  }
);

if (updateResponse.status === 402) {
  const payment = updateResponse.data.payment;
  console.log('Payment Required:');
  console.log(`  Amount: ${payment.amount} ${payment.currency}`);
  console.log(`  Recipient: ${payment.recipient}`);
  console.log(`  Request ID: ${payment.requestId}`);
  console.log(`  Expires: ${new Date(payment.expiresAt).toISOString()}`);
}
```

#### Step 5: Execute Payment

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = Keypair.fromSecretKey(YOUR_SECRET_KEY);

const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');
const recipientPubkey = new PublicKey(payment.recipient);

// Get token accounts
const senderTokenAccount = await getAssociatedTokenAddress(
  CASH_MINT,
  wallet.publicKey
);
const recipientTokenAccount = await getAssociatedTokenAddress(
  CASH_MINT,
  recipientPubkey
);

// Create transfer instruction
const transferInstruction = createTransferCheckedInstruction(
  senderTokenAccount,
  CASH_MINT,
  recipientTokenAccount,
  wallet.publicKey,
  payment.amount * 1_000_000_000, // Convert to lamports
  9 // CASH decimals
);

// Send transaction
const transaction = new Transaction().add(transferInstruction);
const signature = await connection.sendTransaction(transaction, [wallet]);
await connection.confirmTransaction(signature, 'confirmed');

console.log(`Payment sent: ${signature}`);
```

#### Step 6: Retry Update with Payment Proof

```typescript
const paymentProof = {
  signature: signature,
  amount: payment.amount,
  sender: wallet.publicKey.toBase58(),
  recipient: payment.recipient,
  mint: payment.mint,
  timestamp: Date.now(),
  requestId: payment.requestId,
};

const retryHeaders = await tapAgent.signRequest(
  'POST',
  `/feeds/${btcFeed.feedId}/update`
);
retryHeaders['X-Payment-Proof'] = JSON.stringify(paymentProof);

const finalResponse = await axios.post(
  `http://localhost:3003/feeds/${btcFeed.feedId}/update`,
  {},
  { headers: retryHeaders }
);

console.log('Oracle Update Result:');
console.log(`  Price: $${finalResponse.data.value}`);
console.log(`  Signatures: ${finalResponse.data.signatures}`);
console.log(`  Cost: ${finalResponse.data.cost} SOL`);
console.log(`  Transaction: ${finalResponse.data.transactionSignature}`);
```

### Creating Custom Feeds

#### Example 1: Custom Crypto Price Feed

```typescript
const customFeed = {
  name: 'BTC/EUR Multi-Exchange',
  description: 'Bitcoin to Euro price from Kraken, Bitstamp, and Coinbase',
  dataSources: [
    {
      name: 'KRAKEN',
      url: 'https://api.kraken.com/0/public/Ticker?pair=XBTEUR',
      jsonPath: '$.result.XXBTZEUR.c[0]',
    },
    {
      name: 'BITSTAMP',
      url: 'https://www.bitstamp.net/api/v2/ticker/btceur/',
      jsonPath: '$.last',
    },
    {
      name: 'COINBASE',
      url: 'https://api.coinbase.com/v2/prices/BTC-EUR/spot',
      jsonPath: '$.data.amount',
    },
  ],
  aggregation: 'median',
  updateFrequency: 'high',
  pricePerUpdate: 0.0002,
};

const headers = await tapAgent.signRequest('POST', '/feeds/custom', customFeed);

const response = await axios.post(
  'http://localhost:3003/feeds/custom',
  customFeed,
  { headers }
);

console.log(`Created feed: ${response.data.feedId}`);
```

#### Example 2: Weather Data Feed

```typescript
const weatherFeed = {
  name: 'New York Temperature',
  description: 'Current temperature in New York from multiple weather APIs',
  dataSources: [
    {
      name: 'OPENWEATHER',
      url: 'https://api.openweathermap.org/data/2.5/weather?q=New%20York&units=metric&appid=YOUR_API_KEY',
      jsonPath: '$.main.temp',
    },
    {
      name: 'WEATHERAPI',
      url: 'https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=New%20York',
      jsonPath: '$.current.temp_c',
    },
  ],
  aggregation: 'mean',
  updateFrequency: 'medium',
  pricePerUpdate: 0.00005,
};
```

#### Example 3: Stock Price Feed

```typescript
const stockFeed = {
  name: 'AAPL Stock Price',
  description: 'Apple Inc. stock price from multiple sources',
  dataSources: [
    {
      name: 'ALPHAVANTAGE',
      url: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=YOUR_KEY',
      jsonPath: '$["Global Quote"]["05. price"]',
    },
    {
      name: 'FINNHUB',
      url: 'https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_TOKEN',
      jsonPath: '$.c',
    },
  ],
  aggregation: 'median',
  transformations: [
    { type: 'multiply', value: 100 }, // Convert to cents
  ],
  updateFrequency: 'realtime',
  pricePerUpdate: 0.0003,
};
```

### WebSocket Streaming

#### Connect to Real-Time Feed

```typescript
import WebSocket from 'ws';

const feedId = '0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0'; // BTC/USD
const ws = new WebSocket(`ws://localhost:3003/ws/feed/${feedId}`);

ws.on('open', () => {
  console.log('Connected to feed stream');
});

ws.on('message', (data) => {
  const update = JSON.parse(data.toString());

  if (update.type === 'update') {
    console.log(`Price: $${update.data.value}`);
    console.log(`Time: ${new Date(update.data.timestamp).toISOString()}`);
  } else if (update.type === 'error') {
    console.error(`Error: ${update.error}`);
  }
});

ws.on('close', () => {
  console.log('Disconnected from feed stream');
});

ws.on('error', (error) => {
  console.error(`WebSocket error: ${error.message}`);
});
```

#### Multiple Subscriptions

```typescript
const feeds = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
const subscriptions = [];

for (const feedName of feeds) {
  const feed = allFeeds.find(f => f.name === feedName);
  const ws = new WebSocket(`ws://localhost:3003/ws/feed/${feed.feedId}`);

  ws.on('message', (data) => {
    const update = JSON.parse(data.toString());
    console.log(`${feedName}: $${update.data.value}`);
  });

  subscriptions.push(ws);
}

// Clean up on exit
process.on('SIGINT', () => {
  subscriptions.forEach(ws => ws.close());
  process.exit(0);
});
```

### Batch Operations

#### Batch Simulate Multiple Feeds

```typescript
const feedIds = [
  '0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0', // BTC/USD
  '0x5b7f525d1d5e0c8fbd7f6c2f5d3c3d4b8e9fa1fb', // ETH/USD
  '0x6c8f636e2e6f1d9gce8g7d3g6e4d5e5c9fafb2gc', // SOL/USD
];

const headers = await tapAgent.signRequest(
  'POST',
  '/feeds/batch/simulate',
  { feedIds }
);

const response = await axios.post(
  'http://localhost:3003/feeds/batch/simulate',
  { feedIds },
  { headers }
);

for (const [feedId, result] of Object.entries(response.data)) {
  console.log(`Feed ${feedId}: $${result.value}`);
}
```

### Service Discovery

#### Discover Oracle Services in Marketplace

```typescript
const response = await axios.get(
  'http://localhost:3003/marketplace/services',
  {
    params: {
      category: 'crypto-price',
      maxPrice: 0.001,
    },
  }
);

console.log(`Found ${response.data.length} services:`);
for (const service of response.data) {
  console.log(`\n${service.name}`);
  console.log(`  Price: ${service.pricePerCall} per call`);
  console.log(`  Reputation: ${service.reputation}/10000`);
  console.log(`  Total Calls: ${service.totalCalls}`);
  console.log(`  Capabilities: ${service.capabilities.join(', ')}`);
}
```

---

## API Reference

### Server Endpoints

#### `GET /feeds`

List all available oracle feeds.

**Authentication**: TAP signature required

**Query Parameters**:
- `category` (optional): Filter by category (e.g., `crypto-price`, `custom`)

**Response**:
```json
[
  {
    "feedId": "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
    "feedHash": "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
    "name": "BTC/USD",
    "description": "Bitcoin to USD price from multiple sources",
    "category": "crypto-price",
    "pricePerUpdate": 0.0001,
    "currency": "CASH",
    "updateFrequency": "high",
    "minSignatures": 5,
    "maxStaleness": 25,
    "owner": "..."
  }
]
```

#### `GET /feeds/:feedId`

Get details for a specific feed.

**Authentication**: TAP signature required

**Path Parameters**:
- `feedId`: Oracle feed identifier

**Response**:
```json
{
  "feedId": "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
  "name": "BTC/USD",
  "description": "Bitcoin to USD price from multiple sources",
  "category": "crypto-price",
  "job": {
    "name": "BTC/USD Multi-Source",
    "tasks": [...]
  },
  "pricePerUpdate": 0.0001,
  "currency": "CASH",
  "updateFrequency": "high",
  "minSignatures": 5,
  "maxStaleness": 25
}
```

**Error Responses**:
- `404 Not Found`: Feed does not exist

#### `POST /feeds/:feedId/simulate`

Simulate oracle feed execution (free, no payment required).

**Authentication**: TAP signature required

**Path Parameters**:
- `feedId`: Oracle feed identifier

**Response**:
```json
{
  "feedId": "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
  "value": 45123.45,
  "timestamp": 1699564800000,
  "slot": 0,
  "signatures": 0,
  "cost": 0
}
```

**Error Responses**:
- `401 Unauthorized`: TAP authentication failed
- `404 Not Found`: Feed does not exist
- `500 Internal Server Error`: Simulation failed

#### `POST /feeds/:feedId/update`

Request paid oracle update with on-chain verification.

**Authentication**: TAP signature required

**Path Parameters**:
- `feedId`: Oracle feed identifier

**Headers**:
- `X-Payment-Proof` (optional): JSON-encoded payment proof for retry

**First Request (No Payment Proof) - Response `402 Payment Required`**:
```json
{
  "error": "Payment Required",
  "payment": {
    "amount": 0.0001,
    "currency": "CASH",
    "recipient": "SolanaWalletAddress...",
    "mint": "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT",
    "requestId": "abc123...",
    "expiresAt": 1699565100000
  }
}
```

**Retry with Payment Proof - Response `200 OK`**:
```json
{
  "feedId": "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
  "value": 45125.67,
  "timestamp": 1699564850000,
  "slot": 123456789,
  "signatures": 5,
  "cost": 0.000008,
  "transactionSignature": "5j7s8k9..."
}
```

**Payment Proof Format**:
```json
{
  "signature": "5j7s8k9...",
  "amount": 0.0001,
  "sender": "SenderWalletAddress...",
  "recipient": "RecipientWalletAddress...",
  "mint": "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT",
  "timestamp": 1699564820000,
  "requestId": "abc123..."
}
```

**Error Responses**:
- `401 Unauthorized`: TAP authentication failed
- `403 Forbidden`: Payment verification failed
- `404 Not Found`: Feed does not exist

#### `POST /feeds/custom`

Create a custom oracle feed from user-defined data sources.

**Authentication**: TAP signature required

**Request Body**:
```json
{
  "name": "Custom BTC/EUR Feed",
  "description": "Bitcoin to Euro price from multiple sources",
  "dataSources": [
    {
      "name": "KRAKEN",
      "url": "https://api.kraken.com/0/public/Ticker?pair=XBTEUR",
      "jsonPath": "$.result.XXBTZEUR.c[0]"
    },
    {
      "name": "BITSTAMP",
      "url": "https://www.bitstamp.net/api/v2/ticker/btceur/",
      "jsonPath": "$.last"
    }
  ],
  "aggregation": "median",
  "transformations": [
    {
      "type": "multiply",
      "value": 1.05
    }
  ],
  "updateFrequency": "high",
  "pricePerUpdate": 0.0002
}
```

**Response**:
```json
{
  "feedId": "0x7d9g747f3f7g2e0hdf9h8e4h7f5f6f6d0gbgc3hd",
  "feedHash": "0x7d9g747f3f7g2e0hdf9h8e4h7f5f6f6d0gbgc3hd",
  "name": "Custom BTC/EUR Feed",
  "description": "Bitcoin to Euro price from multiple sources",
  "category": "custom",
  "pricePerUpdate": 0.0002,
  "currency": "CASH",
  "updateFrequency": "high",
  "minSignatures": 3,
  "maxStaleness": 25
}
```

**Error Responses**:
- `401 Unauthorized`: TAP authentication failed
- `400 Bad Request`: Invalid feed configuration
- `500 Internal Server Error`: Feed creation failed

#### `POST /feeds/batch/simulate`

Simulate multiple feeds in parallel (free).

**Authentication**: TAP signature required

**Request Body**:
```json
{
  "feedIds": [
    "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
    "0x5b7f525d1d5e0c8fbd7f6c2f5d3c3d4b8e9fa1fb",
    "0x6c8f636e2e6f1d9gce8g7d3g6e4d5e5c9fafb2gc"
  ]
}
```

**Response**:
```json
{
  "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0": {
    "feedId": "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
    "value": 45123.45,
    "timestamp": 1699564800000
  },
  "0x5b7f525d1d5e0c8fbd7f6c2f5d3c3d4b8e9fa1fb": {
    "feedId": "0x5b7f525d1d5e0c8fbd7f6c2f5d3c3d4b8e9fa1fb",
    "value": 2345.67,
    "timestamp": 1699564801000
  }
}
```

#### `GET /marketplace/services`

Discover oracle services in the x402 marketplace.

**Authentication**: None required

**Query Parameters**:
- `category` (optional): Filter by category
- `maxPrice` (optional): Maximum price per call

**Response**:
```json
[
  {
    "id": "service-123",
    "name": "BTC/USD",
    "description": "Bitcoin to USD price from multiple sources",
    "category": "crypto-price",
    "feedIds": ["0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0"],
    "pricePerCall": 0.0001,
    "owner": "SolanaAddress...",
    "capabilities": ["oracle-data", "real-time", "switchboard"],
    "reputation": 9850,
    "totalCalls": 150000
  }
]
```

#### `GET /health`

Health check endpoint.

**Authentication**: None required

**Response**:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "metrics": {
    "totalFeeds": 10,
    "totalUpdates": 1523,
    "revenue": 0.1523,
    "averageLatency": 350,
    "successRate": 99.8,
    "cacheHitRate": 45.2,
    "activeSubscriptions": 12
  }
}
```

#### `GET /metrics`

Server performance metrics.

**Authentication**: None required

**Response**:
```json
{
  "totalFeeds": 10,
  "totalUpdates": 1523,
  "revenue": 0.1523,
  "averageLatency": 350,
  "successRate": 99.8,
  "cacheHitRate": 45.2,
  "activeSubscriptions": 12
}
```

#### `WS /ws/feed/:feedId`

WebSocket endpoint for real-time feed updates.

**Authentication**: None required (connection-level)

**Path Parameters**:
- `feedId`: Oracle feed identifier

**Messages**:

Update Message:
```json
{
  "type": "update",
  "data": {
    "feedId": "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0",
    "value": 45123.45,
    "timestamp": 1699564800000,
    "slot": 0,
    "signatures": 0,
    "cost": 0
  }
}
```

Error Message:
```json
{
  "type": "error",
  "error": "Feed simulation failed"
}
```

### Client Classes

#### SwitchboardOracleClient

Core client for Switchboard on-demand oracle operations.

**Constructor**:
```typescript
constructor(
  rpcUrl: string,
  queueKey: string,
  network: 'mainnet-beta' | 'devnet' = 'mainnet-beta'
)
```

**Methods**:

##### `initialize(): Promise<void>`

Initialize the client and load lookup tables.

```typescript
const client = new SwitchboardOracleClient(
  'https://api.devnet.solana.com',
  'A43DyUGA7s8eXPxqEjJY5CfCZaKdYxCmCKe5wGMuYiCe',
  'devnet'
);
await client.initialize();
```

##### `createFeedFromJob(job: OracleJobDefinition): Promise<string>`

Generate a feed hash from an oracle job definition.

```typescript
const job = {
  name: 'BTC/USD',
  tasks: [
    { httpTask: { url: 'https://api.binance.com/...' } },
    { jsonParseTask: { path: '$.price' } }
  ]
};
const feedHash = await client.createFeedFromJob(job);
// Returns: "0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0"
```

##### `simulateFeed(feedHash: string, variables?: Record<string, string>): Promise<FeedUpdateResult>`

Simulate feed execution without on-chain cost.

```typescript
const result = await client.simulateFeed('0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0');
console.log(`Price: $${result.value}`);
```

##### `fetchFeedUpdate(request: FeedUpdateRequest, payer: Keypair): Promise<FeedUpdateResult>`

Execute on-chain oracle update with transaction submission.

```typescript
const request = {
  feedId: '0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0',
  payer: wallet.publicKey.toBase58(),
  numSignatures: 5,
  maxStaleness: 25
};
const result = await client.fetchFeedUpdate(request, wallet);
console.log(`Transaction: ${result.transactionSignature}`);
```

##### `createCustomFeed(config: CustomFeedRequest): Promise<OracleFeedConfig>`

Build custom feed from user-defined data sources.

```typescript
const config = {
  name: 'BTC/EUR',
  description: 'Bitcoin to Euro price',
  dataSources: [...],
  aggregation: 'median',
  updateFrequency: 'high'
};
const feed = await client.createCustomFeed(config);
```

##### `batchSimulateFeeds(feedHashes: string[]): Promise<FeedUpdateResult[]>`

Simulate multiple feeds in parallel.

```typescript
const feedHashes = ['0x4a6f...', '0x5b7f...', '0x6c8f...'];
const results = await client.batchSimulateFeeds(feedHashes);
```

##### `getOraclePubkey(feedHash: string): PublicKey`

Get the canonical Solana public key for an oracle feed.

```typescript
const pubkey = client.getOraclePubkey('0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0');
```

#### OracleDataMarketplace

High-level marketplace orchestration.

**Constructor**:
```typescript
constructor(
  rpcUrl: string,
  queueKey: string,
  paymentRecipient: string,
  registryUrl: string,
  network: 'mainnet-beta' | 'devnet' = 'mainnet-beta',
  redisUrl?: string
)
```

**Methods**:

##### `initialize(): Promise<void>`

Initialize marketplace and load pre-defined feeds.

##### `createCustomFeed(request: CustomFeedRequest, owner: string): Promise<OracleFeedConfig>`

Create and register custom feed.

##### `requestFeedUpdate(feedId: string, payer: string): Promise<PaymentRequirement | FeedUpdateResult>`

Generate payment requirement for feed update.

##### `fulfillFeedUpdate(proof: PaymentProof, payer: Keypair): Promise<FeedUpdateResult>`

Verify payment and execute oracle update.

##### `simulateFeed(feedId: string): Promise<FeedUpdateResult>`

Free simulation for testing.

##### `listFeeds(category?: string): OracleFeedConfig[]`

List available feeds with optional category filter.

##### `getFeed(feedId: string): OracleFeedConfig | undefined`

Get specific feed configuration.

##### `discoverMarketplaceServices(category?: string, maxPrice?: number): Promise<MarketplaceService[]>`

Discover services in x402 registry.

##### `batchSimulateFeeds(feedIds: string[]): Promise<Map<string, FeedUpdateResult>>`

Batch simulation of multiple feeds.

#### PaymentVerifier

On-chain CASH payment verification.

**Constructor**:
```typescript
constructor(
  solanaRpcUrl: string,
  paymentRecipient: string,
  redisUrl?: string,
  signatureStore?: SignatureStore
)
```

**Methods**:

##### `verifyPayment(proof: PaymentProof, requirement: PaymentRequirement): Promise<boolean>`

Verify payment on-chain and check all requirements.

##### `isPaymentVerified(signature: string): Promise<boolean>`

Check if a signature has been verified before.

##### `disconnect(): Promise<void>`

Clean up connections.

#### TAPVerifier

RFC 9421 HTTP signature verification.

**Constructor**:
```typescript
constructor(
  registryUrl: string = 'http://localhost:8001',
  redisUrl?: string
)
```

**Methods**:

##### `verifySignature(method: string, path: string, headers: Record<string, string>, body?: string): Promise<{ valid: boolean; identity?: TAPIdentity; error?: string }>`

Verify TAP signature on HTTP request.

##### `clearCache(): Promise<void>`

Clear identity and nonce caches.

##### `disconnect(): Promise<void>`

Clean up connections.

#### X402RegistryClient

Integration with x402 service registry.

**Constructor**:
```typescript
constructor(registryUrl: string = 'http://localhost:3001')
```

**Methods**:

##### `registerService(service: X402ServiceRegistration): Promise<X402ServiceInfo>`

Register oracle feed as a service.

##### `discoverServices(query: X402DiscoveryQuery): Promise<X402ServiceInfo[]>`

Discover services with filters.

##### `getServiceById(serviceId: string): Promise<X402ServiceInfo | null>`

Get specific service details.

##### `getServicesByCategory(category: string): Promise<X402ServiceInfo[]>`

Find services in a category.

##### `searchServices(query: string): Promise<X402ServiceInfo[]>`

Full-text search for services.

##### `updateService(serviceId: string, updates: Partial<X402ServiceRegistration>): Promise<X402ServiceInfo | null>`

Update service configuration.

##### `rateService(serviceId: string, rating: number, agentAddress: string): Promise<void>`

Submit service rating.

##### `getCheapestService(category: string): Promise<X402ServiceInfo | null>`

Find cheapest service in category.

### Type Definitions

#### OracleFeedConfig

```typescript
interface OracleFeedConfig {
  feedId: string;
  feedHash: string;
  name: string;
  description: string;
  category: string;
  job: OracleJobDefinition;
  pricePerUpdate: number;
  currency: 'CASH' | 'USDC' | 'SOL';
  updateFrequency: 'realtime' | 'high' | 'medium' | 'low';
  minSignatures: number;
  maxStaleness: number;
  owner: string;
}
```

#### OracleJobDefinition

```typescript
interface OracleJobDefinition {
  name: string;
  tasks: OracleTask[];
  variables?: Record<string, string>;
}
```

#### OracleTask

```typescript
interface OracleTask {
  httpTask?: HttpTask;
  jsonParseTask?: JsonParseTask;
  medianTask?: MedianTask;
  multiplyTask?: MultiplyTask;
  divideTask?: DivideTask;
  cacheTask?: CacheTask;
  conditionalTask?: ConditionalTask;
}
```

#### FeedUpdateRequest

```typescript
interface FeedUpdateRequest {
  feedId: string;
  payer: string;
  numSignatures?: number;
  maxStaleness?: number;
}
```

#### FeedUpdateResult

```typescript
interface FeedUpdateResult {
  feedId: string;
  value: number;
  timestamp: number;
  slot: number;
  signatures: number;
  cost: number;
  transactionSignature?: string;
}
```

#### PaymentRequirement

```typescript
interface PaymentRequirement {
  amount: number;
  recipient: string;
  currency: 'CASH' | 'USDC' | 'SOL';
  mint?: string;
  expiresAt: number;
  requestId: string;
  feedId: string;
}
```

#### PaymentProof

```typescript
interface PaymentProof {
  signature: string;
  amount: number;
  sender: string;
  recipient: string;
  mint?: string;
  timestamp: number;
  requestId: string;
}
```

#### CustomFeedRequest

```typescript
interface CustomFeedRequest {
  name: string;
  description: string;
  dataSources: DataSource[];
  aggregation: 'median' | 'mean' | 'min' | 'max';
  transformations?: Transformation[];
  updateFrequency: 'realtime' | 'high' | 'medium' | 'low';
  pricePerUpdate?: number;
}
```

#### DataSource

```typescript
interface DataSource {
  name: string;
  url: string;
  jsonPath: string;
  headers?: Array<{ key: string; value: string }>;
  auth?: {
    type: 'bearer' | 'basic' | 'api-key';
    value: string;
  };
}
```

---

## Examples

### Example 1: Basic Price Feed Consumption

```typescript
import { OracleDataMarketplace } from '@x402-upl/switchboard';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Initialize marketplace
  const marketplace = new OracleDataMarketplace(
    process.env.SOLANA_RPC_URL!,
    process.env.SWITCHBOARD_QUEUE_KEY!,
    process.env.PAYMENT_RECIPIENT!,
    process.env.X402_REGISTRY_URL!,
    'devnet'
  );

  await marketplace.initialize();

  // List feeds
  const feeds = marketplace.listFeeds();
  console.log(`Available feeds: ${feeds.length}`);

  // Simulate BTC price
  const btcFeed = feeds.find(f => f.name === 'BTC/USD')!;
  const result = await marketplace.simulateFeed(btcFeed.feedId);

  console.log(`BTC Price: $${result.value.toLocaleString()}`);
  console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
}

main().catch(console.error);
```

### Example 2: Complete Paid Update Flow

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from '@solana/spl-token';
import axios from 'axios';

async function paidOracleUpdate() {
  // 1. Setup
  const tapAgent = new VisaTAPAgent({
    registryUrl: 'http://localhost:8001',
    name: 'Trading Bot',
    domain: 'bot.example.com',
    algorithm: 'ed25519',
  });
  await tapAgent.register();

  const wallet = Keypair.fromSecretKey(YOUR_SECRET_KEY);
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const marketplaceUrl = 'http://localhost:3003';

  // 2. Get feed list
  const feedsHeaders = await tapAgent.signRequest('GET', '/feeds');
  const feedsResponse = await axios.get(`${marketplaceUrl}/feeds`, {
    headers: feedsHeaders,
  });
  const btcFeed = feedsResponse.data.find((f: any) => f.name === 'BTC/USD');

  // 3. Request update (receive 402)
  const updateHeaders = await tapAgent.signRequest(
    'POST',
    `/feeds/${btcFeed.feedId}/update`
  );
  const updateResponse = await axios.post(
    `${marketplaceUrl}/feeds/${btcFeed.feedId}/update`,
    {},
    { headers: updateHeaders, validateStatus: () => true }
  );

  if (updateResponse.status !== 402) {
    throw new Error('Expected 402 Payment Required');
  }

  const payment = updateResponse.data.payment;
  console.log(`Payment required: ${payment.amount} ${payment.currency}`);

  // 4. Execute CASH payment
  const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');
  const recipientPubkey = new PublicKey(payment.recipient);

  const senderTokenAccount = await getAssociatedTokenAddress(
    CASH_MINT,
    wallet.publicKey
  );
  const recipientTokenAccount = await getAssociatedTokenAddress(
    CASH_MINT,
    recipientPubkey
  );

  const transferIx = createTransferCheckedInstruction(
    senderTokenAccount,
    CASH_MINT,
    recipientTokenAccount,
    wallet.publicKey,
    payment.amount * 1_000_000_000, // Convert to lamports
    9 // CASH decimals
  );

  const tx = new Transaction().add(transferIx);
  const signature = await connection.sendTransaction(tx, [wallet]);
  await connection.confirmTransaction(signature, 'confirmed');

  console.log(`Payment sent: ${signature}`);

  // 5. Retry with payment proof
  const paymentProof = {
    signature,
    amount: payment.amount,
    sender: wallet.publicKey.toBase58(),
    recipient: payment.recipient,
    mint: payment.mint,
    timestamp: Date.now(),
    requestId: payment.requestId,
  };

  const retryHeaders = await tapAgent.signRequest(
    'POST',
    `/feeds/${btcFeed.feedId}/update`
  );
  retryHeaders['X-Payment-Proof'] = JSON.stringify(paymentProof);

  const finalResponse = await axios.post(
    `${marketplaceUrl}/feeds/${btcFeed.feedId}/update`,
    {},
    { headers: retryHeaders }
  );

  console.log('\nOracle Update Result:');
  console.log(`  Price: $${finalResponse.data.value.toLocaleString()}`);
  console.log(`  Signatures: ${finalResponse.data.signatures}`);
  console.log(`  Cost: ${finalResponse.data.cost} SOL`);
  console.log(`  Transaction: ${finalResponse.data.transactionSignature}`);
}

paidOracleUpdate().catch(console.error);
```

### Example 3: Custom Weather Oracle

```typescript
import { OracleDataMarketplace } from '@x402-upl/switchboard';
import { CustomFeedRequest } from '@x402-upl/switchboard';

async function createWeatherOracle() {
  const marketplace = new OracleDataMarketplace(
    process.env.SOLANA_RPC_URL!,
    process.env.SWITCHBOARD_QUEUE_KEY!,
    process.env.PAYMENT_RECIPIENT!,
    process.env.X402_REGISTRY_URL!,
    'devnet'
  );

  await marketplace.initialize();

  const weatherFeed: CustomFeedRequest = {
    name: 'San Francisco Temperature',
    description: 'Current temperature in San Francisco from multiple weather APIs',
    dataSources: [
      {
        name: 'OPENWEATHER',
        url: `https://api.openweathermap.org/data/2.5/weather?q=San Francisco&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`,
        jsonPath: '$.main.temp',
      },
      {
        name: 'WEATHERAPI',
        url: `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_KEY}&q=San Francisco`,
        jsonPath: '$.current.temp_c',
      },
      {
        name: 'WEATHERSTACK',
        url: `http://api.weatherstack.com/current?access_key=${process.env.WEATHERSTACK_KEY}&query=San Francisco`,
        jsonPath: '$.current.temperature',
      },
    ],
    aggregation: 'mean', // Average across sources
    updateFrequency: 'medium', // ~10-30 second updates
    pricePerUpdate: 0.00005,
  };

  const feed = await marketplace.createCustomFeed(weatherFeed, 'weather-provider');

  console.log('Weather Oracle Created:');
  console.log(`  Feed ID: ${feed.feedId}`);
  console.log(`  Name: ${feed.name}`);
  console.log(`  Price: ${feed.pricePerUpdate} ${feed.currency}`);

  // Test the feed
  const result = await marketplace.simulateFeed(feed.feedId);
  console.log(`\nCurrent Temperature: ${result.value.toFixed(1)}°C`);
}

createWeatherOracle().catch(console.error);
```

### Example 4: Multi-Feed Trading Bot

```typescript
import { OracleDataMarketplace } from '@x402-upl/switchboard';
import WebSocket from 'ws';

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

class TradingBot {
  private marketplace: OracleDataMarketplace;
  private prices: Map<string, PriceUpdate> = new Map();
  private subscriptions: WebSocket[] = [];

  constructor(marketplace: OracleDataMarketplace) {
    this.marketplace = marketplace;
  }

  async start() {
    await this.marketplace.initialize();

    // Subscribe to multiple price feeds
    const feeds = this.marketplace.listFeeds('crypto-price');
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];

    for (const symbol of symbols) {
      const feed = feeds.find(f => f.name === symbol);
      if (!feed) continue;

      const ws = new WebSocket(`ws://localhost:3003/ws/feed/${feed.feedId}`);

      ws.on('message', (data) => {
        const update = JSON.parse(data.toString());
        if (update.type === 'update') {
          this.handlePriceUpdate(symbol, update.data);
        }
      });

      this.subscriptions.push(ws);
    }

    // Check for trading opportunities every second
    setInterval(() => this.checkTradingOpportunities(), 1000);
  }

  private handlePriceUpdate(symbol: string, data: any) {
    this.prices.set(symbol, {
      symbol,
      price: data.value,
      timestamp: data.timestamp,
    });

    console.log(`${symbol}: $${data.value.toLocaleString()}`);
  }

  private checkTradingOpportunities() {
    const btc = this.prices.get('BTC/USD');
    const eth = this.prices.get('ETH/USD');
    const sol = this.prices.get('SOL/USD');

    if (!btc || !eth || !sol) return;

    // Example: Simple ratio-based strategy
    const btcEthRatio = btc.price / eth.price;
    const expectedRatio = 18.5; // Example historical average

    if (Math.abs(btcEthRatio - expectedRatio) > 1.0) {
      console.log('\n🚨 Trading Opportunity Detected!');
      console.log(`BTC/ETH Ratio: ${btcEthRatio.toFixed(2)}`);
      console.log(`Expected: ${expectedRatio.toFixed(2)}`);
      console.log(`Deviation: ${((btcEthRatio - expectedRatio) / expectedRatio * 100).toFixed(2)}%`);
    }
  }

  async stop() {
    this.subscriptions.forEach(ws => ws.close());
  }
}

async function main() {
  const marketplace = new OracleDataMarketplace(
    process.env.SOLANA_RPC_URL!,
    process.env.SWITCHBOARD_QUEUE_KEY!,
    process.env.PAYMENT_RECIPIENT!,
    process.env.X402_REGISTRY_URL!,
    'devnet'
  );

  const bot = new TradingBot(marketplace);
  await bot.start();

  // Run for 5 minutes
  setTimeout(async () => {
    await bot.stop();
    process.exit(0);
  }, 300000);
}

main().catch(console.error);
```

### Example 5: Custom Sports Data Oracle

```typescript
import { CustomFeedRequest } from '@x402-upl/switchboard';

async function createSportsOracle() {
  const nbaGameScore: CustomFeedRequest = {
    name: 'Lakers vs Warriors - Live Score',
    description: 'Real-time score aggregation for Lakers vs Warriors game',
    dataSources: [
      {
        name: 'ESPN',
        url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
        jsonPath: '$.events[0].competitions[0].competitors[0].score',
      },
      {
        name: 'SPORTSRADAR',
        url: `https://api.sportradar.us/nba/trial/v7/en/games/${gameId}/summary.json?api_key=${API_KEY}`,
        jsonPath: '$.home.points',
      },
      {
        name: 'ODDS_API',
        url: `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${API_KEY}`,
        jsonPath: '$.data[0].scores[0].score',
      },
    ],
    aggregation: 'median',
    updateFrequency: 'realtime', // Updates every second during live game
    pricePerUpdate: 0.0001,
  };

  const marketplace = new OracleDataMarketplace(
    process.env.SOLANA_RPC_URL!,
    process.env.SWITCHBOARD_QUEUE_KEY!,
    process.env.PAYMENT_RECIPIENT!,
    process.env.X402_REGISTRY_URL!,
    'devnet'
  );

  await marketplace.initialize();
  const feed = await marketplace.createCustomFeed(nbaGameScore, 'sports-oracle');

  console.log('Sports Oracle Created:');
  console.log(`  Feed ID: ${feed.feedId}`);
  console.log(`  Game: ${feed.name}`);

  // Simulate current score
  const result = await marketplace.simulateFeed(feed.feedId);
  console.log(`\nCurrent Score: ${result.value}`);
}

createSportsOracle().catch(console.error);
```

---

## Integration with X402

The Switchboard Oracle integration is deeply integrated with the x402 protocol, providing seamless micropayments and service discovery.

### Payment Flow

#### 1. TAP Authentication

All requests must include RFC 9421 HTTP message signatures:

```typescript
// Client generates signature
const tapAgent = new VisaTAPAgent({
  registryUrl: 'http://localhost:8001',
  name: 'My Oracle Consumer',
  domain: 'consumer.example.com',
  algorithm: 'ed25519',
});
await tapAgent.register();

// Sign each request
const headers = await tapAgent.signRequest('POST', '/feeds/ABC123/update');
```

The server verifies:
1. Signature is cryptographically valid
2. Signing key is registered in TAP registry
3. Nonce hasn't been used before (replay prevention)
4. Signature hasn't expired

#### 2. HTTP 402 Payment Request

On the first update request, the server responds with HTTP 402:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "Payment Required",
  "payment": {
    "amount": 0.0001,
    "currency": "CASH",
    "recipient": "RecipientSolanaAddress",
    "mint": "CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT",
    "requestId": "unique-request-id",
    "expiresAt": 1699565100000
  }
}
```

#### 3. On-Chain Payment

Client executes SPL token transfer on Solana:

```typescript
const transferIx = createTransferCheckedInstruction(
  senderTokenAccount,
  CASH_MINT,
  recipientTokenAccount,
  wallet.publicKey,
  amount * 1_000_000_000, // Convert to lamports
  9 // Decimals
);

const tx = new Transaction().add(transferIx);
const signature = await connection.sendTransaction(tx, [wallet]);
await connection.confirmTransaction(signature);
```

#### 4. Payment Verification

Client retries request with payment proof:

```http
POST /feeds/ABC123/update
Signature: keyid="...", algorithm="ed25519", signature="..."
X-Payment-Proof: {"signature":"5j7s...","amount":0.0001,...}
```

Server verifies:
1. Payment transaction exists on-chain
2. Transaction succeeded (no errors)
3. Amount meets or exceeds requirement
4. Recipient matches expected address
5. Token mint is correct (CASH)
6. Request ID matches
7. Payment hasn't expired
8. Signature hasn't been used before

#### 5. Service Delivery

After successful verification, server executes oracle update and returns result.

### Service Registry Integration

Oracle feeds are automatically registered in the x402 service registry:

```typescript
// Automatic registration on marketplace initialization
await this.registryClient.registerService({
  name: 'BTC/USD',
  description: 'Bitcoin to USD price from multiple sources',
  category: 'crypto-price',
  url: `http://localhost:3003/feed/0x4a6f...`,
  pricePerCall: 0.0001,
  ownerWalletAddress: paymentRecipient,
  acceptedTokens: ['CASH'],
  capabilities: ['oracle-data', 'real-time', 'multi-source', 'switchboard'],
  metadata: {
    feedId: '0x4a6f...',
    feedHash: '0x4a6f...',
    updateFrequency: 'high',
    minSignatures: 5,
    maxStaleness: 25,
  },
});
```

### Service Discovery

Clients can discover oracle feeds through the registry:

```typescript
// Discovery by category
const services = await marketplace.discoverMarketplaceServices('crypto-price');

// Discovery with price filter
const affordableServices = await marketplace.discoverMarketplaceServices(
  'crypto-price',
  0.0002 // Max price
);

// Find cheapest service
const cheapest = await registryClient.getCheapestService('crypto-price');
```

### Reputation System

The x402 registry tracks service quality metrics:

- **Reputation Score**: 0-10000 based on user ratings and performance
- **Total Calls**: Number of successful oracle updates
- **Average Response Time**: Latency metrics
- **Success Rate**: Percentage of successful updates

Clients can rate services:

```typescript
await registryClient.rateService(
  serviceId,
  9500, // Rating out of 10000
  agentAddress
);
```

### CASH Token Economics

#### Token Information

- **Token Name**: CASH
- **Mint Address**: `CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT`
- **Decimals**: 9
- **Network**: Solana

#### Pricing Structure

| Feed Type | Base Price (CASH) | Frequency | Signatures |
|-----------|------------------|-----------|------------|
| BTC/USD | 0.0001 | High | 5 |
| ETH/USD | 0.0001 | High | 5 |
| SOL/USD | 0.00005 | High | 3 |
| Custom (Realtime) | 0.001 | Realtime | 3 |
| Custom (High) | 0.0005 | High | 3 |
| Custom (Medium) | 0.0002 | Medium | 3 |
| Custom (Low) | 0.0001 | Low | 3 |

#### Revenue Distribution

Oracle providers receive 100% of CASH payments:

```typescript
// Payment flows directly to provider wallet
PAYMENT_RECIPIENT=YourSolanaWalletAddress
```

In production, revenue can be split:
- Oracle operator: 70-80%
- x402 protocol: 10-15%
- Switchboard network: 10-15%

---

## Troubleshooting

### Common Issues

#### Issue 1: TAP Authentication Failed

**Symptom**: `401 Unauthorized: TAP authentication failed`

**Causes**:
- Agent not registered in TAP registry
- Invalid signature format
- Expired signature
- Nonce replay

**Solutions**:

```typescript
// Ensure agent is registered
const tapAgent = new VisaTAPAgent({ /* config */ });
await tapAgent.register();

// Verify identity
const identity = tapAgent.getTAPIdentity();
console.log('Key ID:', identity?.keyId);

// Check signature expiration
// Signatures expire after 5 minutes by default

// If nonce issues, clear cache
await tapVerifier.clearCache();
```

#### Issue 2: Payment Verification Failed

**Symptom**: `403 Forbidden: Payment verification failed`

**Causes**:
- Invalid transaction signature
- Insufficient payment amount
- Wrong recipient address
- Wrong token mint
- Payment expired
- Signature already used

**Solutions**:

```typescript
// Verify transaction on-chain
const tx = await connection.getParsedTransaction(signature);
console.log('Transaction:', tx);

// Check payment details
console.log('Amount sent:', amount);
console.log('Amount required:', requirement.amount);
console.log('Recipient:', recipientAddress);
console.log('Expected recipient:', requirement.recipient);

// Ensure correct token mint
const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');

// Check expiration
console.log('Payment expires:', new Date(requirement.expiresAt));
console.log('Current time:', new Date());
```

#### Issue 3: Feed Simulation Failed

**Symptom**: `500 Internal Server Error: Feed simulation failed`

**Causes**:
- Invalid feed hash
- Data source API down
- Invalid JSON path
- Network timeout

**Solutions**:

```typescript
// Verify feed exists
const feed = marketplace.getFeed(feedId);
if (!feed) {
  console.error('Feed not found:', feedId);
}

// Test data source directly
const response = await axios.get(dataSource.url);
console.log('API response:', response.data);

// Verify JSON path
const jsonPath = require('jsonpath');
const value = jsonPath.query(response.data, dataSource.jsonPath);
console.log('Extracted value:', value);

// Increase timeout
axios.defaults.timeout = 10000; // 10 seconds
```

#### Issue 4: On-Chain Update Failed

**Symptom**: Transaction fails or times out

**Causes**:
- Insufficient SOL for transaction fees
- Invalid Switchboard queue
- Network congestion
- RPC rate limiting

**Solutions**:

```typescript
// Check SOL balance
const balance = await connection.getBalance(wallet.publicKey);
console.log('SOL balance:', balance / 1e9);

// Use priority fees
const tx = await sb.asV0Tx({
  connection,
  ixs: [quoteFetchIx, quoteStoreIx],
  payer: wallet.publicKey,
  lookupTables: luts,
  computeUnitPrice: 50_000, // Increase for priority
  computeUnitLimitMultiple: 1.5,
});

// Use faster RPC endpoint
const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 }
);

// Retry on failure
let attempts = 0;
while (attempts < 3) {
  try {
    const signature = await connection.sendTransaction(tx, [wallet]);
    await connection.confirmTransaction(signature);
    break;
  } catch (error) {
    attempts++;
    if (attempts === 3) throw error;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

#### Issue 5: WebSocket Connection Issues

**Symptom**: WebSocket disconnects or doesn't receive updates

**Causes**:
- Network instability
- Server restart
- Feed not found
- No automatic reconnection

**Solutions**:

```typescript
// Implement reconnection logic
let ws: WebSocket;
let reconnectInterval: NodeJS.Timeout;

function connect() {
  ws = new WebSocket(`ws://localhost:3003/ws/feed/${feedId}`);

  ws.on('open', () => {
    console.log('Connected');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
    }
  });

  ws.on('close', () => {
    console.log('Disconnected, reconnecting...');
    reconnectInterval = setTimeout(connect, 5000);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    ws.close();
  });

  ws.on('message', (data) => {
    const update = JSON.parse(data.toString());
    handleUpdate(update);
  });
}

connect();
```

#### Issue 6: Rate Limit Exceeded

**Symptom**: `429 Too Many Requests`

**Causes**:
- Too many requests from same client
- Default limit: 100 requests/minute

**Solutions**:

```typescript
// Implement request throttling
class RateLimiter {
  private requests: number[] = [];
  private limit: number = 100;
  private window: number = 60000; // 1 minute

  async throttle(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);

    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.throttle();
    }

    this.requests.push(now);
  }
}

const limiter = new RateLimiter();

// Before each request
await limiter.throttle();
const response = await axios.post(/* ... */);
```

### Debugging Tips

#### Enable Debug Logging

```typescript
// Server-side (Pino)
const server = new SwitchboardMarketplaceServer({
  /* config */
});

// Set log level
process.env.LOG_LEVEL = 'debug';

// Client-side
axios.interceptors.request.use(request => {
  console.log('Request:', request.method, request.url);
  console.log('Headers:', request.headers);
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', response.status, response.data);
    return response;
  },
  error => {
    console.error('Error:', error.response?.status, error.response?.data);
    throw error;
  }
);
```

#### Test with Mock Data

```typescript
// Bypass payment for testing
if (process.env.NODE_ENV === 'development') {
  // Skip payment verification
  const result = await this.marketplace.simulateFeed(feedId);
  return result;
}
```

#### Check Service Health

```typescript
// Health check
const health = await axios.get('http://localhost:3003/health');
console.log('Server status:', health.data.status);
console.log('Metrics:', health.data.metrics);

// Check dependencies
console.log('TAP Registry:', process.env.TAP_REGISTRY_URL);
console.log('x402 Registry:', process.env.X402_REGISTRY_URL);
console.log('Solana RPC:', process.env.SOLANA_RPC_URL);
```

### Getting Help

- **GitHub Issues**: https://github.com/x402-upl/x402-upl/issues
- **Switchboard Discord**: https://discord.gg/switchboard
- **x402 Documentation**: https://docs.x402.com
- **Solana Discord**: https://discord.gg/solana

---

## Security

### Oracle Security

#### Data Integrity

**Cryptographic Verification**:
- All oracle data is signed by TEE-secured nodes
- Signatures can be verified on-chain
- Multi-signature aggregation (3-5 nodes)

**Multi-Source Aggregation**:
- Prevents single point of failure
- Median/mean aggregation resists outliers
- Configurable data source redundancy

**Replay Prevention**:
- Transaction signatures tracked in Redis/memory
- Prevents double-spending of oracle updates
- Automatic expiration after 24 hours

#### Access Control

**TAP Authentication**:
- RFC 9421 HTTP message signatures
- Nonce-based replay attack prevention
- Public key verification via TAP registry
- Signature expiration (default: 5 minutes)

**Payment Verification**:
- On-chain transaction verification
- Amount validation
- Recipient validation
- Token mint validation
- Request ID matching

### Payment Security

#### On-Chain Verification

All payments are verified on the Solana blockchain:

```typescript
// Verification steps
1. Fetch transaction from blockchain
2. Verify transaction succeeded (no errors)
3. Parse SPL token transfer instruction
4. Validate recipient address
5. Validate token mint (CASH)
6. Validate amount >= requirement
7. Check signature not used before
8. Store signature to prevent replay
```

#### Signature Storage

Prevent double-spending with signature tracking:

```typescript
// Redis (production)
await signatureStore.add(signature, 86400); // 24 hour TTL

// In-memory (development)
const used = new Set<string>();
used.add(signature);
```

#### Payment Expiration

Payment requirements expire after 5 minutes:

```typescript
const requirement = {
  expiresAt: Date.now() + 300000, // 5 minutes
  // ...
};

// Verification checks expiration
if (Date.now() > requirement.expiresAt) {
  throw new Error('Payment expired');
}
```

### API Security

#### Rate Limiting

Protect against abuse:

```typescript
// 100 requests per minute per IP
this.server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis: redisClient, // Distributed rate limiting
});
```

#### Input Validation

All inputs validated with Zod schemas:

```typescript
const CustomFeedSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  dataSources: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    jsonPath: z.string(),
  })).min(1).max(10),
  aggregation: z.enum(['median', 'mean', 'min', 'max']),
  updateFrequency: z.enum(['realtime', 'high', 'medium', 'low']),
});
```

#### CORS

Configurable origin restrictions:

```typescript
// Development: Allow all
origin: true

// Production: Whitelist domains
origin: ['https://yourdapp.com', 'https://dashboard.x402.com']
```

### Private Key Management

**Never expose private keys**:

```typescript
// ❌ BAD: Hardcoded keys
const wallet = Keypair.fromSecretKey([1, 2, 3, ...]);

// ✅ GOOD: Environment variables
const secretKey = process.env.WALLET_SECRET_KEY;
const wallet = Keypair.fromSecretKey(bs58.decode(secretKey));

// ✅ BETTER: Hardware wallet or KMS
import { Wallet } from '@project-serum/anchor';
const wallet = new Wallet(hardwareWallet);
```

### Production Recommendations

1. **Use Redis for State**:
   - Signature storage
   - Nonce tracking
   - Payment requests
   - Rate limiting

2. **Enable HTTPS**:
   - Use TLS certificates
   - Redirect HTTP to HTTPS
   - Enable HSTS headers

3. **Implement Monitoring**:
   - Failed authentication attempts
   - Payment verification failures
   - Oracle update failures
   - Rate limit violations

4. **Regular Updates**:
   - Keep dependencies updated
   - Monitor security advisories
   - Audit smart contracts
   - Review access logs

5. **Secure Infrastructure**:
   - Firewall configuration
   - Network segmentation
   - DDoS protection
   - Backup strategy

---

## Performance

### Latency Metrics

#### Feed Simulation (Free)

- **Average**: 200-300ms
- **p95**: 400ms
- **p99**: 600ms

Breakdown:
- TAP verification: 50-100ms
- Crossbar simulation: 150-250ms
- Response serialization: <10ms

#### Paid Oracle Update

- **Average**: 2000-3000ms
- **p95**: 4000ms
- **p99**: 6000ms

Breakdown:
- TAP verification: 50-100ms
- Payment verification: 500-1000ms
- Oracle update: 1500-2500ms
- Response serialization: <10ms

#### WebSocket Updates

- **Interval**: 5 seconds (configurable)
- **Latency**: <50ms per update
- **Max Subscriptions**: 100+ per server

### Throughput

#### Server Capacity

- **Simulations**: 100+ requests/second
- **Paid Updates**: 10-20 requests/second (limited by Solana)
- **WebSocket Connections**: 1000+ concurrent

#### Bottlenecks

1. **Solana RPC**: Transaction submission and confirmation
2. **Payment Verification**: On-chain transaction lookup
3. **TAP Registry**: Agent identity lookups (mitigated by caching)
4. **Data Source APIs**: External API rate limits

### Optimization Strategies

#### 1. Caching

```typescript
// Identity caching (1 hour)
const identityCache = new Map<string, TAPIdentity>();

// Price caching (for simulations)
const priceCache = new Map<string, CachedPrice>();
priceCache.set(feedId, {
  data: result,
  timestamp: Date.now(),
  ttl: 60000, // 1 minute
});
```

#### 2. Connection Pooling

```typescript
// Redis connection pool
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

// Solana connection with commitment
const connection = new Connection(
  rpcUrl,
  {
    commitment: 'confirmed',
    disableRetryOnRateLimit: false,
  }
);
```

#### 3. Batch Operations

```typescript
// Batch simulations
const results = await marketplace.batchSimulateFeeds([
  feedId1,
  feedId2,
  feedId3,
]);

// Parallel processing
await Promise.all(
  feedIds.map(id => marketplace.simulateFeed(id))
);
```

#### 4. Rate Limiting

Protect server resources:

```typescript
// Limit concurrent oracle updates
const updateQueue = new PQueue({ concurrency: 10 });

await updateQueue.add(async () => {
  return await marketplace.fulfillFeedUpdate(proof, payer);
});
```

#### 5. WebSocket Optimization

```typescript
// Shared simulations across subscribers
const subscribers = new Map<string, Set<WebSocket>>();

// Single simulation for multiple subscribers
setInterval(async () => {
  for (const [feedId, sockets] of subscribers.entries()) {
    const result = await marketplace.simulateFeed(feedId);
    const message = JSON.stringify({ type: 'update', data: result });

    sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}, 5000);
```

### Monitoring

#### Metrics Collection

```typescript
interface OracleMetrics {
  totalFeeds: number;
  totalUpdates: number;
  revenue: number;
  averageLatency: number;
  successRate: number;
  cacheHitRate: number;
  activeSubscriptions: number;
}
```

#### Prometheus Integration

```typescript
import { Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();

const requestCounter = new Counter({
  name: 'oracle_requests_total',
  help: 'Total number of oracle requests',
  labelNames: ['feedId', 'status'],
  registers: [register],
});

const latencyHistogram = new Histogram({
  name: 'oracle_latency_seconds',
  help: 'Oracle request latency',
  labelNames: ['feedId'],
  registers: [register],
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Scalability

#### Horizontal Scaling

Deploy multiple server instances:

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: switchboard-marketplace
spec:
  replicas: 3
  selector:
    matchLabels:
      app: switchboard-marketplace
  template:
    spec:
      containers:
      - name: marketplace
        image: x402-upl/switchboard-marketplace:latest
        env:
        - name: REDIS_URL
          value: "redis://redis-cluster:6379"
```

#### Load Balancing

```nginx
upstream switchboard_marketplace {
  least_conn;
  server marketplace-1:3003;
  server marketplace-2:3003;
  server marketplace-3:3003;
}

server {
  listen 80;
  location / {
    proxy_pass http://switchboard_marketplace;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## Conclusion

The Switchboard Oracle Integration provides a production-ready solution for consuming oracle data with x402 micropayments. Key highlights:

- **Real Switchboard Integration**: Actual on-demand oracle protocol with cryptographic verification
- **TAP Authentication**: RFC 9421 signatures for all API requests
- **HTTP 402 Payment Gating**: Standards-compliant micropayments with CASH tokens
- **Custom Feed Creation**: Define oracle jobs from any HTTP/JSON API
- **Real-Time Streaming**: WebSocket support for continuous updates
- **x402 Registry**: Automatic service discovery and reputation tracking
- **Production Ready**: Rate limiting, caching, monitoring, and error handling

For additional support and examples, visit:
- **GitHub**: https://github.com/x402-upl/x402-upl
- **Documentation**: https://docs.x402.com
- **Switchboard**: https://docs.switchboard.xyz/

---

**Last Updated**: 2024-11-12
**Version**: 1.0.0
**Maintainers**: x402-upl Team
