# Facilitator API Component

The X402-UPL Facilitator is the central payment routing and settlement service that handles payment processing, service discovery, escrow management, and merchant settlements.

## Overview

**Package**: `packages/facilitator/`
**Port**: 4001 (configurable)
**Technology**: Fastify + Prisma + Redis + Solana
**Purpose**: Payment facilitation, routing, and settlement

### Key Responsibilities

1. **Payment Verification**: Verify Solana transactions on-chain
2. **Service Registry**: Register and discover x402-enabled services
3. **Escrow Management**: Hold funds safely for agent-to-agent transactions
4. **Settlement Processing**: Distribute earnings to merchants (2% platform fee)
5. **Multi-Hop Routing**: Route payments through intermediary services
6. **Webhook Delivery**: Notify merchants of payment events
7. **API Key Management**: Secure authentication for merchants

---

## Architecture

### Technology Stack

- **Web Framework**: Fastify (high-performance Node.js framework)
- **Database**: PostgreSQL via Prisma ORM
- **Cache/Queue**: Redis (Upstash for production)
- **Blockchain**: Solana (mainnet-beta/devnet)
- **Authentication**: Ed25519 wallet signatures + API keys

### File Structure

```
packages/facilitator/
├── src/
│   ├── index.ts                    # Main server entry
│   ├── db/
│   │   └── client.ts               # Prisma client
│   ├── cache/
│   │   └── redis.ts                # Redis connection
│   ├── middleware/
│   │   ├── auth.ts                 # Authentication middleware
│   │   └── rate-limit.ts           # Rate limiting
│   ├── routes/
│   │   ├── payments.ts             # Payment verification
│   │   ├── services.ts             # Service registry
│   │   ├── escrow.ts               # Escrow management
│   │   ├── settlement.ts           # Merchant settlements
│   │   ├── routing.ts              # Multi-hop routing
│   │   ├── api-keys.ts             # API key management
│   │   ├── webhook-config.ts       # Webhook configuration
│   │   ├── notifications.ts        # Webhook delivery
│   │   └── transactions.ts         # Transaction history
│   ├── services/
│   │   └── settlement-scheduler.ts # Automated settlements
│   ├── utils/
│   │   └── webhook-signature.ts    # HMAC signature generation
│   └── webhooks/
│       └── delivery.ts             # Webhook delivery service
├── prisma/
│   └── schema.prisma               # Database schema
├── .env.example
├── Dockerfile
└── package.json
```

---

## Payment Verification Endpoints

### POST /verify

Verify a Solana transaction signature.

**Authentication**: Required (wallet signature or API key)

