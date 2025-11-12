# Old Faithful x402 Integration Architecture

## Executive Summary

Production-grade integration of x402 Universal Payment Layer with Old Faithful RPC, enabling sustainable monetization of Solana's complete historical blockchain data through HTTP 402 payments, Visa TAP authentication, and CASH micropayments.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Applications                          │
│  (dApps, Analytics, Explorers, Research Tools)                  │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTP/gRPC + TAP Signatures
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Old Faithful x402 Proxy Server                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TAP Authentication Middleware                            │   │
│  │  - RFC 9421 signature verification                        │   │
│  │  - Agent identity validation                              │   │
│  │  - Request signing and replay prevention                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  HTTP 402 Payment Interceptor                             │   │
│  │  - Historical data query cost calculation                 │   │
│  │  - Tiered pricing based on data volume/age               │   │
│  │  - CASH payment requirements generation                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service Registry Integration                             │   │
│  │  - Auto-register RPC methods as x402 services             │   │
│  │  - Dynamic pricing updates                                │   │
│  │  - Service health reporting                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Payment Verification & Settlement                        │   │
│  │  - CASH token transfer verification                       │   │
│  │  - On-chain transaction confirmation                      │   │
│  │  - Revenue tracking and analytics                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────┘
             │ Standard RPC/gRPC
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Old Faithful Backend Services                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  faithful-cli RPC Server                                  │   │
│  │  - getBlock, getTransaction, getSignaturesForAddress      │   │
│  │  - Block time, genesis hash, version info                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Yellowstone gRPC Streaming                               │   │
│  │  - Slot, account, transaction subscriptions               │   │
│  │  - Block reconstruction and metadata                      │   │
│  │  - Filtered data streams                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CAR Archive Storage                                      │   │
│  │  - IPFS-compatible content addressing                     │   │
│  │  - Epoch-indexed historical data                          │   │
│  │  - Filecoin network integration                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Old Faithful RPC Proxy

**Purpose**: Intelligent proxy layer intercepting RPC requests and enforcing x402 payment requirements before forwarding to Old Faithful backend.

**Responsibilities**:
- Request routing and load balancing
- Dynamic cost calculation based on query complexity
- TAP signature verification
- HTTP 402 payment enforcement
- Response caching for paid queries
- Metrics collection and monitoring

### 2. Payment Pricing Engine

**Tiered Pricing Model**:

```typescript
interface PricingTier {
  method: string
  basePrice: number
  volumeMultiplier: number
  ageMultiplier: number
  complexityFactors: {
    maxSupportedTransactionVersion?: number
    includeRewards?: boolean
    transactionDetails?: 'full' | 'accounts' | 'signatures'
  }
}
```

**Pricing Examples**:
- `getBlock`: 0.0001 CASH base + 0.00001 CASH per transaction
- `getTransaction`: 0.00005 CASH
- `getSignaturesForAddress`: 0.0001 CASH base + 0.000001 CASH per signature
- Historical queries (>30 days old): 2x multiplier
- Archive queries (>180 days old): 5x multiplier

### 3. TAP Authentication Layer

**Implementation**:
- RFC 9421 HTTP message signature verification
- Ed25519 and RSA-PSS-SHA256 algorithm support
- Agent identity resolution via TAP Registry
- Nonce-based replay attack prevention
- Tag-based authorization (agent-browser-auth, agent-payer-auth)

### 4. Service Registry Integration

**Auto-registration**:
```typescript
const services: X402ServiceRegistration[] = [
  {
    name: 'Old Faithful getBlock',
    description: 'Retrieve complete block data from Solana history',
    category: 'historical-data',
    url: 'https://faithful.x402.network/getBlock',
    pricePerCall: 0.0001,
    ownerWalletAddress: PROVIDER_WALLET,
    acceptedTokens: ['CASH', 'USDC', 'SOL'],
    capabilities: ['historical-blocks', 'transaction-data', 'rewards-info'],
  },
]
```

### 5. gRPC Streaming Proxy

**Subscription Management**:
- Stream multiplexing for multiple clients
- Payment-per-update billing
- Subscription tier management
- Bandwidth throttling based on payment tier

## Data Flow

### Standard RPC Call with Payment

```
1. Client → Proxy: RPC request + TAP signature
2. Proxy: Verify TAP signature against registry
3. Proxy: Calculate query cost based on params
4. Proxy → Client: 402 Payment Required (CASH amount, payment address)
5. Client: Execute CASH transfer on-chain
6. Client → Proxy: Retry request + X-Payment header (tx signature)
7. Proxy: Verify CASH payment on-chain
8. Proxy → Old Faithful: Forward request
9. Old Faithful → Proxy: Historical data response
10. Proxy: Cache response, record metrics
11. Proxy → Client: Return data
```

