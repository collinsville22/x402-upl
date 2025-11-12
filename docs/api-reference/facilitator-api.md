# Facilitator API Reference

Complete REST API reference for the X402-UPL Facilitator service.

**Base URL**: `https://facilitator.x402.network` (production)
**Base URL**: `http://localhost:4001` (development)
**Version**: 1.0.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Payment Endpoints](#payment-endpoints)
3. [Service Registry](#service-registry)
4. [Escrow Management](#escrow-management)
5. [Settlement Processing](#settlement-processing)
6. [Multi-Hop Routing](#multi-hop-routing)
7. [API Key Management](#api-key-management)
8. [Webhook Configuration](#webhook-configuration)
9. [Transaction History](#transaction-history)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)

---

## Authentication

### Methods

1. **Wallet Signature** (Recommended for wallets)
2. **API Key** (Recommended for services)

### Wallet Signature Authentication

**Headers**:
```http
X-Wallet-Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
X-Wallet-Signature: base64-encoded-signature
```

**Example**:
```typescript
import { sign } from '@noble/ed25519';

const message = 'x402-auth-request';
const signature = await sign(
  new TextEncoder().encode(message),
  wallet.secretKey.slice(0, 32)
);

fetch('https://facilitator.x402.network/api/services', {
  headers: {
    'X-Wallet-Address': wallet.publicKey.toBase58(),
    'X-Wallet-Signature': Buffer.from(signature).toString('base64'),
  },
});
```

### API Key Authentication

**Header**:
```http
X-API-Key: x402_live_abcdef123456789...
```

**Example**:
```typescript
fetch('https://facilitator.x402.network/api/services', {
  headers: {
    'X-API-Key': process.env.X402_API_KEY,
  },
});
```

---

## Payment Endpoints

### POST /verify

Verify a Solana payment transaction.

**Authentication**: Required

**Request**:
```http
POST /verify HTTP/1.1
Content-Type: application/json
X-API-Key: x402_live_...

{
  "signature": "4uZX2F5TGHtkKNLviVX...",
  "expectedAmount": "0.001",
  "recipient": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

**Response** (200):
```json
{
  "verified": true,
  "amount": 0.001,
  "expected": 0.001,
  "signature": "4uZX2F5TGHtkKNLviVX...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response** (404):
```json
{
  "verified": false,
  "error": "Transaction not found"
}
```

**Response** (400):
```json
{
  "verified": false,
  "error": "Recipient not found in transaction"
}
```

---

### POST /route

Create a simple payment route.

**Request**:
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

Get route status and details.

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

## Service Registry

### GET /api/services

List all registered services.

**Query Parameters**: None

**Response**:
```json
[
  {
    "id": "svc_abc123",
    "name": "Sentiment Analysis API",
    "url": "https://api.example.com/analyze",
    "description": "Real-time sentiment analysis",
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

Advanced service search and filtering.

**Query Parameters**:
- `query` (string): Full-text search across name, description, URL
- `category` (string): Filter by category
- `minPrice` (string): Minimum price per call
- `maxPrice` (string): Maximum price per call
- `tokens` (string[]): Accepted token filters (e.g., `tokens=USDC&tokens=CASH`)
- `sortBy` (string): Sort by `price`, `popularity`, `rating`, `recent`
- `limit` (number): Results per page (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Example**:
```http
GET /api/services/search?category=AI&maxPrice=0.01&tokens=USDC&sortBy=rating&limit=10
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

---

### GET /api/services/:id

Get detailed service information.

**Response**:
```json
{
  "service": {
    "id": "svc_abc123",
    "name": "Sentiment Analysis API",
    "description": "Real-time sentiment analysis for text",
    "category": "AI & ML",
    "pricePerCall": "0.001",
    "acceptedTokens": ["USDC", "CASH"],
    "merchantWallet": "7xKXtg2C...",
    "createdAt": "2024-01-15T10:00:00.000Z"
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

### POST /api/services

Register a new service.

**Authentication**: Required

**Request**:
```json
{
  "wallet": "7xKXtg2C...",
  "name": "Sentiment Analysis API",
  "url": "https://api.example.com/analyze",
  "description": "Real-time sentiment analysis for text",
  "category": "AI & ML",
  "pricePerCall": "0.001",
  "acceptedTokens": ["USDC", "CASH"]
}
```

**Response** (201):
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

### POST /api/services/:id/rate

Rate a service.

**Authentication**: Required

**Request**:
```json
{
  "rating": 5,
  "comment": "Excellent service, very fast!",
  "agentId": "7xKXtg2C..."
}
```

**Validation**:
- `rating`: 1-5 (integer)
- `comment`: Optional, max 500 characters
- `agentId`: Must match authenticated wallet

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

**Reputation Scale**: 0-10000

---

### GET /api/services/:id/recommendations

Get similar/related services.

**Response**:
```json
{
  "recommendations": [
    {
      "id": "svc_def456",
      "name": "Emotion Detection API",
      "category": "AI & ML",
      "pricePerCall": "0.0015"
    }
  ]
}
```

---

### GET /api/services/categories

List all service categories with counts.

**Response**:
```json
[
  {
    "category": "AI & ML",
    "count": 42
  },
  {
    "category": "Data Analytics",
    "count": 28
  }
]
```

---

## Escrow Management

### POST /escrow/create

Create a new escrow.

**Authentication**: Required

**Request**:
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

**TTL**: 24 hours

---

### GET /escrow/:escrowId

Get escrow details.

**Response**:
```json
{
  "id": "escrow_1234567890_abc",
  "buyer": "BuyerWallet...",
  "seller": "SellerWallet...",
  "amount": "1.0",
  "asset": "USDC",
  "status": "funded",
  "fundSignature": "4uZX2F5TGH...",
  "createdAt": 1700000000000,
  "fundedAt": 1700000123000
}
```

**Status Values**: `pending`, `funded`, `released`, `refunded`

---

### POST /escrow/:escrowId/fund

Fund an escrow with a transaction.

**Request**:
```json
{
  "signature": "4uZX2F5TGHtkKNLviVX..."
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

**Authentication**: Required (buyer only)

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

**Authentication**: Required

**Request**:
```json
{
  "reason": "Service not delivered as promised"
}
```

**Response**:
```json
{
  "id": "escrow_1234567890_abc",
  "status": "refunded",
  "refundReason": "Service not delivered as promised",
  "refundedAt": 1700000789000
}
```

---

### GET /escrow/stats

Get escrow statistics.

**Authentication**: Required

**Response**:
```json
{
  "created": 150,
  "funded": 142,
  "released": 138,
  "refunded": 4
}
```

---

## Settlement Processing

### POST /api/settlement/request

Request settlement of accumulated earnings.

**Authentication**: Required

**Request**:
```json
{
  "merchantWallet": "7xKXtg2C...",
  "serviceId": "svc_abc123",
  "settlementType": "manual"
}
```

**settlementType**: `manual`, `scheduled`, `automatic`

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

**Platform Fee**: 2% (configurable)

---

### GET /api/settlement/pending

Get pending settlement amount for a merchant.

**Authentication**: Required

**Query**: `merchantWallet` (required)

**Example**:
```http
GET /api/settlement/pending?merchantWallet=7xKXtg2C...
```

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

Get settlement history for a merchant.

**Authentication**: Required

**Query**:
- `merchantWallet` (required)
- `limit` (optional, default: 50, max: 100)

**Example**:
```http
GET /api/settlement/history?merchantWallet=7xKXtg2C...&limit=20
```

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

**Authentication**: Required

**Request**:
```json
{
  "settlementId": "stl_abc123",
  "reason": "Incorrect amount calculated"
}
```

**Response**:
```json
{
  "message": "Settlement cancelled successfully"
}
```

**Note**: Only `pending` settlements can be cancelled.

---

## Multi-Hop Routing

### POST /routes/create

Create a multi-hop payment route.

**Authentication**: Required

**Request**:
```json
{
  "sourceService": "client-wallet",
  "targetService": "service-c-wallet",
  "amount": "0.01",
  "asset": "USDC",
  "hops": ["service-a-wallet", "service-b-wallet"]
}
```

**Response**:
```json
{
  "id": "route_1234567890_abc",
  "source": "client-wallet",
  "target": "service-c-wallet",
  "amount": "0.01",
  "asset": "USDC",
  "hops": ["service-a-wallet", "service-b-wallet"],
  "status": "pending",
  "createdAt": 1700000000000
}
```

**TTL**: 1 hour

---

### GET /routes/:routeId

Get route details.

**Response**:
```json
{
  "id": "route_1234567890_abc",
  "source": "client-wallet",
  "target": "service-c-wallet",
  "amount": "0.01",
  "hops": ["service-a-wallet", "service-b-wallet"],
  "status": "completed",
  "signature": "4uZX2F5TGH...",
  "createdAt": 1700000000000,
  "completedAt": 1700000456000
}
```

---

### POST /routes/:routeId/execute

Execute a route (facilitator initiates payments).

**Authentication**: Required

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

Mark route as complete with final signature.

**Authentication**: Required

**Request**:
```json
{
  "signature": "4uZX2F5TGHtkKNLviVX..."
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

### GET /routes/stats

Get routing statistics.

**Authentication**: Required

**Response**:
```json
{
  "created": 523,
  "executed": 498,
  "completed": 487
}
```

---

## API Key Management

### POST /api/keys/create

Generate a new API key.

**Authentication**: Required (wallet signature)

**Request**:
```json
{
  "name": "Production API Key",
  "permissions": ["read", "write"],
  "expiresIn": 31536000
}
```

**Fields**:
- `name`: Key name (1-100 characters)
- `permissions`: Array of permissions (default: `["read"]`)
- `expiresIn`: Expiration in seconds (minimum: 86400 = 1 day)

**Response** (201):
```json
{
  "apiKey": {
    "id": "key_abc123",
    "name": "Production API Key",
    "key": "x402_live_abcdef123456789...",
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

List API keys for authenticated user.

**Authentication**: Required

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

**Note**: Full key is never returned after creation.

---

### DELETE /api/keys/:id

Revoke an API key.

**Authentication**: Required

**Response**:
```json
{
  "message": "API key revoked successfully"
}
```

---

### POST /api/keys/validate

Validate an API key (for testing).

**Request**:
```json
{
  "apiKey": "x402_live_abcdef123456789..."
}
```

**Response**:
```json
{
  "valid": true,
  "merchantWallet": "7xKXtg2C...",
  "permissions": ["read", "write"],
  "expiresAt": "2025-01-15T10:00:00.000Z"
}
```

---

## Webhook Configuration

### POST /api/webhooks/config

Configure webhook endpoint.

**Authentication**: Required

**Request**:
```json
{
  "webhookUrl": "https://your-service.com/webhook",
  "events": ["settlement.completed", "settlement.failed", "payment.verified"]
}
```

**Events**:
- `settlement.completed`
- `settlement.failed`
- `payment.verified`

**Response** (201):
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

**Limit**: 1 webhook configuration per account

---

### GET /api/webhooks/config

Get webhook configuration.

**Authentication**: Required

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

**Note**: Secret is not returned in GET requests.

---

### PUT /api/webhooks/:id

Update webhook configuration.

**Request**:
```json
{
  "webhookUrl": "https://new-url.com/webhook",
  "events": ["payment.verified"],
  "enabled": false
}
```

**Response**:
```json
{
  "id": "wh_abc123",
  "webhookUrl": "https://new-url.com/webhook",
  "events": ["payment.verified"],
  "enabled": false,
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

### DELETE /api/webhooks/:id

Delete webhook configuration.

**Authentication**: Required

**Response**:
```json
{
  "message": "Webhook deleted successfully"
}
```

---

### POST /api/webhooks/test

Test webhook delivery.

**Authentication**: Required

**Request**:
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

## Transaction History

### GET /api/transactions

Get transaction history.

**Authentication**: Required

**Query**:
- `walletAddress` (optional): Filter by wallet
- `serviceId` (optional): Filter by service
- `status` (optional): Filter by status (`pending`, `confirmed`, `failed`)
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)

**Example**:
```http
GET /api/transactions?status=confirmed&limit=20
```

**Response**:
```json
{
  "transactions": [
    {
      "id": "tx_abc123",
      "signature": "4uZX2F5TGH...",
      "from": "ClientWallet...",
      "to": "ServiceWallet...",
      "amount": "0.001",
      "tokenMint": "USDC",
      "serviceId": "svc_abc123",
      "status": "confirmed",
      "timestamp": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 15234,
  "limit": 20,
  "offset": 0
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error context"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | No authentication provided |
| `INVALID_SIGNATURE` | 401 | Wallet signature invalid |
| `INVALID_API_KEY` | 401 | API key invalid or expired |
| `ACCESS_DENIED` | 403 | Insufficient permissions |
| `REPLAY_ATTACK` | 403 | Transaction already used |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `PAYMENT_VERIFICATION_FAILED` | 402 | Payment could not be verified |
| `INSUFFICIENT_BALANCE` | 402 | Insufficient funds |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

### Example Error Responses

**Validation Error** (400):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input",
  "details": [
    {
      "field": "pricePerCall",
      "message": "Must be a positive number"
    }
  ]
}
```

**Rate Limit** (429):
```json
{
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded",
  "retryAfter": 45
}
```

---

## Rate Limiting

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/services/search` | 100 requests | 1 minute |
| `/verify` | 10 requests | 1 minute |
| `/api/settlement/request` | 5 requests | 1 hour |
| `/api/keys/create` | 3 requests | 1 hour |
| Default | 50 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000060
```

### Rate Limit Response

```json
{
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded",
  "retryAfter": 45
}
```

---

## Webhook Payloads

### Settlement Completed

**Event**: `settlement.completed`

**Headers**:
```http
X-Webhook-Signature: sha256=abcdef123456...
X-Webhook-Timestamp: 1700000000
X-Webhook-Event: settlement.completed
```

**Payload**:
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

### Settlement Failed

**Event**: `settlement.failed`

**Payload**:
```json
{
  "event": "settlement.failed",
  "timestamp": 1700000000,
  "data": {
    "settlementId": "stl_abc123",
    "merchantWallet": "7xKXtg2C...",
    "amount": "9.8",
    "error": "Insufficient balance in treasury",
    "failedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Payment Verified

**Event**: `payment.verified`

**Payload**:
```json
{
  "event": "payment.verified",
  "timestamp": 1700000000,
  "data": {
    "signature": "4uZX2F5TGH...",
    "amount": "0.001",
    "from": "ClientWallet...",
    "to": "ServiceWallet...",
    "serviceId": "svc_abc123",
    "verifiedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

## Summary

The Facilitator API provides:

- **Payment Verification**: Verify Solana transactions on-chain
- **Service Registry**: Discover and register x402-enabled services
- **Escrow**: Safe agent-to-agent transactions
- **Settlements**: Automated merchant payouts with 2% platform fee
- **Multi-Hop Routing**: Payment chains through intermediaries
- **API Keys**: Secure authentication for services
- **Webhooks**: Real-time event notifications

For implementation examples, see:
- [Facilitator Component](../components/facilitator.md)
- [JavaScript SDK](../sdks/javascript.md)
- [Best Practices](../guides/best-practices.md)
