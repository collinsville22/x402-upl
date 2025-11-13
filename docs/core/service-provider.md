# Service Provider Guide

Complete guide to building and deploying x402-enabled services that accept micropayments on Solana.

## Overview

This guide walks you through creating a production-ready API service that accepts SOL, USDC, or CASH payments using the x402 protocol. You'll learn how to implement HTTP 402 Payment Required, verify on-chain transactions, and integrate with the x402 ecosystem.

**What You'll Build:**
- RESTful API with x402 payment protection
- Multiple paid endpoints with different pricing
- On-chain payment verification
- Service registration in x402 registry
- Production deployment setup

## Quick Start

### 1. Install Dependencies

```bash
npm install @x402-upl/core @solana/web3.js express cors dotenv
```

### 2. Create Basic Service

```typescript
import express from 'express';
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';

const app = express();
app.use(express.json());

// Configure X402 middleware
const x402 = createX402Middleware({
  config: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    treasuryWallet: new PublicKey('YOUR_WALLET_HERE'),
    acceptedTokens: [],
    timeout: 300000,
  },
  pricing: {
    '/api/data': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
  },
  onPaymentVerified: async (receipt) => {
    console.log('Payment received:', receipt.transactionId);
  },
});

// Apply middleware
app.use('/api', x402);

// Protected endpoint
app.get('/api/data', (req, res) => {
  res.json({ data: 'Your valuable data here' });
});

app.listen(3000, () => {
  console.log('Service running on http://localhost:3000');
});
```

### 3. Test Your Service

```bash
# Start server
npm start

# Test with x402 CLI
x402 test http://localhost:3000/api/data
```

## Building a Complete Service

### Project Structure

```
my-x402-service/
├── src/
│   ├── server.ts           # Main server
│   ├── middleware/
│   │   └── x402.ts         # X402 configuration
│   ├── routes/
│   │   ├── weather.ts      # Weather endpoint
│   │   ├── sentiment.ts    # Sentiment analysis
│   │   └── index.ts        # Route registry
│   ├── services/
│   │   ├── payment.ts      # Payment tracking
│   │   └── analytics.ts    # Usage analytics
│   └── utils/
│       ├── validation.ts   # Input validation
│       └── errors.ts       # Error handling
├── .env.example
├── package.json
└── tsconfig.json
```

### Environment Configuration

Create `.env`:

```bash
# Network
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Treasury Wallet (receives payments)
TREASURY_WALLET=YOUR_SOLANA_PUBLIC_KEY

# Service Configuration
PORT=3000
SERVICE_NAME=My X402 Service
SERVICE_ID=svc_abc123

# X402 Infrastructure
FACILITATOR_URL=https://facilitator.x402.network
REGISTRY_URL=https://registry.x402.network

# Optional: Redis for replay protection (production)
REDIS_URL=redis://localhost:6379

# Optional: Database
DATABASE_URL=postgresql://localhost:5432/x402service
```

### Complete Server Implementation

```typescript
// src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';
import { weatherRoutes } from './routes/weather';
import { sentimentRoutes } from './routes/sentiment';
import { recordPayment } from './services/payment';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// X402 Middleware
const x402 = createX402Middleware({
  config: {
    network: (process.env.SOLANA_NETWORK as any) || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [],
    timeout: 300000,
    redisUrl: process.env.REDIS_URL,
  },
  pricing: {
    '/api/weather': { pricePerCall: 0.001, currency: 'USDC' },
    '/api/sentiment': { pricePerCall: 0.002, currency: 'USDC' },
    '/api/translate': { pricePerCall: 0.0015, currency: 'USDC' },
    '/api/analyze': { pricePerCall: 0.003, currency: 'USDC' },
  },
  onPaymentVerified: async (receipt) => {
    console.log('✅ Payment verified:', receipt.transactionId);

    // Record in database
    await recordPayment({
      transactionId: receipt.transactionId,
      amount: parseFloat(receipt.amount),
      token: receipt.asset,
      from: receipt.from,
      timestamp: new Date(receipt.timestamp),
    });

    // Notify facilitator
    try {
      await fetch(`${process.env.FACILITATOR_URL}/api/transactions/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: receipt.transactionId,
          amount: receipt.amount,
          token: receipt.asset,
          senderAddress: receipt.from,
          recipientAddress: process.env.TREASURY_WALLET,
          serviceId: process.env.SERVICE_ID,
          status: 'confirmed',
        }),
      });
    } catch (error) {
      console.error('Failed to notify facilitator:', error);
    }
  },
  onPaymentFailed: async (reason) => {
    console.error('❌ Payment failed:', reason);
  },
});

