# x402 Fastify Service

Production-ready x402-enabled API service built with Fastify, TAP authentication, and automatic registry integration.

## Features

- Fastify high-performance HTTP server
- x402 payment verification plugin
- TAP (Trusted Agent Protocol) authentication
- Automatic service registration with x402 registry
- Redis-backed signature store for horizontal scalability
- CASH token support (TOKEN_2022)
- TypeScript with strict type checking
- Pino structured logging
- Production-grade error handling

## Prerequisites

- Node.js 18+
- Redis (required for production)
- Solana wallet for treasury
- x402 registry access

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
NETWORK=devnet
TREASURY_WALLET=your_wallet_address_here
REDIS_URL=redis://localhost:6379

ENABLE_TAP=false
REGISTRY_URL=https://registry.x402.network

AUTO_REGISTER_SERVICE=false
SERVICE_URL=https://api.example.com
SERVICE_NAME=My x402 Fastify Service
SERVICE_DESCRIPTION=Production-ready x402-enabled Fastify service
SERVICE_CATEGORY=API
SERVICE_PRICE=0.01
ACCEPTED_TOKENS=CASH,USDC,SOL
```

### 3. Run Development Server

```bash
npm run dev
```

The service runs on `http://localhost:3000`.

### 4. Test Payment Flow

```bash
curl http://localhost:3000/api/example
```

Returns 402 Payment Required with payment requirements.

## Project Structure

```
fastify/
├── src/
│   ├── routes/
│   │   └── example.ts             # Example x402-protected routes
│   ├── x402/
│   │   ├── registry-client.ts     # x402 registry integration
│   │   └── tap-middleware.ts      # TAP signature verification
│   ├── config.ts                  # Environment configuration
│   └── index.ts                   # Server initialization
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies
```

## API Endpoints

### Protected Endpoints

**POST /api/example**
- Requires x402 payment
- Price: 0.01 CASH (configurable)
- Accepts JSON body
- Returns processed data with TAP verification status

**GET /api/example**
- Requires x402 payment
- Price: 0.01 CASH
- Returns success message with TAP status

### Public Endpoints

**GET /health**
- Health check endpoint
- No payment required
- Returns service status

## TAP Authentication

Enable TAP authentication in `.env`:

```env
ENABLE_TAP=true
```

The middleware automatically:
- Verifies RFC 9421 HTTP message signatures
- Validates Ed25519 signatures
- Caches public keys (1 hour TTL)
- Extracts agent identity (DID, certificate, wallet)
- Adds TAP headers to request context

Access TAP data in routes:

```typescript
fastify.post('/example', async (request, reply) => {
  const tapVerified = request.headers['x-tap-verified'] === 'true';
  const agentDid = request.headers['x-tap-did'];
  const agentCert = request.headers['x-tap-cert'];
  const agentWallet = request.headers['x-tap-wallet'];

  return reply.send({ tapVerified, agentDid });
});
```

## Registry Integration

Enable automatic registration:

```env
AUTO_REGISTER_SERVICE=true
SERVICE_URL=https://api.example.com
SERVICE_NAME=My Fastify Service
```

The service automatically:
- Registers on startup
- Sends periodic heartbeats (every 60s)
- Reports metrics
- Updates status to PAUSED on shutdown

## Adding Protected Routes

Create a new route file in `src/routes/`:

```typescript
import { FastifyPluginAsync } from 'fastify';

const customRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/custom', async (request, reply) => {
    const body = request.body;

    return reply.send({
      success: true,
      data: body,
    });
  });
};

export default customRoutes;
```

Register the route in `src/index.ts`:

```typescript
import customRoutes from './routes/custom.js';

await fastify.register(customRoutes, { prefix: '/api' });
```

All routes automatically require x402 payment through the global hook.

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t x402-fastify-service .
docker run -p 3000:3000 --env-file .env x402-fastify-service
```

### Environment Variables

Production environment requires:
- `NETWORK=mainnet-beta`
- `REDIS_URL` (required for mainnet)
- `TREASURY_WALLET` (production wallet)
- `SERVICE_URL` (public HTTPS URL)

## Performance

Fastify is optimized for high performance:
- Low overhead routing
- Schema-based validation
- Efficient serialization
- Plugin architecture

Recommended for:
- High-throughput APIs
- Latency-sensitive services
- Microservices architecture

## Monitoring

The service uses Pino for structured logging:

```typescript
fastify.log.info({ serviceId }, 'Service registered');
fastify.log.error({ error }, 'Payment verification failed');
```

In production, pipe logs to external monitoring:

```bash
npm start | pino-elasticsearch
```

## Security

- Redis required for mainnet (horizontal scaling)
- TAP signatures expire after 5 minutes
- Public keys cached with TTL
- Helmet security headers enabled
- CORS configurable via environment

## Support

- Documentation: https://collinsville22.github.io/x402-upl
- Registry: https://registry.x402.network
- Issues: https://github.com/x402-upl/issues
