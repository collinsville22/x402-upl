# Switchboard x402 Marketplace Architecture

## Executive Summary

Production-grade oracle data marketplace built on Switchboard's on-demand protocol, enabling monetization of real-time data feeds through HTTP 402 micropayments, TAP authentication, and CASH tokens.

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Layer                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TAP-Enabled Agents                                       │   │
│  │  - Autonomous agents with Visa TAP                        │   │
│  │  - HTTP signature generation (RFC 9421)                   │   │
│  │  - CASH wallet integration                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  dApp Integrations                                        │   │
│  │  - DeFi protocols (lending, perps, options)              │   │
│  │  - Trading bots                                           │   │
│  │  - Analytics platforms                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTPS + TAP Signatures
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Switchboard x402 Marketplace Server                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Authentication & Authorization Layer                     │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  TAP Verifier                                       │  │   │
│  │  │  - Parse RFC 9421 signatures                        │  │   │
│  │  │  - Verify Ed25519/RSA signatures                    │  │   │
│  │  │  - Query TAP Registry for identities                │  │   │
│  │  │  - Nonce-based replay prevention                    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Payment Gateway Layer                                    │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  HTTP 402 Handler                                   │  │   │
│  │  │  - Cost calculation per feed                        │  │   │
│  │  │  - Payment requirement generation                   │  │   │
│  │  │  - Request ID tracking                              │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Payment Verifier                                   │  │   │
│  │  │  - On-chain transaction verification                │  │   │
│  │  │  - CASH token transfer validation                   │  │   │
│  │  │  - Amount and recipient checks                      │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Oracle Marketplace Core                                  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Feed Registry                                      │  │   │
│  │  │  - Pre-defined feeds (BTC, ETH, SOL)               │  │   │
│  │  │  - Custom feed storage                              │  │   │
│  │  │  - Feed metadata management                         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Switchboard Client                                 │  │   │
│  │  │  - Feed hash generation                             │  │   │
│  │  │  - Oracle job builder                               │  │   │
│  │  │  - Crossbar API integration                         │  │   │
│  │  │  - On-chain update execution                        │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Subscription Manager                               │  │   │
│  │  │  - Subscription tracking                            │  │   │
│  │  │  - Quota management                                 │  │   │
│  │  │  - Automated renewals                               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  x402 Integration Layer                                   │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Registry Client                                    │  │   │
│  │  │  - Service registration                             │  │   │
│  │  │  - Service discovery                                │  │   │
│  │  │  - Reputation tracking                              │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API & Communication Layer                                │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  REST API (Fastify)                                 │  │   │
│  │  │  - Feed management endpoints                        │  │   │
│  │  │  - Payment endpoints                                │  │   │
│  │  │  - Custom feed creation                             │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  WebSocket Server                                   │  │   │
│  │  │  - Real-time feed streaming                         │  │   │
│  │  │  - 5-second update intervals                        │  │   │
│  │  │  - Connection management                            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────┘
             │ Switchboard Protocol
             ▼
┌─────────────────────────────────────────────────────────────────┐
│           Switchboard On-Demand Oracle Network                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Crossbar Gateway                                         │   │
│  │  - Job execution coordination                             │   │
│  │  - Oracle node selection                                  │   │
│  │  - Response aggregation                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Oracle Queue (Solana Program)                            │   │
│  │  - TEE node registry                                      │   │
│  │  - Attestation verification                               │   │
│  │  - Reward distribution                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Oracle Nodes (TEE-Secured)                               │   │
│  │  - HTTP data fetching                                     │   │
│  │  - JSON parsing & transformation                          │   │
│  │  - Median/mean aggregation                                │   │
│  │  - Cryptographic signing                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Switchboard Oracle Client

**Responsibilities:**
- Oracle job definition and serialization
- Feed hash generation from job protobuf
- Crossbar API integration for simulations
- On-chain feed update execution
- Address Lookup Table (LUT) management

**Key Operations:**
```typescript
// Create feed from job definition
const feedHash = await client.createFeedFromJob(jobDefinition);

// Simulate feed (free, off-chain)
const result = await client.simulateFeed(feedHash);

// Execute on-chain update (paid)
const update = await client.fetchFeedUpdate(request, payer);
```

### 2. Oracle Data Marketplace

**Responsibilities:**
- Feed registry management
- Custom feed creation
- Payment flow orchestration
- Subscription management
- Service registration with x402 Registry

**Feed Lifecycle:**
```
1. Feed Definition (JSON job)
   ↓
2. Job Serialization (Protobuf)
   ↓
3. Feed Hash Generation (SHA-256)
   ↓
4. Registry Storage
   ↓
5. x402 Service Registration
   ↓
6. Ready for Consumption
```

### 3. Payment Gateway