// Health check (free)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply X402 to all API routes
app.use('/api', x402);

// Routes
app.use('/api', weatherRoutes);
app.use('/api', sentimentRoutes);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Service running on http://localhost:${PORT}`);
  console.log(`💰 Treasury: ${process.env.TREASURY_WALLET}`);
  console.log(`🌐 Network: ${process.env.SOLANA_NETWORK}`);
});
```

### Route Implementation

```typescript
// src/routes/weather.ts
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const WeatherQuerySchema = z.object({
  location: z.string().min(1).max(100),
  units: z.enum(['metric', 'imperial']).optional(),
});

router.get('/weather', async (req, res) => {
  // Validate input
  const result = WeatherQuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: result.error.errors
    });
  }

  const { location, units = 'metric' } = result.data;

  // Fetch weather data (mock for example)
  const weatherData = {
    location,
    temperature: units === 'metric' ? 22 : 72,
    condition: 'sunny',
    humidity: 65,
    windSpeed: units === 'metric' ? 15 : 9,
    units,
    timestamp: new Date().toISOString(),
  };

  res.json(weatherData);
});

export const weatherRoutes = router;
```

### Payment Tracking

```typescript
// src/services/payment.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function recordPayment(data: {
  transactionId: string;
  amount: number;
  token: string;
  from: string;
  timestamp: Date;
}) {
  return await prisma.payment.create({
    data: {
      transactionId: data.transactionId,
      amount: data.amount,
      token: data.token,
      senderAddress: data.from,
      recipientAddress: process.env.TREASURY_WALLET!,
      status: 'confirmed',
      timestamp: data.timestamp,
    },
  });
}

export async function getPaymentStats() {
  const stats = await prisma.payment.aggregate({
    _sum: { amount: true },
    _count: true,
  });

  return {
    totalRevenue: stats._sum.amount || 0,
    totalPayments: stats._count,
  };
}
```

## Service Registration

### Register with X402 Registry

```bash
# Using CLI
x402 enable https://api.yourdomain.com \
  --name "My Weather API" \
  --description "Real-time weather data" \
  --category "Data Analytics" \
  --price 0.001 \
  --tokens USDC,CASH \
  --with-tap
```

### Programmatic Registration

```typescript
import { X402Client } from '@x402-upl/sdk';

const client = new X402Client({
  network: 'devnet',
  wallet: yourWallet,
});

await client.registerService({
  url: 'https://api.yourdomain.com',
  name: 'My Weather API',
  description: 'Real-time weather data for any location',
  category: 'Data Analytics',
  endpoints: [
    {
      path: '/api/weather',
      method: 'GET',
      pricing: { pricePerCall: 0.001, currency: 'USDC' },
      description: 'Get current weather',
    },
  ],
  tags: ['weather', 'data', 'api'],
});
```

## Production Deployment

### Environment Variables

```bash
# Production .env
NODE_ENV=production
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TREASURY_WALLET=your_mainnet_wallet
REDIS_URL=redis://production-redis:6379
DATABASE_URL=postgresql://prod-db/x402service
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SOLANA_NETWORK=mainnet-beta
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: x402service
      POSTGRES_PASSWORD: password
```

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set SOLANA_NETWORK=mainnet-beta
railway variables set TREASURY_WALLET=your_wallet
railway variables set REDIS_URL=redis://redis:6379

# Deploy
railway up
```

### Deploy to Vercel (Serverless)

```typescript
// api/weather.ts - Serverless function
import { VercelRequest, VercelResponse } from '@vercel/node';
import { withX402Next } from '@x402-upl/core';

async function handler(req: VercelRequest, res: VercelResponse) {
  const { location } = req.query;

  res.json({
    location,
    temperature: 72,
    condition: 'sunny',
  });
}

export default withX402Next(handler, {
  config: {
    network: 'mainnet-beta',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [],
    timeout: 300000,
  },
  pricing: {
    pricePerCall: 0.001,
    currency: 'USDC',
  },
});
```

