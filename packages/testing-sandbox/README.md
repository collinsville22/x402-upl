# x402 Testing Sandbox

Enterprise-grade testing environment for x402 protocol with automatic refunds and real blockchain transactions.

## Features

- Real Solana devnet transactions (not mocks)
- Automatic payment refunds within 30 seconds
- Multiple test endpoints with varied pricing
- Rate limiting and CORS enabled
- Comprehensive metrics and monitoring
- Redis-backed refund queue
- Production-ready architecture

## Quick Start

### 1. Generate Refund Wallet

```bash
node -e "const {Keypair} = require('@solana/web3.js'); const k = Keypair.generate(); console.log('REFUND_WALLET_KEYPAIR=' + Buffer.from(k.secretKey).toString('base64')); console.log('Address:', k.publicKey.toBase58());"
```

### 2. Fund Wallet

Send SOL and USDC to the generated address on Solana devnet:
- Use https://faucet.solana.com for SOL
- Use https://spl-token-faucet.com for USDC

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your REFUND_WALLET_KEYPAIR
```

### 4. Start Server

```bash
npm install
npm run dev
```

Server runs on http://localhost:4000

## Available Endpoints

All endpoints require x402 payment and automatically refund within 30 seconds.

### GET /endpoints

List all available test endpoints with pricing and examples.

```bash
curl http://localhost:4000/endpoints
```

### POST /echo

Price: 0.001 SOL

Echo service that returns your input with metadata.

```bash
curl -X POST http://localhost:4000/echo \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello x402"}'
```

### GET /random-data

Price: 0.005 SOL

Generate random test data for validation.

```bash
curl http://localhost:4000/random-data
```

### GET /weather

Price: 0.002 SOL

Mock weather data for testing.

```bash
curl http://localhost:4000/weather
```

### POST /analytics

Price: 0.01 SOL

Process analytics data with statistical calculations.

```bash
curl -X POST http://localhost:4000/analytics \
  -H "Content-Type: application/json" \
  -d '{"data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}'
```

### GET /crypto-price

Price: 0.003 SOL

Mock cryptocurrency price data.

```bash
curl http://localhost:4000/crypto-price
```

### POST /ml-inference

Price: 0.02 SOL

Mock machine learning inference endpoint.

```bash
curl -X POST http://localhost:4000/ml-inference \
  -H "Content-Type: application/json" \
  -d '{"input": "Test input for classification"}'
```

### GET /blockchain-data

Price: 0.015 SOL

Mock blockchain transaction data.

```bash
curl http://localhost:4000/blockchain-data
```

## Testing with x402 Client

### Using SDK

```typescript
import { SolanaX402Client } from '@x402-upl/sdk';
import { Keypair } from '@solana/web3.js';

const wallet = Keypair.fromSecretKey(...);
const client = new SolanaX402Client({
  wallet,
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
});

const response = await client.get('http://localhost:4000/weather');
console.log(response.data);

const refundStatus = await fetch(`http://localhost:4000/refund/${response.signature}`);
console.log('Refund status:', await refundStatus.json());
```

### Using CLI

```bash
x402 pay http://localhost:4000/weather --network devnet
```

## Monitoring

### GET /health

Server health check.

```bash
curl http://localhost:4000/health
```

### GET /stats

Comprehensive statistics including refund metrics and wallet balance.

```bash
curl http://localhost:4000/stats
```

Response:
```json
{
  "refunds": {
    "totalRefunds": 150,
    "totalAmount": 0.75,
    "successfulRefunds": 148,
    "failedRefunds": 2,
    "averageRefundTimeMs": 15000
  },
  "wallet": {
    "address": "...",
    "balance": {
      "sol": 10.5,
      "usdc": 100.0
    }
  },
  "uptime": 86400,
  "network": "devnet"
}
```

### GET /refund/:signature

Check refund status for a specific transaction.

```bash
curl http://localhost:4000/refund/5xJ8...abc
```

## Architecture

```
┌─────────────┐
│   Client    │
│  (x402 SDK) │
└──────┬──────┘
       │ HTTP Request with x-payment header
       ▼
┌─────────────────────────┐
│  Testing Sandbox Server │
│  - Payment verification │
│  - Endpoint execution   │
│  - Refund recording     │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│   Refund Processor      │
│  - Queue processing     │
│  - On-chain verification│
│  - Automatic refunds    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│   Solana Blockchain     │
│  - Payment settlement   │
│  - Refund transactions  │
└─────────────────────────┘
```

## Refund Process

1. Client sends request with x402 payment
2. Server verifies payment on Solana devnet
3. Server executes endpoint and returns response
4. Payment recorded in Redis refund queue
5. Refund processor (5s interval) processes queue
6. Original transaction verified on-chain
7. Refund sent back to payer address
8. Refund status updated (pending → refunded)

Average refund time: 15-30 seconds

## Configuration

### Environment Variables

- `PORT` - Server port (default: 4000)
- `HOST` - Server host (default: 0.0.0.0)
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `NETWORK` - Solana network (devnet/mainnet-beta)
- `REFUND_WALLET_KEYPAIR` - Base64 encoded keypair for refunds
- `REDIS_URL` - Redis connection string
- `RATE_LIMIT_MAX` - Max requests per window (default: 100)
- `RATE_LIMIT_WINDOW` - Rate limit window in ms (default: 60000)
- `LOG_LEVEL` - Logging level (default: info)
- `CORS_ORIGIN` - CORS origin (default: *)
- `ENABLE_REFUNDS` - Enable automatic refunds (default: true)

### Rate Limiting

Default: 100 requests per 60 seconds per IP

Adjust via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` environment variables.

## Production Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  sandbox:
    build: .
    ports:
      - "4000:4000"
    environment:
      - REFUND_WALLET_KEYPAIR=${REFUND_WALLET_KEYPAIR}
      - REDIS_URL=redis://redis:6379
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: x402-sandbox
spec:
  replicas: 3
  selector:
    matchLabels:
      app: x402-sandbox
  template:
    metadata:
      labels:
        app: x402-sandbox
    spec:
      containers:
      - name: sandbox
        image: x402-sandbox:latest
        ports:
        - containerPort: 4000
        env:
        - name: REFUND_WALLET_KEYPAIR
          valueFrom:
            secretKeyRef:
              name: x402-secrets
              key: refund-keypair
        - name: REDIS_URL
          value: redis://redis-service:6379
```

## Security

- All payments verified on-chain
- Rate limiting prevents abuse
- Refund wallet has limited funds
- Redis signature deduplication
- CORS configuration
- Input validation with Zod

## Monitoring & Alerts

### Metrics to Track

- Total refunds processed
- Refund success rate
- Average refund time
- Wallet balance (SOL/USDC)
- Request rate
- Error rate

### Recommended Alerts

- Wallet balance < 1 SOL
- Refund failure rate > 5%
- Average refund time > 60s
- Request rate > 1000/min

## Troubleshooting

### Refunds Not Processing

Check refund processor is running:
```bash
curl http://localhost:4000/stats
```

Verify wallet has sufficient balance:
```bash
solana balance <REFUND_WALLET_ADDRESS> --url devnet
```

### Payment Verification Failed

Ensure client is using correct network (devnet)
Check RPC endpoint is responsive
Verify transaction signature is valid

### High Latency

Check Redis connection
Verify Solana RPC performance
Scale horizontally with load balancer

## Support

- Documentation: https://docs.x402.network
- GitHub: https://github.com/x402-upl/x402
- Discord: https://discord.gg/x402

## License

MIT