### gRPC Streaming with Subscription Payment

```
1. Client → Proxy: Subscribe request + TAP signature + deposit
2. Proxy: Verify payment covers initial subscription period
3. Proxy → Yellowstone: Establish upstream subscription
4. For each update:
   a. Proxy: Deduct cost from client deposit
   b. Proxy → Client: Stream update
   c. If deposit low: Send payment top-up notification
5. Client: Top-up deposit via CASH transfer
6. On unsubscribe: Refund remaining deposit
```

## Pricing Strategy

### Cost Factors

1. **Data Volume**: Larger responses cost more
2. **Data Age**: Older data (>30 days) incurs premium
3. **Query Complexity**: Filters, inclusions increase cost
4. **Commitment Level**: Finalized data costs less than processed
5. **Response Format**: Parsed JSON costs more than raw

### Competitive Positioning

- Archive.org: Free but slow, no API guarantees
- Dedicated RPC nodes: $200-2000/month
- Old Faithful x402: Pay-per-query starting at $0.0001
- Enterprise plans: Flat monthly + overage

## Technical Implementation

### Stack

- **Runtime**: Node.js 20+ with TypeScript 5.3+
- **RPC Proxy**: Fastify with HTTP/2 support
- **gRPC**: @grpc/grpc-js with bidirectional streaming
- **Blockchain**: @solana/web3.js, @solana/spl-token
- **Authentication**: @x402-upl/visa-tap-agent
- **Payments**: @x402-upl/sdk for CASH handling
- **Monitoring**: Prometheus metrics, OpenTelemetry tracing
- **Storage**: Redis for caching, PostgreSQL for analytics

### Performance Targets

- Request latency: <100ms p50, <500ms p99
- Payment verification: <2s average
- Throughput: 1000 RPC req/s per instance
- Streaming: 10,000 concurrent subscriptions
- Uptime: 99.9% SLA

### Security

- Rate limiting: Per-identity and per-IP
- DDoS protection: Cloudflare integration
- Payment validation: On-chain verification only
- Data integrity: CAR file hash validation
- Audit logging: All payment transactions recorded

## Monitoring & Observability

### Metrics

- Revenue per method
- Payment success rate
- Average query cost
- Cache hit ratio
- Upstream latency
- Error rates by type

### Alerts

- Payment verification failures
- Upstream service degradation
- Unusual spending patterns
- Cache invalidation events
- Deposit balance warnings

## Deployment

### Infrastructure

- **Load Balancer**: HAProxy with HTTP/2 termination
- **Proxy Tier**: 3+ instances (horizontal scaling)
- **Cache Layer**: Redis Cluster (16GB per node)
- **Database**: PostgreSQL 15 with TimescaleDB
- **Old Faithful**: Dedicated nodes with CAR archive access
- **Monitoring**: Grafana + Prometheus + Loki

### Rollout Strategy

1. **Phase 1**: Beta with whitelisted users
2. **Phase 2**: Public beta with rate limits
3. **Phase 3**: Full production launch
4. **Phase 4**: Enterprise tier with SLA

## Revenue Model

### Pricing Tiers

**Free Tier**:
- 100 requests/day
- Recent data only (<7 days)
- Rate limited to 10 req/min

**Developer**:
- $10/month + $0.01 per 1000 requests
- Full historical access
- 100 req/min rate limit

**Professional**:
- $100/month + $0.005 per 1000 requests
- Priority routing
- 1000 req/min rate limit
- Dedicated support

**Enterprise**:
- Custom pricing
- SLA guarantees
- Dedicated infrastructure
- White-glove support

## Success Metrics

- **Adoption**: 1000+ active paying users within 3 months
- **Revenue**: $10k MRR within 6 months
- **Performance**: <100ms p50 latency maintained
- **Reliability**: 99.9%+ uptime
- **Data Coverage**: All epochs from genesis available

## Competitive Advantages

1. **Pay-per-use**: No upfront commitment
2. **Complete History**: Access to all Solana data
3. **CASH Payments**: Instant micropayment settlement
4. **TAP Authentication**: Trustless identity verification
5. **Marketplace Integration**: Discoverable via x402 Registry
6. **Developer-Friendly**: Standard RPC interface
7. **Transparent Pricing**: Cost calculation algorithm public
8. **High Performance**: Optimized caching and indexing

## Future Enhancements

- GraphQL query interface
- WebSocket subscriptions with payment streaming
- SQL-like query language for historical analysis
- Pre-computed aggregate views
- Machine learning-based cost prediction
- Cross-chain data correlation
- Data export to analytics platforms