## Monitoring & Analytics

### Track Revenue

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getRevenueMetrics(period: 'day' | 'week' | 'month') {
  const since = new Date();
  if (period === 'day') since.setDate(since.getDate() - 1);
  if (period === 'week') since.setDate(since.getDate() - 7);
  if (period === 'month') since.setMonth(since.getMonth() - 1);

  const payments = await prisma.payment.findMany({
    where: {
      timestamp: { gte: since },
      status: 'confirmed',
    },
  });

  return {
    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
    totalPayments: payments.length,
    averagePayment: payments.length > 0
      ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
      : 0,
    byEndpoint: groupByEndpoint(payments),
  };
}
```

### Health Monitoring

```typescript
app.get('/metrics', async (req, res) => {
  const stats = await getPaymentStats();
  const health = await checkSystemHealth();

  res.json({
    service: {
      name: process.env.SERVICE_NAME,
      version: '1.0.0',
      uptime: process.uptime(),
    },
    payments: {
      total: stats.totalPayments,
      revenue: stats.totalRevenue,
    },
    health: {
      database: health.database,
      redis: health.redis,
      solana: health.solana,
    },
  });
});
```

## Best Practices

### 1. Input Validation

Always validate user input:

```typescript
import { z } from 'zod';

const RequestSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(100).optional(),
});

app.post('/api/search', (req, res) => {
  const result = RequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Process validated data
  const { query, limit } = result.data;
});
```

### 2. Error Handling

Provide clear error messages:

```typescript
app.use((err: any, req: any, res: any, next: any) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'PaymentError') {
    return res.status(402).json({
      error: 'Payment required',
      details: err.message
    });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
```

### 3. Rate Limiting

Protect your service:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP',
});

app.use('/api', limiter);
```

### 4. Logging

Comprehensive logging:

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

onPaymentVerified: async (receipt) => {
  logger.info({
    event: 'payment_verified',
    transactionId: receipt.transactionId,
    amount: receipt.amount,
    from: receipt.from,
  });
},
```

### 5. Security Headers

Use helmet for security:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
```

## Testing

### Unit Tests

```typescript
import request from 'supertest';
import app from './server';

describe('Weather API', () => {
  it('returns 402 without payment', async () => {
    const res = await request(app)
      .get('/api/weather?location=NYC');

    expect(res.status).toBe(402);
    expect(res.body).toHaveProperty('payTo');
    expect(res.body).toHaveProperty('amount');
  });

  it('returns data with valid payment', async () => {
    const paymentProof = await createTestPayment();

    const res = await request(app)
      .get('/api/weather?location=NYC')
      .set('X-Payment', paymentProof);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('temperature');
  });
});
```

### Integration Tests

```typescript
describe('Payment Flow', () => {
  it('completes full payment cycle', async () => {
    // 1. Request without payment
    const res1 = await request(app).get('/api/weather');
    expect(res1.status).toBe(402);

    // 2. Create payment
    const payment = await createSolanaPayment(res1.body);

    // 3. Retry with payment
    const res2 = await request(app)
      .get('/api/weather')
      .set('X-Payment', payment);

    expect(res2.status).toBe(200);
  });
});
```

## Troubleshooting

### Payment Verification Fails

Check RPC endpoint and wallet configuration:

```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const balance = await connection.getBalance(treasuryWallet);

console.log('Treasury balance:', balance / 1e9, 'SOL');
```

### Redis Connection Issues

Verify Redis is accessible:

```bash
redis-cli ping
# Should return: PONG
```

### Service Not Discoverable

Ensure service is registered:

```bash
x402 discover --query "your service name"
```

## Related Documentation

- [X042 Core Middleware](./x042-middleware.md) - Middleware reference
- [CLI Tool](./cli.md) - Service management commands
- [JavaScript SDK](../sdks/javascript.md) - Client library

## Support

- [GitHub Repository](https://github.com/collinsville22/x402-upl)
- [GitHub Issues](https://github.com/collinsville22/x402-upl/issues)