**Request Body**:
```json
{
  "signature": "4uZX2F5TGH...",
  "expectedAmount": "0.001",
  "recipient": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

**Response** (200 OK):
```json
{
  "verified": true,
  "amount": 0.001,
  "expected": 0.001,
  "signature": "4uZX2F5TGH...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response** (404 Not Found):
```json
{
  "verified": false,
  "error": "Transaction not found"
}
```

**Implementation** (`packages/facilitator/src/routes/payments.ts:11-71`):
```typescript
fastify.post('/verify', async (request, reply) => {
  const { signature, expectedAmount, recipient } = request.body;

  // Fetch transaction from Solana
  const tx = await connection.getTransaction(signature, {
    commitment: 'confirmed',
  });

  if (!tx || !tx.meta) {
    return reply.status(404).send({
      verified: false,
      error: 'Transaction not found'
    });
  }

  // Find recipient in transaction
  const recipientPubkey = new PublicKey(recipient);
  const recipientIndex = tx.transaction.message.accountKeys.findIndex(
    key => key.equals(recipientPubkey)
  );

  // Verify amount
  const lamportsReceived = tx.meta.postBalances[recipientIndex] -
                           tx.meta.preBalances[recipientIndex];
  const solReceived = lamportsReceived / 1_000_000_000;
  const expected = parseFloat(expectedAmount);

  const verified = Math.abs(solReceived - expected) < 0.000001;

  return reply.send({
    verified,
    amount: solReceived,
    expected,
    signature,
    timestamp: new Date(tx.blockTime! * 1000).toISOString()
  });
});
```

---

### POST /route

Create a payment route.

**Request Body**:
```json
{
  "from": "ClientWallet...",
  "to": "ServiceWallet...",
  "amount": "0.001",
  "asset": "SOL"
}
```

**Response**:
```json
{
  "routeId": "route_1234567890_abc123",
  "from": "ClientWallet...",
  "to": "ServiceWallet...",
  "amount": "0.001",
  "asset": "SOL",
  "status": "pending"
}
```

---

### GET /route/:routeId

Get route details.

**Response**:
```json
{
  "id": "route_1234567890_abc123",
  "from": "ClientWallet...",
  "to": "ServiceWallet...",
  "amount": "0.001",
  "asset": "SOL",
  "status": "completed",
  "createdAt": 1700000000000,
  "completedAt": 1700000123000
}
```

---

## Service Registry Endpoints

### GET /api/services

List all registered services.

**Response**:
```json
[
  {
    "id": "svc_abc123",
    "name": "Sentiment Analysis API",
    "url": "https://api.example.com/analyze",
    "category": "AI & ML",
    "pricePerCall": "0.001",
    "acceptedTokens": ["USDC", "CASH"],
    "merchantWallet": "7xKXtg2C...",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

---

### GET /api/services/search

Search and filter services.

**Query Parameters**:
- `query` (string): Full-text search
- `category` (string): Filter by category
- `minPrice` (string): Minimum price
- `maxPrice` (string): Maximum price
- `tokens` (string[]): Accepted tokens
- `sortBy` (string): `price` | `popularity` | `rating` | `recent`
- `limit` (number): Results per page (default: 50)
- `offset` (number): Pagination offset

**Example**:
```http
GET /api/services/search?category=AI&maxPrice=0.01&sortBy=rating&limit=10
```

**Response**:
```json
{
  "services": [
    {
      "id": "svc_abc123",
      "name": "Sentiment Analysis API",
      "category": "AI & ML",
      "pricePerCall": "0.001",
      "acceptedTokens": ["USDC"],
      "averageRating": 4.8,
      "totalCalls": 15234
    }
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

**Implementation** (`packages/facilitator/src/routes/services.ts:38-98`):
```typescript
fastify.get('/api/services/search', async (request, reply) => {
  const query = request.query;

  const where: any = {};

  // Full-text search
  if (query.query) {
    where.OR = [
      { name: { contains: query.query, mode: 'insensitive' } },
      { url: { contains: query.query, mode: 'insensitive' } },
      { description: { contains: query.query, mode: 'insensitive' } }
    ];
  }

  // Category filter
  if (query.category) {
    where.category = query.category;
  }

  // Price range
  if (query.minPrice || query.maxPrice) {
    where.pricePerCall = {};
    if (query.minPrice) where.pricePerCall.gte = query.minPrice;
    if (query.maxPrice) where.pricePerCall.lte = query.maxPrice;
  }

  // Token filter
  if (query.tokens && query.tokens.length > 0) {
    where.acceptedTokens = {
      hasSome: query.tokens
    };
  }

  // Sorting
  let orderBy: any = { createdAt: 'desc' };
  if (query.sortBy === 'price') {
    orderBy = { pricePerCall: 'asc' };
  }

  const services = await prisma.service.findMany({
    where,
    orderBy,
    take: query.limit || 50,
    skip: query.offset || 0
  });

  const total = await prisma.service.count({ where });

  return reply.send({ services, total, limit: query.limit || 50, offset: query.offset || 0 });
});
```

---

### GET /api/services/:id

Get detailed service information with statistics.

**Response**:
```json
{
  "service": {
    "id": "svc_abc123",
    "name": "Sentiment Analysis API",
    "description": "Real-time sentiment analysis",
    "category": "AI & ML",
    "pricePerCall": "0.001",
    "acceptedTokens": ["USDC", "CASH"],
    "merchantWallet": "7xKXtg2C..."
  },
  "stats": {
    "totalCalls": 15234,
    "totalRevenue": "15.234",
    "averageRating": 4.8,
    "successRate": 99.2
  }
}
```

---

### GET /api/services/trending

Get trending services (last 7 days).

**Response**:
```json
{
  "trending": [
    {
      "id": "svc_abc123",
      "name": "Sentiment Analysis API",
      "pricePerCall": "0.001",
      "stats": {
        "count": 1523,
        "revenue": 1.523
      }
    }
  ]
}
```

---

### POST /api/services

Register a new service.

**Authentication**: Required

**Request Body**:
```json
{
  "wallet": "7xKXtg2C...",
  "name": "Sentiment Analysis API",
  "url": "https://api.example.com/analyze",
  "description": "Real-time sentiment analysis",
  "category": "AI & ML",
  "pricePerCall": "0.001",
  "acceptedTokens": ["USDC", "CASH"]
}
```

**Response** (201 Created):
```json
{
  "service": {
    "id": "svc_abc123",
    "name": "Sentiment Analysis API",
    "url": "https://api.example.com/analyze",
    "merchantWallet": "7xKXtg2C...",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### POST /api/services/:id/rate

Rate a service.

**Authentication**: Required

**Request Body**:
```json
{
  "rating": 5,
  "comment": "Excellent service!",
  "agentId": "7xKXtg2C..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Rating recorded",
  "rating": {
    "id": "rating_abc123",
    "rating": 5,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### GET /api/services/:id/reputation

Get service reputation score.

**Response**:
```json
{
  "reputationScore": 8750,
  "successRate": 99.2,
  "failureRate": 0.8,
  "totalTransactions": 15234,
  "successfulTransactions": 15112,
  "failedTransactions": 122
}
```

**Reputation Calculation** (`packages/facilitator/src/routes/services.ts:278-316`):
```typescript
let reputationScore = 5000; // Base score

reputationScore += successfulTransactions * 10;  // +10 per success
reputationScore -= failedTransactions * 50;       // -50 per failure

// Penalty for low success rate
if (successRate < 90 && totalTransactions > 10) {
  reputationScore -= (90 - successRate) * 10;
}

// Clamp to 0-10000
reputationScore = Math.max(0, Math.min(10000, reputationScore));
```

---

## Escrow Endpoints

### POST /escrow/create

Create an escrow for safe transactions.

**Request Body**:
```json
{
  "buyer": "BuyerWallet...",
  "seller": "SellerWallet...",
  "amount": "1.0",
  "asset": "USDC",
  "condition": "data-delivery"
}
```

**Response**:
```json
{
  "id": "escrow_1234567890_abc",
  "buyer": "BuyerWallet...",
  "seller": "SellerWallet...",
  "amount": "1.0",
  "asset": "USDC",
  "condition": "data-delivery",
  "status": "pending",
  "createdAt": 1700000000000
}
```

---

### POST /escrow/:escrowId/fund

Fund an escrow with transaction signature.

**Request Body**:
```json
{
  "signature": "4uZX2F5TGH..."
}
```

**Response**:
```json
{
  "id": "escrow_1234567890_abc",
  "status": "funded",
  "fundSignature": "4uZX2F5TGH...",
  "fundedAt": 1700000123000
}
```

---

### POST /escrow/:escrowId/release

Release escrow funds to seller.

**Response**:
```json
{
  "id": "escrow_1234567890_abc",
  "status": "released",
  "releasedAt": 1700000456000
}
```

---

### POST /escrow/:escrowId/refund

Refund escrow to buyer.

**Request Body**:
```json
{
  "reason": "Service not delivered"
}
```

**Response**:
```json
{
  "id": "escrow_1234567890_abc",
  "status": "refunded",
  "refundReason": "Service not delivered",
  "refundedAt": 1700000789000
}
```

---

## Settlement Endpoints

### POST /api/settlement/request

Request settlement of earnings.

**Authentication**: Required (wallet signature)

**Request Body**:
```json
{
  "merchantWallet": "7xKXtg2C...",
  "serviceId": "svc_abc123",
  "settlementType": "manual"
}
```

**Response**:
```json
{
  "settlementId": "stl_abc123",
  "amount": 9.8,
  "transactionSignature": "4uZX2F5TGH...",
  "status": "completed",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**Platform Fee**: 2% (configurable via `PLATFORM_FEE_RATE`)

**Implementation** (`packages/facilitator/src/routes/settlement.ts:50-193`):
```typescript
// Calculate fees
const totalAmount = transactions.reduce(
  (sum, tx) => sum + parseFloat(tx.amount),
  0
);

const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_RATE || '0.02');
const platformFee = totalAmount * platformFeeRate;
const merchantAmount = totalAmount - platformFee;

// Create settlement record
const settlement = await prisma.settlement.create({
  data: {
    merchantWallet,
    serviceId,
    totalAmount: totalAmount.toString(),
    platformFee: platformFee.toString(),
    merchantAmount: merchantAmount.toString(),
    status: 'pending',
    settlementType,
  },
});

// Execute transfer
const transaction = new Transaction().add(
  createTransferInstruction(
    treasuryTokenAccount,
    merchantTokenAccount,
    treasuryKeypair.publicKey,
    Math.floor(merchantAmount * 1_000_000),
    [],
    TOKEN_PROGRAM_ID
  )
);

const signature = await connection.sendTransaction(
  transaction,
  [treasuryKeypair]
);

await connection.confirmTransaction(signature);
```

---

### GET /api/settlement/pending

Get pending settlement amount.

**Query**: `merchantWallet` (required)

**Response**:
```json
{
  "transactionCount": 152,
  "totalAmount": 10.0,
  "platformFee": 0.2,
  "merchantAmount": 9.8,
  "transactions": [
    {
      "id": "tx_abc123",
      "signature": "4uZX2F5TGH...",
      "amount": "0.001",
      "timestamp": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/settlement/history

Get settlement history.

**Query**:
- `merchantWallet` (required)
- `limit` (optional, default: 50)

**Response**:
```json
{
  "settlements": [
    {
      "id": "stl_abc123",
      "totalAmount": "10.0",
      "platformFee": "0.2",
      "merchantAmount": "9.8",
      "transactionCount": 152,
      "status": "completed",
      "transactionSignature": "4uZX2F5TGH...",
      "requestedAt": "2024-01-15T10:00:00.000Z",
      "completedAt": "2024-01-15T10:01:00.000Z"
    }
  ]
}
```

---

### POST /api/settlement/cancel

Cancel a pending settlement.

**Request Body**:
```json
{
  "settlementId": "stl_abc123",
  "reason": "Incorrect amount"
}
```

**Response**:
```json
{
  "message": "Settlement cancelled successfully"
}
```

---

## Multi-Hop Routing Endpoints

### POST /routes/create

Create a multi-hop payment route.

**Request Body**:
```json
{
  "sourceService": "client-wallet",
  "targetService": "service-c",
  "amount": "0.01",
  "asset": "USDC",
  "hops": ["service-a", "service-b"]
}
```

**Response**:
```json
{
  "id": "route_1234567890_abc",
  "source": "client-wallet",
  "target": "service-c",
  "amount": "0.01",
  "asset": "USDC",
  "hops": ["service-a", "service-b"],
  "status": "pending",
  "createdAt": 1700000000000
}
```

---

### POST /routes/:routeId/execute

Execute a multi-hop route.

**Response**:
```json
{
  "id": "route_1234567890_abc",
  "status": "executing",
  "executedAt": 1700000123000
}
```

---

### POST /routes/:routeId/complete

Complete a route with final transaction signature.

**Request Body**:
```json
{
  "signature": "4uZX2F5TGH..."
}
```

**Response**:
```json
{
  "id": "route_1234567890_abc",
  "status": "completed",
  "signature": "4uZX2F5TGH...",
  "completedAt": 1700000456000
}
```

---

## API Key Management

### POST /api/keys/create

Generate a new API key.

**Request Body**:
```json
{
  "name": "Production API Key",
  "permissions": ["read", "write"],
  "expiresIn": 31536000
}
```

**Response**:
```json
{
  "apiKey": {
    "id": "key_abc123",
    "name": "Production API Key",
    "key": "x402_live_abcdef123456...",
    "keyPrefix": "x402_live_ab",
    "permissions": ["read", "write"],
    "expiresAt": "2025-01-15T10:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "warning": "Save this API key now. It will not be shown again."
}
```

**Limit**: 10 active API keys per account

---

### GET /api/keys

List all API keys for authenticated user.

**Response**:
```json
[
  {
    "id": "key_abc123",
    "name": "Production API Key",
    "keyPrefix": "x402_live_ab",
    "permissions": ["read", "write"],
    "lastUsed": "2024-01-15T09:30:00.000Z",
    "expiresAt": "2025-01-15T10:00:00.000Z",
    "revoked": false,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

---

### DELETE /api/keys/:id

Revoke an API key.

**Response**:
```json
{
  "message": "API key revoked successfully"
}
```

---

## Webhook Configuration

### POST /api/webhooks/config

Configure webhook endpoint.

**Request Body**:
```json
{
  "webhookUrl": "https://your-service.com/webhook",
  "events": ["settlement.completed", "settlement.failed", "payment.verified"]
}
```

**Response**:
```json
{
  "webhookConfig": {
    "id": "wh_abc123",
    "webhookUrl": "https://your-service.com/webhook",
    "webhookSecret": "whsec_abcdef123456...",
    "events": ["settlement.completed", "settlement.failed"],
    "enabled": true,
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "warning": "Save the webhook secret securely. Use it to verify webhook signatures."
}
```

---

### GET /api/webhooks/config

Get webhook configuration.

**Response**:
```json
{
  "id": "wh_abc123",
  "webhookUrl": "https://your-service.com/webhook",
  "events": ["settlement.completed", "settlement.failed"],
  "enabled": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Note**: Webhook secret is NOT returned in GET requests.

---

### POST /api/webhooks/test

Test webhook delivery.

**Request Body**:
```json
{
  "eventType": "settlement.completed"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Test webhook delivered successfully",
  "statusCode": 200,
  "responseTime": 123
}
```

---

## Webhook Payload Format

Webhooks are sent as POST requests with HMAC-SHA256 signatures.

### Headers
```http
POST /webhook HTTP/1.1
Host: your-service.com
Content-Type: application/json
X-Webhook-Signature: sha256=abcdef123456...
X-Webhook-Timestamp: 1700000000
X-Webhook-Event: settlement.completed
```

### Payload
```json
{
  "event": "settlement.completed",
  "timestamp": 1700000000,
  "data": {
    "settlementId": "stl_abc123",
    "merchantWallet": "7xKXtg2C...",
    "amount": "9.8",
    "platformFee": "0.2",
    "transactionSignature": "4uZX2F5TGH...",
    "completedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Signature Verification

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: object,
  signature: string,
  secret: string
): boolean {
  const payloadString = JSON.stringify(payload);

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${signature}`),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}
```

---

## Authentication

The Facilitator supports two authentication methods:

### 1. Wallet Signature Authentication

**Header**: `X-Wallet-Signature`

```typescript
import { sign } from '@noble/ed25519';

const message = 'x402-auth-request';
const signature = await sign(
  new TextEncoder().encode(message),
  wallet.secretKey.slice(0, 32)
);

const headers = {
  'X-Wallet-Address': wallet.publicKey.toBase58(),
  'X-Wallet-Signature': Buffer.from(signature).toString('base64'),
};
```

### 2. API Key Authentication

**Header**: `X-API-Key`

```http
GET /api/services HTTP/1.1
X-API-Key: x402_live_abcdef123456...
```

---

## Rate Limiting

Per-endpoint rate limits (stored in Redis):

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/services/search` | 100 requests | 1 minute |
| `/verify` | 10 requests | 1 minute |
| `/api/settlement/request` | 5 requests | 1 hour |
| Default | 50 requests | 1 minute |

**Rate Limit Response** (429 Too Many Requests):
```json
{
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded",
  "retryAfter": 45
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VERIFICATION_FAILED` | 402 | Payment verification failed |
| `INSUFFICIENT_BALANCE` | 402 | Insufficient balance |
| `REPLAY_ATTACK` | 403 | Transaction already used |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Environment Variables

```bash
# Server
PORT=4001
HOST=0.0.0.0
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=rediss://default:pass@redis.upstash.io:6379

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TREASURY_PRIVATE_KEY=[1,2,3,...]
TOKEN_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Platform
PLATFORM_FEE_RATE=0.02
ADMIN_WALLET_ADDRESSES=wallet1,wallet2

# Logging
LOG_LEVEL=info
```

---

## Deployment

### Docker

```bash
docker build -t x402-facilitator .
docker run -p 4001:4001 \
  -e DATABASE_URL=... \
  -e REDIS_URL=... \
  -e SOLANA_RPC_URL=... \
  x402-facilitator
```

### Railway

```bash
railway up
```

### PM2

```bash
pm2 start src/index.ts --name facilitator
pm2 save
```

---

## Health Check

**GET /health**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "latency": 2 },
    "solana": { "status": "healthy", "latency": 100 }
  }
}
```

---

## Metrics

**GET /metrics** (Prometheus format)

```
# HELP x402_payments_total Total payments processed
# TYPE x402_payments_total counter
x402_payments_total{status="success",token="USDC"} 15234

# HELP x402_payment_duration_seconds Payment verification duration
# TYPE x402_payment_duration_seconds histogram
x402_payment_duration_seconds_bucket{le="0.1"} 12000
x402_payment_duration_seconds_bucket{le="0.5"} 14800
x402_payment_duration_seconds_bucket{le="1.0"} 15200
```

---

## Summary

The Facilitator API is the central hub for:
- Payment verification on Solana
- Service discovery and registration
- Escrow management for safe transactions
- Merchant settlements with automatic fee calculation
- Multi-hop payment routing
- Webhook notifications
- API key management

For client-side integration, see [JavaScript SDK](../sdks/javascript.md).
For API reference, see [Facilitator API Reference](../api-reference/facilitator-api.md).
