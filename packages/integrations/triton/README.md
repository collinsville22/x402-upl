# Old Faithful x402 Integration

Production-grade integration of x402 Universal Payment Layer with Old Faithful RPC, enabling sustainable monetization of Solana's complete historical blockchain data through HTTP 402 payments, Visa TAP authentication, and CASH micropayments.

## Architecture

- **Old Faithful RPC Proxy**: Fastify-based HTTP proxy with TAP authentication and HTTP 402 payment enforcement
- **Payment System**: On-chain CASH payment verification with automatic cost calculation
- **Service Registry**: Auto-registration of RPC methods in x402 marketplace
- **gRPC Interceptor**: Rust-based quota management for Yellowstone streaming subscriptions

## Features

- TAP (Trusted Agent Protocol) authentication with RFC 9421 HTTP signatures
- HTTP 402 Payment Required enforcement with CASH token verification
- Dynamic pricing based on data volume, age, and query complexity
- Automatic x402 Service Registry integration
- gRPC streaming with quota-based billing
- Production-ready monitoring and metrics
- Tiered subscription model (Free, Developer, Professional, Enterprise)

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file:

```env
PORT=3002
HOST=0.0.0.0
OLD_FAITHFUL_URL=http://localhost:8899
PAYMENT_RECIPIENT=YourSolanaWalletAddress
TAP_REGISTRY_URL=http://localhost:8001
X402_REGISTRY_URL=http://localhost:3001
SOLANA_RPC_URL=https://api.devnet.solana.com
RATE_LIMIT_PER_MINUTE=100
```

## Usage

### Start RPC Proxy

```bash
npm run start:proxy
```

### Client Integration

```typescript
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import axios from 'axios';

const tapAgent = new VisaTAPAgent({
  registryUrl: 'http://localhost:8001',
  name: 'My Client',
  domain: 'client.x402.local',
  algorithm: 'ed25519',
});

await tapAgent.register();

const rpcRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getBlock',
  params: [100000],
};

const headers = await tapAgent.signRequest('POST', '/', rpcRequest);

const response = await axios.post('http://localhost:3002', rpcRequest, {
  headers,
  validateStatus: () => true,
});

if (response.status === 402) {
  const paymentData = response.data.error.data;

  // Execute CASH payment on-chain
  // ...

  // Retry with payment proof
  headers['X-Payment-Proof'] = JSON.stringify(proof);
  const retryResponse = await axios.post('http://localhost:3002', rpcRequest, { headers });
}
```

## Pricing Model

### RPC Methods

| Method | Base Price | Volume Multiplier | Age Multiplier |
|--------|-----------|-------------------|----------------|
| getBlock | 0.0001 CASH | 0.00001 per tx | Yes |
| getTransaction | 0.00005 CASH | None | Yes |
| getSignaturesForAddress | 0.0001 CASH | 0.000001 per sig | None |
| getBlockTime | 0.00001 CASH | None | Yes |
| getGenesisHash | 0.000005 CASH | None | No |
| getVersion | 0.000005 CASH | None | No |
| getSlot | 0.000005 CASH | None | No |

### Age Multipliers

- Recent data (<30 days): 1x
- Historical data (30-180 days): 2x
- Archive data (>180 days): 5x

### Formula

```
Total Cost = (Base Cost + Volume Cost) × Age Multiplier
```

## gRPC Streaming Quotas

### Subscription Tiers

| Tier | Max Filters | Accounts/Filter | Bytes per CASH |
|------|------------|-----------------|----------------|
| Free | 1 | 10 | 1 MB |
| Developer | 5 | 100 | 1 MB |
| Professional | 20 | 1,000 | 1 MB |
| Enterprise | 100 | 10,000 | 1 MB |

### Rust Interceptor Integration

```rust
use yellowstone_x402_interceptor::{X402Interceptor, QuotaTier};

let interceptor = X402Interceptor::new(
    "http://localhost:8001".to_string(),
    "https://api.devnet.solana.com".to_string(),
    "YourWalletAddress".to_string(),
);

// Verify subscription with payment proof
let client_id = interceptor.verify_subscription(&metadata).await?;

// Check quota before streaming
interceptor.check_quota(&client_id, data_size).await?;

// Get current usage
let usage = interceptor.get_quota_usage(&client_id).await;
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns proxy status, uptime, and metrics.

### Pricing Information

```bash
GET /pricing
```

Returns all pricing tiers and payment recipient.

### Metrics

```bash
GET /metrics
```

Returns revenue, request counts, and performance metrics.

## Testing

```bash
npm test
```

### Test Coverage

- Pricing engine with age multipliers
- Payment verification logic
- TAP signature parsing
- Quota management
- Service registry integration

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  old-faithful-proxy:
    build: .
    ports:
      - "3002:3002"
    environment:
      - OLD_FAITHFUL_URL=http://old-faithful:8899
      - PAYMENT_RECIPIENT=${PAYMENT_RECIPIENT}
      - TAP_REGISTRY_URL=http://tap-registry:8001
      - X402_REGISTRY_URL=http://x402-registry:3001
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
    depends_on:
      - old-faithful
      - tap-registry
      - x402-registry
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: old-faithful-x402-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: old-faithful-proxy
  template:
    metadata:
      labels:
        app: old-faithful-proxy
    spec:
      containers:
      - name: proxy
        image: x402-upl/old-faithful-proxy:latest
        ports:
        - containerPort: 3002
        env:
        - name: OLD_FAITHFUL_URL
          value: "http://old-faithful:8899"
        - name: PAYMENT_RECIPIENT
          valueFrom:
            secretKeyRef:
              name: x402-secrets
              key: payment-recipient
```

## Monitoring

### Prometheus Metrics

```
# Total requests processed
old_faithful_proxy_requests_total

# Revenue in CASH
old_faithful_proxy_revenue_cash

# Payment success rate
old_faithful_proxy_payment_success_rate

# Average request cost
old_faithful_proxy_avg_cost_cash

# Cache hit ratio
old_faithful_proxy_cache_hit_ratio
```

### Grafana Dashboard

Import the included `grafana-dashboard.json` for pre-configured visualizations.

## Security

- TAP signature verification with nonce-based replay prevention
- On-chain payment verification only (no off-chain trust)
- Rate limiting per identity and IP
- DDoS protection via Cloudflare integration
- Audit logging of all transactions

## Performance Targets

- Request latency: <100ms p50, <500ms p99
- Payment verification: <2s average
- Throughput: 1000 RPC req/s per instance
- Streaming: 10,000 concurrent subscriptions
- Uptime: 99.9% SLA

## License

MIT

## Support

For issues and questions, visit the [GitHub repository](https://github.com/x402-upl/integrations).
