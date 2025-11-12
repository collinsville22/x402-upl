# x402 Facilitator Service

Payment routing and facilitation service for x402 Universal Payment Layer.

## Features

- Payment verification on Solana blockchain
- Multi-hop payment routing
- Escrow functionality
- Webhook notifications
- Metrics and analytics

## API Endpoints

### Payment Verification

```http
POST /verify
Content-Type: application/json

{
  "signature": "transaction-signature",
  "expectedAmount": "0.001",
  "recipient": "wallet-address"
}
```

### Payment Routing

```http
POST /route
{
  "from": "source-wallet",
  "to": "destination-wallet",
  "amount": "0.001",
  "asset": "SOL"
}

GET /route/:routeId
```

### Multi-Hop Routes

```http
POST /routes/create
{
  "sourceService": "service-a",
  "targetService": "service-b",
  "amount": "0.001",
  "asset": "SOL",
  "hops": ["service-c"]
}

POST /routes/:routeId/execute
POST /routes/:routeId/complete
GET /routes/stats
```

### Escrow

```http
POST /escrow/create
{
  "buyer": "buyer-wallet",
  "seller": "seller-wallet",
  "amount": "1.0",
  "asset": "SOL",
  "condition": "delivery-confirmation"
}

GET /escrow/:escrowId
POST /escrow/:escrowId/fund
POST /escrow/:escrowId/release
POST /escrow/:escrowId/refund
GET /escrow/stats
```

### Webhooks

```http
POST /notify
{
  "webhookUrl": "https://service.com/webhook",
  "event": "payment.completed",
  "data": {...}
}
```

### Health & Metrics

```http
GET /health
GET /metrics
```

## Environment Variables

```bash
PORT=4001
HOST=0.0.0.0
REDIS_URL=redis://localhost:6379
SOLANA_RPC_URL=https://api.devnet.solana.com
LOG_LEVEL=info
```

## Running

```bash
npm install
npm run build
npm start
```

## Docker

```bash
docker build -t x402-facilitator .
docker run -p 4001:4001 -e REDIS_URL=redis://redis:6379 x402-facilitator
```

## License

Apache-2.0
