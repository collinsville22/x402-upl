# x402 Next.js Service

Production-ready x402-enabled API service built with Next.js App Router, TAP authentication, and automatic registry integration.

## Features

- Next.js 14+ App Router with API routes
- x402 payment verification middleware
- TAP (Trusted Agent Protocol) authentication
- Automatic service registration with x402 registry
- Redis-backed signature store for horizontal scalability
- CASH token support (TOKEN_2022)
- TypeScript with strict type checking
- Production-grade error handling and logging

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

Copy `.env.example` to `.env.local` and configure:

```env
NETWORK=devnet
TREASURY_WALLET=your_wallet_address_here
REDIS_URL=redis://localhost:6379

ENABLE_TAP=false
REGISTRY_URL=https://registry.x402.network

AUTO_REGISTER_SERVICE=false
SERVICE_URL=https://api.example.com
SERVICE_NAME=My x402 Next.js Service
SERVICE_DESCRIPTION=Production-ready x402-enabled Next.js API
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
nextjs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── example/
│   │   │   │   └── route.ts       # Example x402-protected API route
│   │   │   └── health/
│   │   │       └── route.ts       # Health check endpoint
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   ├── lib/
│   │   ├── config.ts              # Environment configuration
│   │   └── x402/
│   │       ├── registry-client.ts # x402 registry integration
│   │       └── tap-middleware.ts  # TAP signature verification
│   └── middleware.ts              # Next.js middleware with x402 + TAP
├── next.config.mjs                # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies
```

## API Endpoints

### Protected Endpoints

**POST /api/example**
- Requires x402 payment
- Price: 0.01 CASH (configurable)
- Accepts JSON body

**GET /api/example**
- Requires x402 payment
- Price: 0.005 CASH
- Query string supported

### Public Endpoints

**GET /api/health**
- Health check endpoint
- No payment required

## TAP Authentication

Enable TAP authentication in `.env.local`:

```env
ENABLE_TAP=true
```

The middleware automatically:
- Verifies RFC 9421 HTTP message signatures
- Validates Ed25519 signatures
- Caches public keys (1 hour TTL)
- Extracts agent identity (DID, certificate, wallet)
- Propagates TAP headers to route handlers

## Registry Integration

Enable automatic registration:

```env
AUTO_REGISTER_SERVICE=true
SERVICE_URL=https://api.example.com
SERVICE_NAME=My Next.js Service
```

The service automatically:
- Registers on startup
- Sends periodic heartbeats
- Reports metrics
- Updates status on shutdown

## Adding Protected Routes

Use `withX402` to protect any API route:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402-upl/core/nextjs';
import { config } from '@/lib/config';

export const POST = withX402(
  async (request: NextRequest) => {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      data: body
    });
  },
  {
    price: 0.02,
    asset: 'CASH',
    description: 'My custom endpoint',
  },
  {
    network: config.NETWORK,
    treasuryWallet: config.TREASURY_WALLET,
    redisUrl: config.REDIS_URL,
  }
);
```

## Edge Runtime Support

The middleware is compatible with Next.js Edge Runtime:

```typescript
export const runtime = 'edge';

export const POST = withX402(
  async (request: NextRequest) => {
    return NextResponse.json({ message: 'Running on edge' });
  },
  { price: 0.01, asset: 'CASH' },
  { network: 'devnet', treasuryWallet: WALLET }
);
```

## Production Deployment

### Vercel

```bash
npm run build
vercel deploy
```

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

### Environment Variables

Production environment requires:
- `NETWORK=mainnet-beta`
- `REDIS_URL` (required for mainnet)
- `TREASURY_WALLET` (production wallet)
- `SERVICE_URL` (public HTTPS URL)

## Monitoring

The service logs:
- Payment verifications
- TAP signature validations
- Registry interactions
- Error conditions

Use structured logging with Pino for production monitoring.

## Security

- Redis required for mainnet (horizontal scaling)
- TAP signatures expire after 5 minutes
- Public keys cached with TTL
- Rate limiting recommended (not included)
- CORS configured via Next.js config

## Support

- Documentation: https://collinsville22.github.io/x402-upl
- Registry: https://registry.x402.network
- Issues: https://github.com/x402-upl/issues