**HTTP 402 Flow:**
```
1. Client requests feed update (with TAP signature)
   ↓
2. TAP verification succeeds
   ↓
3. No payment proof → return 402 Payment Required
   {
     amount: 0.0001,
     currency: "CASH",
     recipient: "...",
     requestId: "...",
     expiresAt: timestamp + 5min
   }
   ↓
4. Client executes CASH transfer on-chain
   ↓
5. Client retries with X-Payment-Proof header
   ↓
6. Payment verification (on-chain lookup)
   ↓
7. Oracle update execution
   ↓
8. Return result + transaction signature
```

### 4. TAP Authentication

**Signature Verification Flow:**
```
1. Extract Signature header from request
   ↓
2. Parse signature components:
   - keyid: Agent's TAP key ID
   - algorithm: ed25519 or rsa-pss-sha256
   - signature: Base64-encoded signature
   - headers: List of signed headers
   - created: Unix timestamp
   - nonce: Replay prevention token
   ↓
3. Query TAP Registry for public key
   ↓
4. Build signature base string (RFC 9421)
   ↓
5. Verify signature cryptographically
   ↓
6. Check nonce for replay attacks
   ↓
7. Grant/deny access
```

## Data Flow

### Scenario 1: Free Simulation

```
Client → TAP Agent (sign request)
      → Marketplace Server
      → TAP Verifier (verify signature)
      → Switchboard Client (simulate via Crossbar)
      → Crossbar Gateway
      → Oracle Nodes (execute job off-chain)
      → Aggregated result
      → Client receives price (200 OK)
```

**Latency:** ~300-500ms
**Cost:** Free (no blockchain transactions)

### Scenario 2: Paid On-Chain Update

```
Client → TAP Agent (sign request)
      → Marketplace Server
      → TAP Verifier (verify)
      → No payment proof → 402 Payment Required

Client → Executes CASH transfer on Solana
      → Confirms transaction
      → Retries request with proof

Server → Payment Verifier (on-chain lookup)
      → Validates transfer
      → Switchboard Client (build update tx)
      → Solana RPC (send transaction)
      → Wait for confirmation
      → Client receives price + tx signature (200 OK)
```

**Latency:** ~2-5 seconds (includes on-chain time)
**Cost:** Payment amount + Solana gas (~0.000005 SOL)

### Scenario 3: WebSocket Streaming

```
Client → Opens WebSocket connection
      → /ws/feed/{feedId}

Server → Authenticates connection
      → Starts 5-second update loop

Every 5 seconds:
  Server → Simulate feed via Crossbar
        → Push update to client
        {
          type: "update",
          data: {
            feedId: "...",
            value: 42000.50,
            timestamp: 1234567890
          }
        }

Client disconnects:
  Server → Cleanup interval
        → Decrement active subscriptions
```

## Security Architecture

### 1. Authentication

**TAP Signature Verification:**
- RFC 9421 HTTP message signatures
- Ed25519 and RSA-PSS-SHA256 support
- Nonce-based replay attack prevention
- Identity verification via TAP Registry
- Signature expiration checking

### 2. Payment Verification

**On-Chain Validation:**
- SPL Token transfer lookup
- Amount validation
- Recipient verification
- Mint address checking (CASH token)
- Double-spend prevention (signature tracking)

### 3. Rate Limiting

**Fastify Rate Limit:**
- 100 requests/minute per IP
- Configurable time windows
- DDoS protection
- Per-endpoint limits

### 4. Input Validation

**Zod Schema Validation:**
- Request body validation
- Query parameter validation
- Type safety enforcement
- Malformed data rejection

## Oracle Job Builder

### Task Types

**1. HTTP Task**
```typescript
{
  httpTask: {
    url: "https://api.example.com/data",
    method: "GET",
    headers: [
      { key: "Authorization", value: "Bearer ${API_KEY}" }
    ]
  }
}
```

**2. JSON Parse Task**
```typescript
{
  jsonParseTask: {
    path: "$.data.price"  // JSONPath expression
  }
}
```

**3. Median Task**
```typescript
{
  medianTask: {
    tasks: [
      { /* source 1 */ },
      { /* source 2 */ },
      { /* source 3 */ }
    ]
  }
}
```

**4. Math Tasks**
```typescript
{ multiplyTask: { scalar: 1.18 } }  // EUR conversion
{ divideTask: { scalar: 100 } }     // Basis points
```

**5. Cache Task**
```typescript
{
  cacheTask: {
    variableName: "BINANCE_PRICE"
  }
}
```

### Example: Multi-Source BTC/USD

```typescript
{
  name: "BTC/USD - Multi-Exchange",
  tasks: [
    // Binance
    { httpTask: { url: "https://api.binance.com/..." } },
    { jsonParseTask: { path: "$.price" } },
    { cacheTask: { variableName: "BINANCE" } },

    // Coinbase
    { httpTask: { url: "https://api.coinbase.com/..." } },
    { jsonParseTask: { path: "$.data.amount" } },
    { cacheTask: { variableName: "COINBASE" } },

    // Kraken
    { httpTask: { url: "https://api.kraken.com/..." } },
    { jsonParseTask: { path: "$.result.XXBTZUSD.c[0]" } },

    // Aggregate
    {
      medianTask: {
        tasks: [
          { cacheTask: { variableName: "BINANCE" } },
          { cacheTask: { variableName: "COINBASE" } },
          // Current task value (Kraken) automatically included
        ]
      }
    }
  ]
}
```

## Pricing Model

### Feed Pricing Tiers

| Frequency | Base Price | Use Case |
|-----------|-----------|----------|
| Realtime | 0.001 CASH | Trading, arbitrage |
| High | 0.0005 CASH | DeFi protocols |
| Medium | 0.0002 CASH | Analytics |
| Low | 0.0001 CASH | Historical data |

### Cost Components

```
Total Cost = Base Price + (Volume Multiplier × Data Volume) + API Costs
```

**Example Calculations:**

**BTC/USD (High Frequency):**
- Base: 0.0001 CASH
- 3 data sources × 3 HTTP calls = 9 calls
- Volume multiplier: 1.5x
- Total: 0.00015 CASH/update

**Custom Weather Feed (Medium):**
- Base: 0.0002 CASH
- 2 data sources × 2 calls = 4 calls
- Volume multiplier: 1.2x
- Total: 0.00024 CASH/update

## Scalability

### Horizontal Scaling

**Load Balancing:**
```
Client Requests
      ↓
Load Balancer (HAProxy)
      ↓
┌─────┴─────┬─────────┬─────────┐
│  Server1  │ Server2 │ Server3 │
└───────────┴─────────┴─────────┘
```

**Stateless Design:**
- No server-side session storage
- Payment tracking via Solana blockchain
- TAP identity from registry (cached)
- WebSocket connections can move between servers

### Caching Strategy

**1. Simulation Cache (In-Memory)**
- TTL: 30 seconds
- Reduces Crossbar API calls
- Key: feedId
- Invalidation: Time-based

**2. TAP Identity Cache**
- TTL: 1 hour
- Reduces registry lookups
- Key: keyId
- Invalidation: Time-based

**3. Feed Metadata Cache**
- TTL: Infinite (until server restart)
- Fast feed lookups
- Key: feedId

## Monitoring & Observability

### Metrics

```typescript
{
  totalFeeds: 42,           // Registered feeds
  totalUpdates: 15234,      // All-time updates
  revenue: 1.523,           // Total CASH earned
  averageLatency: 350,      // ms
  successRate: 99.8,        // %
  cacheHitRate: 45.2,       // %
  activeSubscriptions: 12   // WebSocket connections
}
```

### Health Checks

**Endpoint:** `GET /health`

```json
{
  "status": "healthy",
  "uptime": 86400,
  "metrics": { /* ... */ }
}
```

### Error Tracking

**Error Categories:**
1. TAP auth failures (401)
2. Payment failures (402/403)
3. Feed not found (404)
4. Switchboard errors (500)
5. Network errors (502/503)

## Deployment Architecture

### Development

```
Local Machine
  ├── Marketplace Server (port 3003)
  ├── TAP Registry (port 8001)
  ├── x402 Registry (port 3001)
  └── Solana Devnet RPC
```

### Production (Kubernetes)

```yaml
Namespace: switchboard-x402
  ├── Deployment: marketplace-server (3 replicas)
  ├── Service: marketplace-svc (LoadBalancer)
  ├── ConfigMap: marketplace-config
  ├── Secret: payment-credentials
  ├── Ingress: marketplace.x402.network (TLS)
  └── HPA: Auto-scaling 3-10 pods
```

## Future Enhancements

1. **Surge Streaming**: Sub-100ms WebSocket feeds
2. **Multi-Chain**: EVM, Sui support
3. **Advanced Aggregation**: Weighted mean, TWAP, VWAP
4. **Historical Data**: On-chain feed history storage
5. **Feed Governance**: Community-driven feed curation
6. **Advanced Pricing**: Dynamic pricing based on demand
7. **Feed Analytics**: Usage statistics, trending feeds
8. **SDK Libraries**: Python, Rust, Go clients

## Conclusion

This architecture provides a production-ready foundation for monetizing oracle data through x402 micropayments while maintaining security, scalability, and developer experience. The integration of Switchboard's battle-tested on-demand protocol with TAP authentication and CASH payments creates a unique value proposition in the oracle marketplace space.
