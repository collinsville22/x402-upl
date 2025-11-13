# X042 Core Middleware

Solana-compatible HTTP 402 Payment Required middleware for Express, Fastify, Next.js, Koa, and NestJS with on-chain transaction verification.

## Overview

X042 Core is the foundational payment middleware package that brings HTTP 402 Payment Required protocol to Solana blockchain. While the official `x402-express` middleware only supports EVM chains (Ethereum, Base), X042 Core provides a complete Solana implementation with on-chain verification, SPL token support, and multi-framework compatibility.

**Why X042 Core?**
- **Solana Native**: Built specifically for Solana blockchain with Ed25519 signatures
- **Multi-Framework**: Works with Express, Fastify, Next.js, Koa, and NestJS
- **Production Ready**: Redis-backed replay protection, transaction finality checks, and comprehensive error handling
- **SPL Token Support**: Accept payments in SOL, USDC, CASH, or any SPL token
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

The middleware handles the complete payment flow: returning 402 Payment Required responses, verifying on-chain transactions, preventing replay attacks, and providing payment receipts.

## Features

### Multi-Framework Support
- **Express**: Standard Express middleware
- **Fastify**: Native Fastify plugin architecture
- **Next.js**: API route middleware with App Router support
- **Koa**: Koa-style middleware with context support
- **NestJS**: Dependency injection with decorators and interceptors

### Payment Verification
- **On-Chain Verification**: Real Solana RPC transaction lookups
- **Ed25519 Signatures**: Cryptographic signature validation
- **Transaction Finality**: Ensures transactions are confirmed on-chain
- **Amount Verification**: Validates payment amount matches requirements
- **Recipient Verification**: Confirms payment sent to correct wallet

### Replay Protection
- **Redis-Backed**: Production-ready signature storage
- **In-Memory Fallback**: Development mode without Redis
- **TTL Support**: Automatic signature expiration
- **Distributed Safe**: Works across multiple server instances

### SPL Token Support
- **SOL**: Native Solana payments
- **USDC**: Circle USD stablecoin
- **CASH**: Phantom USD-pegged Token-2022
- **Custom Tokens**: Configure any SPL token mint

### Flexible Pricing
- **Per-Route Pricing**: Different prices for different endpoints
- **Global Pricing**: Single price for all protected routes
- **Dynamic Pricing**: Programmatic price calculation
- **Multi-Currency**: Support multiple token types

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Client Application                     │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  1. Initial       │
         │  Request          │
         │  (No Payment)     │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────────────────────────────────┐
         │  X042 Middleware                              │
         │  ┌──────────────────────────────────────────┐ │
         │  │ Check for X-Payment header               │ │
         │  │ Not found? Return 402 Payment Required   │ │
         │  └──────────────────────────────────────────┘ │
         └─────────┬─────────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  2. 402 Response  │
         │  Payment Required │
         │  + Requirements   │
         └─────────┬─────────┘
                   │
┌──────────────────▼───────────────────┐
│  Client Creates Solana Transaction  │
│  - Transfers SPL tokens              │
│  - Signs with private key            │
│  - Submits to network                │
└──────────────────┬───────────────────┘
                   │
         ┌─────────▼─────────┐
         │  3. Retry Request │
         │  + X-Payment      │
         │  header with sig  │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────────────────────────────────┐
         │  X042 Middleware Payment Verification         │
         │  ┌──────────────────────────────────────────┐ │
         │  │ 1. Parse X-Payment payload               │ │
         │  │ 2. Check replay protection (Redis)       │ │
         │  │ 3. Fetch transaction from Solana RPC     │ │
         │  │ 4. Verify transaction succeeded          │ │
         │  │ 5. Validate sender/recipient/amount      │ │
         │  │ 6. Confirm transaction finality          │ │
         │  │ 7. Store signature in Redis (prevent     │ │
         │  │    replay)                                │ │
         │  │ 8. Generate payment receipt              │ │
         │  └──────────────────────────────────────────┘ │
         └─────────┬─────────────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │ Valid?                  │
      └──┬───────────────────┬──┘
         │ Yes               │ No
         │                   │
         ▼                   ▼
┌────────────────┐   ┌────────────────┐
│ 4. Call next() │   │ 5. Return 400  │
│ Allow request  │   │ Payment Failed │
└────────┬───────┘   └────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Protected Route Handler │
│  Returns actual data     │
└──────────────────────────┘
```

### Component Architecture

**PaymentVerifier**
- Fetches transactions from Solana RPC
- Validates transaction structure and status
- Verifies payment amount and recipient
- Generates cryptographic receipts

**SignatureStore**
- Redis implementation for production
- In-memory implementation for development
- TTL-based automatic expiration
- Distributed consensus support

**Framework Adapters**
- Express: Standard req/res/next middleware
- Fastify: Plugin with decorators and hooks
- Next.js: API route wrappers
- Koa: Context-based middleware
- NestJS: Injectable services with decorators

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- TypeScript 5.0+ (recommended)
- Redis server (production deployments)
- Solana RPC endpoint

### Install Package

```bash
npm install @x402-upl/core @solana/web3.js @solana/spl-token
```

### Install Framework

```bash
# Express
npm install express @types/express

# Fastify
npm install fastify

# Next.js
npm install next

# Koa
npm install koa @koa/router @types/koa

# NestJS
npm install @nestjs/common @nestjs/core
```

### Redis Setup (Production)

```bash
# Local Redis
docker run -d -p 6379:6379 redis:7-alpine

# Or use managed Redis
# - Upstash
# - Redis Cloud
# - AWS ElastiCache
```

## Configuration

### Environment Variables

```bash
# Solana Network Configuration
SOLANA_NETWORK=devnet                    # or mainnet-beta, testnet
SOLANA_RPC_URL=https://api.devnet.solana.com
TREASURY_WALLET=YourSolanaWalletAddressHere

# Redis Configuration (Production)
REDIS_URL=redis://localhost:6379

# Accepted Tokens (SPL Token Mint Addresses)
ACCEPTED_TOKENS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC

# Payment Timeout (milliseconds)
PAYMENT_TIMEOUT=300000                   # 5 minutes
```

### X402Config Interface

```typescript
import { PublicKey } from '@solana/web3.js';

interface X402Config {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl: string;
  treasuryWallet: PublicKey;              // Your wallet to receive payments
  facilitatorPrivateKey?: Uint8Array;     // Optional: For facilitator services
  acceptedTokens: PublicKey[];            // SPL token mints to accept
  timeout: number;                        // Payment timeout in milliseconds
  redisUrl?: string;                      // Redis connection string (required for mainnet)
}
```

### ServicePricing Interface

```typescript
interface ServicePricing {
  pricePerCall: number;                   // Price in token units (e.g., 0.001 USDC)
  currency: 'USDC' | 'CASH' | 'SOL';     // Token type
  minPrice?: number;                      // Optional minimum price
  maxPrice?: number;                      // Optional maximum price
}
```

## Usage

### Express Middleware

Basic setup with Express:

```typescript
import express from 'express';
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';

const app = express();

// Configure middleware
const x402Middleware = createX402Middleware({
  config: {
    network: 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [
      new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
    ],
    timeout: 300000,
    redisUrl: process.env.REDIS_URL,
  },
  pricing: {
    pricePerCall: 0.001,
    currency: 'USDC',
  },
  onPaymentVerified: async (receipt) => {
    console.log('✅ Payment verified:', receipt.transactionId);
    console.log('Amount:', receipt.amount, receipt.asset);
    console.log('From:', receipt.from);
  },
  onPaymentFailed: async (reason) => {
    console.error('❌ Payment failed:', reason);
  },
});

// Apply to all routes
app.use('/api', x402Middleware);

// Protected endpoint
app.get('/api/weather', (req, res) => {
  res.json({
    temperature: 72,
    condition: 'sunny',
    location: 'San Francisco',
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Per-Route Pricing (Express)

Different prices for different endpoints:

```typescript
const x402Middleware = createX402Middleware({
  config: { /* ... */ },
  pricing: {
    '/api/weather': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
    '/api/sentiment': {
      pricePerCall: 0.002,
      currency: 'USDC',
    },
    '/api/analyze': {
      pricePerCall: 0.005,
      currency: 'USDC',
    },
  },
});

app.use(x402Middleware);

app.get('/api/weather', (req, res) => {
  // Costs 0.001 USDC
  res.json({ temp: 72 });
});

app.get('/api/sentiment', (req, res) => {
  // Costs 0.002 USDC
  res.json({ sentiment: 'positive', score: 0.85 });
});

app.get('/api/analyze', (req, res) => {
  // Costs 0.005 USDC
  res.json({ analysis: '...' });
});
```

### Fastify Plugin

Native Fastify integration:

```typescript
import Fastify from 'fastify';
import { PublicKey } from '@solana/web3.js';
import { createX402FastifyPlugin } from '@x402-upl/core';

const fastify = Fastify({ logger: true });

// Register X402 plugin
await fastify.register(createX402FastifyPlugin, {
  config: {
    network: 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [],
    timeout: 300000,
    redisUrl: process.env.REDIS_URL,
  },
  pricing: {
    '/weather': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
    '/price': {
      pricePerCall: 0.0015,
      currency: 'USDC',
    },
  },
  onPaymentVerified: async (receipt) => {
    fastify.log.info({ receipt }, 'Payment verified');
  },
});

// Protected routes
fastify.get('/weather', async (request, reply) => {
  return { temperature: 72, condition: 'sunny' };
});

fastify.get('/price', async (request, reply) => {
  return { symbol: 'SOL/USD', price: 98.50 };
});

await fastify.listen({ port: 3000 });
```

### Next.js API Routes

Protect Next.js API routes:

```typescript
// pages/api/weather.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PublicKey } from '@solana/web3.js';
import { withX402Next } from '@x402-upl/core';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    temperature: 72,
    condition: 'sunny',
  });
}

export default withX402Next(handler, {
  config: {
    network: 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [],
    timeout: 300000,
    redisUrl: process.env.REDIS_URL,
  },
  pricing: {
    pricePerCall: 0.001,
    currency: 'USDC',
  },
});
```

### Next.js App Router

For Next.js 13+ App Router:

```typescript
// app/api/weather/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { createX402NextMiddleware } from '@x402-upl/core';

const x402 = createX402NextMiddleware({
  config: {
    network: 'devnet',
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

export async function GET(request: NextRequest) {
  // Apply X402 middleware
  const middlewareResult = await x402(request);
  if (middlewareResult) {
    return middlewareResult; // Return 402 or 400 response
  }

  // Payment verified, return data
  return NextResponse.json({
    temperature: 72,
    condition: 'sunny',
  });
}
```

### Koa Middleware

Koa-style middleware:

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import { PublicKey } from '@solana/web3.js';
import { createX402KoaMiddleware } from '@x402-upl/core';

const app = new Koa();
const router = new Router();

const x402 = createX402KoaMiddleware({
  config: {
    network: 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [],
    timeout: 300000,
    redisUrl: process.env.REDIS_URL,
  },
  pricing: {
    '/api/weather': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
  },
});

// Apply middleware
app.use(x402);

router.get('/api/weather', async (ctx) => {
  ctx.body = { temperature: 72, condition: 'sunny' };
});

app.use(router.routes());
app.listen(3000);
```

### NestJS Module

Full NestJS integration with dependency injection:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { X402Module } from '@x402-upl/core';
import { PublicKey } from '@solana/web3.js';
import { WeatherController } from './weather.controller';

@Module({
  imports: [
    X402Module.forRoot({
      config: {
        network: 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL!,
        treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
        acceptedTokens: [],
        timeout: 300000,
        redisUrl: process.env.REDIS_URL,
      },
      pricing: {
        pricePerCall: 0.001,
        currency: 'USDC',
      },
    }),
  ],
  controllers: [WeatherController],
})
export class AppModule {}
```

```typescript
// weather.controller.ts
import { Controller, Get } from '@nestjs/common';
import { X402Protected, X402Receipt } from '@x402-upl/core';

@Controller('weather')
export class WeatherController {
  @Get()
  @X402Protected({
    pricePerCall: 0.001,
    currency: 'USDC',
  })
  async getWeather(@X402Receipt() receipt: any) {
    console.log('Payment receipt:', receipt);

    return {
      temperature: 72,
      condition: 'sunny',
    };
  }
}
```

## API Reference

### createX402Middleware (Express)

Create Express middleware for X402 payment protection.

```typescript
function createX402Middleware(options: X402MiddlewareOptions): RequestHandler
```

**Parameters:**

```typescript
interface X402MiddlewareOptions {
  config: X402Config;                                   // Network and wallet configuration
  pricing: ServicePricing | Record<string, ServicePricing>; // Global or per-route pricing
  onPaymentVerified?: (receipt: PaymentReceipt) => Promise<void>; // Success callback
  onPaymentFailed?: (reason: string) => Promise<void>;  // Failure callback
}
```

**Returns:** Express `RequestHandler` middleware function

**Example:**
```typescript
const middleware = createX402Middleware({
  config: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    treasuryWallet: new PublicKey('...'),
    acceptedTokens: [],
    timeout: 300000,
  },
  pricing: {
    pricePerCall: 0.001,
    currency: 'USDC',
  },
});
```

### createX402FastifyPlugin

Create Fastify plugin for X402 payment protection.

```typescript
function createX402FastifyPlugin(
  fastify: FastifyInstance,
  options: X402MiddlewareOptions
): Promise<void>
```

**Usage:**
```typescript
await fastify.register(createX402FastifyPlugin, {
  config: { /* ... */ },
  pricing: { /* ... */ },
});
```

### withX402Next

Wrap Next.js API route handler with X402 protection.

```typescript
function withX402Next(
  handler: NextApiHandler,
  options: X402MiddlewareOptions
): NextApiHandler
```

**Example:**
```typescript
export default withX402Next(myHandler, {
  config: { /* ... */ },
  pricing: { pricePerCall: 0.001, currency: 'USDC' },
});
```

### createX402KoaMiddleware

Create Koa middleware for X402 payment protection.

```typescript
function createX402KoaMiddleware(
  options: X402MiddlewareOptions
): Koa.Middleware
```

### X402Module (NestJS)

NestJS module providing X402 services and decorators.

**Module Registration:**
```typescript
X402Module.forRoot(options: X402MiddlewareOptions)
```

**Decorators:**
```typescript
@X402Protected(pricing?: ServicePricing)  // Protect route with payment
@X402Receipt()                            // Inject payment receipt parameter
```

### PaymentVerifier

Low-level payment verification class.

```typescript
class PaymentVerifier {
  constructor(config: X402Config, signatureStore?: SignatureStore);

  async verifyPayment(
    payload: PaymentPayload,
    requiredAmount: number,
    requiredRecipient: PublicKey
  ): Promise<PaymentVerificationResult>;
}
```

**Methods:**

- `verifyPayment()`: Verify a payment transaction
  - Validates payload structure
  - Checks replay protection
  - Fetches transaction from Solana
  - Validates amount and recipient
  - Returns verification result with receipt

### SignatureStore

Replay protection storage interface.

```typescript
interface SignatureStore {
  has(signature: string): Promise<boolean>;
  add(signature: string, ttl: number): Promise<void>;
}
```

**Implementations:**

```typescript
// Redis-backed (production)
class RedisSignatureStore implements SignatureStore {
  constructor(redisUrl: string);
}

// In-memory (development)
class InMemorySignatureStore implements SignatureStore {
  constructor();
}
```

### TypeScript Interfaces

**PaymentRequirements** - What client receives in 402 response:
```typescript
interface PaymentRequirements {
  scheme: 'exact' | 'estimate';
  network: 'solana-mainnet' | 'solana-devnet' | 'solana-testnet';
  asset: string;                          // 'USDC', 'CASH', 'SOL'
  payTo: string;                          // Treasury wallet address
  amount: string;                         // Amount in smallest units
  memo?: string;                          // Optional memo
  timeout: number;                        // Timeout in milliseconds
  nonce?: string;                         // Unique nonce
}
```

**PaymentPayload** - What client sends in X-Payment header:
```typescript
interface PaymentPayload {
  network: string;
  asset: string;
  from: string;                           // Payer wallet address
  to: string;                             // Recipient wallet address
  amount: string;
  signature: string;                      // Solana transaction signature
  timestamp: number;
  nonce: string;
  memo?: string;
}
```

**PaymentReceipt** - What middleware provides after verification:
```typescript
interface PaymentReceipt {
  transactionId: string;                  // Solana signature
  from: string;
  to: string;
  amount: string;
  asset: string;
  timestamp: number;
  blockHash: string;
  slot: number;
  signature: string;
  verifiable: boolean;
}
```

**PaymentVerificationResult**:
```typescript
interface PaymentVerificationResult {
  valid: boolean;
  reason?: string;                        // Error reason if invalid
  transactionId?: string;
  receipt?: PaymentReceipt;
}
```

## Examples

### Example 1: Multi-Endpoint Service

Build a service with multiple paid endpoints:

```typescript
import express from 'express';
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';

const app = express();

const x402 = createX402Middleware({
  config: {
    network: 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [],
    timeout: 300000,
    redisUrl: process.env.REDIS_URL,
  },
  pricing: {
    '/api/weather': { pricePerCall: 0.001, currency: 'USDC' },
    '/api/sentiment': { pricePerCall: 0.002, currency: 'USDC' },
    '/api/price': { pricePerCall: 0.0015, currency: 'USDC' },
    '/api/analyze': { pricePerCall: 0.003, currency: 'USDC' },
  },
  onPaymentVerified: async (receipt) => {
    // Log to database
    await db.payments.create({
      transactionId: receipt.transactionId,
      amount: receipt.amount,
      from: receipt.from,
      timestamp: new Date(receipt.timestamp),
    });
  },
});

app.use('/api', x402);

app.get('/api/weather', (req, res) => {
  res.json({ temperature: 72, condition: 'sunny', humidity: 65 });
});

app.post('/api/sentiment', express.json(), (req, res) => {
  const { text } = req.body;
  // Analyze sentiment...
  res.json({ sentiment: 'positive', score: 0.85, text });
});

app.get('/api/price', (req, res) => {
  const { symbol } = req.query;
  res.json({ symbol, price: 98.50, change: 2.3 });
});

app.post('/api/analyze', express.json(), (req, res) => {
  const { data } = req.body;
  // Complex analysis...
  res.json({ analysis: '...', confidence: 0.92 });
});

app.listen(3000);
```

### Example 2: Dynamic Pricing

Calculate prices based on request parameters:

```typescript
import express from 'express';
import { createX402Middleware } from '@x402-upl/core';

const app = express();

// Custom middleware for dynamic pricing
app.use((req, res, next) => {
  // Calculate price based on complexity
  let price = 0.001; // Base price

  if (req.query.detailed === 'true') {
    price += 0.002; // Extra for detailed results
  }

  if (req.query.realtime === 'true') {
    price += 0.001; // Extra for real-time data
  }

  // Store calculated price in request
  (req as any).dynamicPrice = price;
  next();
});

const x402 = createX402Middleware({
  config: { /* ... */ },
  pricing: (req: any) => ({
    pricePerCall: req.dynamicPrice || 0.001,
    currency: 'USDC',
  }),
});

app.use('/api', x402);

app.get('/api/data', (req, res) => {
  const detailed = req.query.detailed === 'true';
  const realtime = req.query.realtime === 'true';

  res.json({
    data: '...',
    detailed,
    realtime,
    price: (req as any).dynamicPrice,
  });
});
```

### Example 3: Payment Analytics

Track payment metrics and user spending:

```typescript
import express from 'express';
import { createX402Middleware } from '@x402-upl/core';

const app = express();

// Analytics tracking
const analytics = {
  totalPayments: 0,
  totalRevenue: 0,
  paymentsByUser: new Map<string, number>(),
  revenueByEndpoint: new Map<string, number>(),
};

const x402 = createX402Middleware({
  config: { /* ... */ },
  pricing: {
    '/api/weather': { pricePerCall: 0.001, currency: 'USDC' },
    '/api/price': { pricePerCall: 0.0015, currency: 'USDC' },
  },
  onPaymentVerified: async (receipt) => {
    // Update analytics
    analytics.totalPayments++;
    analytics.totalRevenue += parseFloat(receipt.amount);

    const userTotal = analytics.paymentsByUser.get(receipt.from) || 0;
    analytics.paymentsByUser.set(receipt.from, userTotal + 1);

    const endpoint = (receipt as any).endpoint || '/unknown';
    const endpointRevenue = analytics.revenueByEndpoint.get(endpoint) || 0;
    analytics.revenueByEndpoint.set(
      endpoint,
      endpointRevenue + parseFloat(receipt.amount)
    );

    console.log(`📊 Analytics:`, {
      totalPayments: analytics.totalPayments,
      totalRevenue: analytics.totalRevenue.toFixed(6),
      topUser: Array.from(analytics.paymentsByUser.entries())
        .sort((a, b) => b[1] - a[1])[0],
    });
  },
});

app.use('/api', x402);

// Analytics endpoint (free)
app.get('/analytics', (req, res) => {
  res.json({
    totalPayments: analytics.totalPayments,
    totalRevenue: analytics.totalRevenue,
    uniqueUsers: analytics.paymentsByUser.size,
    revenueByEndpoint: Object.fromEntries(analytics.revenueByEndpoint),
  });
});
```

### Example 4: Multi-Token Support

Accept payments in multiple tokens:

```typescript
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');

const x402 = createX402Middleware({
  config: {
    network: 'mainnet-beta',
    rpcUrl: process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [USDC_MINT, CASH_MINT],
    timeout: 300000,
    redisUrl: process.env.REDIS_URL!,
  },
  pricing: {
    '/api/weather': {
      pricePerCall: 0.001,
      currency: 'USDC', // Also accepts CASH at same price
    },
  },
  onPaymentVerified: async (receipt) => {
    console.log(`Payment received in ${receipt.asset}: ${receipt.amount}`);
  },
});
```

### Example 5: Testing Sandbox Integration

Use with the testing sandbox for development:

```typescript
import express from 'express';
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';

const app = express();

const isDevelopment = process.env.NODE_ENV === 'development';

const x402 = createX402Middleware({
  config: {
    network: isDevelopment ? 'devnet' : 'mainnet-beta',
    rpcUrl: isDevelopment
      ? 'https://api.devnet.solana.com'
      : process.env.SOLANA_RPC_URL!,
    treasuryWallet: new PublicKey(process.env.TREASURY_WALLET!),
    acceptedTokens: [],
    timeout: isDevelopment ? 30000 : 300000, // 30s dev, 5min prod
    redisUrl: isDevelopment ? undefined : process.env.REDIS_URL,
  },
  pricing: {
    pricePerCall: isDevelopment ? 0.001 : 0.01, // Lower prices in dev
    currency: 'SOL',
  },
  onPaymentVerified: async (receipt) => {
    if (isDevelopment) {
      console.log('🧪 DEV: Payment verified:', receipt.transactionId);
    } else {
      // Production analytics
      await trackPayment(receipt);
    }
  },
});

app.use('/api', x402);

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Payment verified!',
    environment: isDevelopment ? 'development' : 'production',
  });
});
```

## Integration with X402

### HTTP 402 Protocol Flow

X042 Core implements the HTTP 402 Payment Required protocol:

1. **Client Request**: Client makes request without payment
2. **402 Response**: Server returns 402 with `PaymentRequirements`
3. **Payment Creation**: Client creates Solana transaction
4. **Transaction Submission**: Client submits to Solana network
5. **Retry with Proof**: Client retries with `X-Payment` header
6. **Verification**: Server verifies transaction on-chain
7. **Success Response**: Server returns requested data

### Payment Requirements Format

When returning 402, the middleware sends:

```json
{
  "scheme": "exact",
  "network": "solana-devnet",
  "asset": "USDC",
  "payTo": "YourWalletAddress",
  "amount": "1000",
  "timeout": 300000,
  "nonce": "abc123xyz"
}
```

### Payment Proof Format

Client must send `X-Payment` header:

```
X-Payment: base64(JSON.stringify({
  network: "solana-devnet",
  asset: "USDC",
  from: "ClientWalletAddress",
  to: "YourWalletAddress",
  amount: "1000",
  signature: "SolanaTransactionSignature",
  timestamp: 1699000000000,
  nonce: "abc123xyz"
}))
```

### Service Registry Integration

Register your X042-protected service:

```typescript
import { X402Client } from '@x402-upl/sdk';

const client = new X402Client({
  solanaConfig: {
    network: 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL!,
  },
});

// Register service
await client.registerService({
  url: 'https://api.example.com',
  endpoints: [
    {
      path: '/api/weather',
      method: 'GET',
      pricing: { pricePerCall: 0.001, currency: 'USDC' },
      description: 'Get current weather data',
    },
  ],
});
```

## Troubleshooting

### 1. Redis Connection Error

**Error**: `Redis connection failed`

**Solution**: Verify Redis is running and accessible:

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check Redis URL format
REDIS_URL=redis://localhost:6379
# Or with password
REDIS_URL=redis://:password@localhost:6379
```

For production, Redis is required:

```typescript
const config: X402Config = {
  network: 'mainnet-beta',
  redisUrl: process.env.REDIS_URL!, // Must be provided
  // ...
};
```

### 2. Transaction Not Found

**Error**: `Transaction not found on blockchain`

**Cause**: Transaction hasn't confirmed or client provided wrong signature

**Solution**: Increase timeout and wait for confirmation:

```typescript
const config: X402Config = {
  timeout: 300000, // 5 minutes
  // ...
};
```

Client should wait for transaction confirmation before retrying:

```typescript
// Client side
const signature = await connection.sendTransaction(transaction);
await connection.confirmTransaction(signature, 'confirmed');
// Now retry with X-Payment header
```

### 3. Amount Mismatch

**Error**: `Payment amount does not match requirements`

**Cause**: Client sent wrong amount

**Solution**: Ensure client sends exact amount in smallest units:

```typescript
// Server expects
pricePerCall: 0.001 // USDC

// Client must send
amount: 1000 // 0.001 USDC = 1000 micro-USDC (6 decimals)
```

### 4. Replay Attack Detected

**Error**: `Payment already processed`

**Cause**: Same transaction signature used twice

**Solution**: This is working as intended - replay protection. Client must create new transaction for each request.

### 5. Invalid Recipient

**Error**: `Payment sent to wrong address`

**Cause**: Client sent payment to different wallet

**Solution**: Ensure client uses exact `payTo` address from 402 response:

```typescript
// Client must use this exact address
const requirements = await getPaymentRequirements();
const recipientPubkey = new PublicKey(requirements.payTo);
```

### 6. Signature Timeout

**Error**: `Payment signature expired`

**Cause**: Too much time between payment creation and verification

**Solution**: Reduce latency or increase timeout:

```typescript
const config: X402Config = {
  timeout: 600000, // 10 minutes instead of 5
  // ...
};
```

### 7. RPC Rate Limiting

**Error**: `429 Too Many Requests` from Solana RPC

**Solution**: Use private RPC endpoint:

```bash
# Free tier public RPCs have limits
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Use paid RPC for production
SOLANA_RPC_URL=https://your-project.rpcpool.com/your-api-key
# Or Helius, QuickNode, Triton, etc.
```

### 8. Wrong Network

**Error**: `Transaction not found` on wrong network

**Cause**: Client using devnet, server expecting mainnet (or vice versa)

**Solution**: Ensure client and server use same network:

```typescript
// Server
const config: X402Config = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  // ...
};

// Client must also use devnet
const client = new X402Client({
  solanaConfig: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
  },
});
```

### 9. Missing Payment Header

**Error**: 402 response when you expect data

**Cause**: `X-Payment` header not sent or malformed

**Solution**: Ensure client sends header:

```typescript
// Client request
const response = await fetch('https://api.example.com/weather', {
  headers: {
    'X-Payment': base64Encode(JSON.stringify(paymentPayload)),
  },
});
```

### 10. Token Not Accepted

**Error**: `Token not in accepted list`

**Cause**: Client paid with unsupported token

**Solution**: Configure accepted tokens:

```typescript
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');

const config: X402Config = {
  acceptedTokens: [USDC_MINT, CASH_MINT],
  // ...
};
```

### 11. Development Mode Issues

**Issue**: Want to test without Redis

**Solution**: Redis not required for devnet/testnet:

```typescript
const config: X402Config = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  treasuryWallet: new PublicKey('...'),
  acceptedTokens: [],
  timeout: 300000,
  // redisUrl: undefined, // Falls back to in-memory store
};
```

**Warning**: In-memory store doesn't prevent replay attacks across server restarts. Only use for development!

### 12. TypeScript Errors

**Error**: Type mismatch errors

**Solution**: Ensure correct TypeScript configuration:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 13. CORS Issues

**Error**: CORS blocking payment headers

**Solution**: Configure CORS properly:

```typescript
import cors from 'cors';

app.use(cors({
  origin: 'https://your-client.com',
  allowedHeaders: ['Content-Type', 'X-Payment'],
  exposedHeaders: ['X-Payment-Response'],
}));
```

### 14. Performance: Slow Verification

**Issue**: Payment verification takes too long

**Solution**: Use faster RPC and implement caching:

```typescript
import NodeCache from 'node-cache';

const txCache = new NodeCache({ stdTTL: 600 }); // 10 min cache

// Cache verified transactions
onPaymentVerified: async (receipt) => {
  txCache.set(receipt.transactionId, receipt);
},
```

### 15. Debugging Payment Flow

Enable detailed logging:

```typescript
const x402 = createX402Middleware({
  config: { /* ... */ },
  pricing: { /* ... */ },
  onPaymentVerified: async (receipt) => {
    console.log('✅ PAYMENT VERIFIED');
    console.log('Transaction:', receipt.transactionId);
    console.log('From:', receipt.from);
    console.log('Amount:', receipt.amount, receipt.asset);
    console.log('Slot:', receipt.slot);
    console.log('Block:', receipt.blockHash);
  },
  onPaymentFailed: async (reason) => {
    console.error('❌ PAYMENT FAILED');
    console.error('Reason:', reason);
    console.error('Timestamp:', new Date().toISOString());
  },
});
```

## Security

### 1. Private Key Management

**Never** expose private keys:

```typescript
// ❌ Bad: Hardcoded private key
const config = {
  facilitatorPrivateKey: new Uint8Array([1, 2, 3, ...]),
};

// ✅ Good: Environment variable
const config = {
  facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY
    ? bs58.decode(process.env.FACILITATOR_PRIVATE_KEY)
    : undefined,
};
```

### 2. Redis Security

Secure Redis connection:

```bash
# ❌ Bad: Unencrypted Redis
REDIS_URL=redis://localhost:6379

# ✅ Good: TLS + Authentication
REDIS_URL=rediss://:password@your-redis.upstash.io:6379
```

### 3. Replay Protection

Always use Redis for production:

```typescript
// ❌ Bad: In-memory store in production
const config: X402Config = {
  network: 'mainnet-beta',
  // No redisUrl - uses in-memory (vulnerable to replay)
};

// ✅ Good: Redis for mainnet
const config: X402Config = {
  network: 'mainnet-beta',
  redisUrl: process.env.REDIS_URL!, // Required
};
```

### 4. Amount Validation

Validate received amounts:

```typescript
onPaymentVerified: async (receipt) => {
  const expectedMin = 0.001;
  const actualAmount = parseFloat(receipt.amount) / 1e6; // USDC has 6 decimals

  if (actualAmount < expectedMin) {
    throw new Error('Payment amount too low');
  }

  // Process payment
},
```

### 5. Network Validation

Ensure correct network:

```typescript
const config: X402Config = {
  network: process.env.NODE_ENV === 'production' ? 'mainnet-beta' : 'devnet',
  rpcUrl: process.env.SOLANA_RPC_URL!,
  // ...
};

if (config.network === 'mainnet-beta' && !config.redisUrl) {
  throw new Error('Redis required for mainnet');
}
```

### 6. Rate Limiting

Implement rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

app.use('/api', limiter, x402Middleware);
```

### 7. Input Validation

Validate request inputs:

```typescript
import { z } from 'zod';

const WeatherSchema = z.object({
  location: z.string().min(1).max(100),
  units: z.enum(['metric', 'imperial']).optional(),
});

app.get('/api/weather', x402Middleware, (req, res) => {
  const result = WeatherSchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Process validated input
  const { location, units } = result.data;
  res.json({ temperature: 72, location, units });
});
```

### 8. Treasury Wallet Security

Use a dedicated treasury wallet:

```bash
# Generate new wallet for payments
solana-keygen new --outfile ~/treasury-wallet.json

# Get public key
solana-keygen pubkey ~/treasury-wallet.json

# Use public key in config
TREASURY_WALLET=YourPublicKeyHere
```

**Important**: Keep private key secure, only store public key in environment variables.

### 9. HTTPS Only

Always use HTTPS in production:

```typescript
if (process.env.NODE_ENV === 'production' && !process.env.HTTPS) {
  console.warn('⚠️  WARNING: HTTPS not enabled in production!');
}

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.protocol === 'http' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.hostname}${req.url}`);
  }
  next();
});
```

### 10. Error Message Sanitization

Don't leak sensitive information in errors:

```typescript
onPaymentFailed: async (reason) => {
  // ❌ Bad: Leaks internal details
  console.error('Payment failed:', reason, process.env.REDIS_URL);

  // ✅ Good: Generic user-facing message
  console.error('Payment failed:', reason);

  // Return generic error to client
  // Don't expose: wallet addresses, internal errors, stack traces
},
```

## Performance

### 1. Redis Connection Pooling

Reuse Redis connections:

```typescript
import { Redis } from 'ioredis';

// Create single Redis instance
const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

// Reuse across middleware instances
const signatureStore = new RedisSignatureStore(redis);

const x402 = createX402Middleware({
  config: { /* ... */ },
  pricing: { /* ... */ },
}, signatureStore);
```

### 2. RPC Connection Optimization

Use WebSocket connections for faster RPC:

```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection(
  process.env.SOLANA_RPC_URL!,
  {
    commitment: 'confirmed',
    wsEndpoint: process.env.SOLANA_WS_URL, // WebSocket endpoint
    confirmTransactionInitialTimeout: 60000,
  }
);
```

### 3. Transaction Caching

Cache verified transactions:

```typescript
import NodeCache from 'node-cache';

const txCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const verifier = new PaymentVerifier(config, {
  has: async (sig) => {
    return txCache.has(sig) || await redisStore.has(sig);
  },
  add: async (sig, ttl) => {
    txCache.set(sig, true, ttl);
    await redisStore.add(sig, ttl);
  },
});
```

### 4. Parallel Verification

Process payments in parallel:

```typescript
// Don't await in middleware if not needed
onPaymentVerified: async (receipt) => {
  // Fire and forget - don't block response
  trackPayment(receipt).catch(console.error);
},
```

### 5. Optimize Pricing Lookups

Use Map for O(1) pricing lookups:

```typescript
const pricingMap = new Map([
  ['/api/weather', { pricePerCall: 0.001, currency: 'USDC' }],
  ['/api/price', { pricePerCall: 0.0015, currency: 'USDC' }],
  ['/api/analyze', { pricePerCall: 0.003, currency: 'USDC' }],
]);

function getPricing(route: string) {
  return pricingMap.get(route);
}
```

### 6. Response Time Monitoring

Track middleware performance:

```typescript
import { performance } from 'perf_hooks';

const x402 = createX402Middleware({
  config: { /* ... */ },
  pricing: { /* ... */ },
  onPaymentVerified: async (receipt) => {
    const start = performance.now();

    await processPayment(receipt);

    const duration = performance.now() - start;
    console.log(`Payment processed in ${duration.toFixed(2)}ms`);

    if (duration > 1000) {
      console.warn('⚠️  Slow payment processing:', duration);
    }
  },
});
```

### 7. Batch RPC Requests

Batch multiple RPC calls:

```typescript
// Instead of multiple getTransaction calls
const transactions = await Promise.all([
  connection.getTransaction(sig1),
  connection.getTransaction(sig2),
  connection.getTransaction(sig3),
]);
```

## Related Documentation

- [Facilitator API](../infrastructure/facilitator.md) - Payment routing service
- [Service Provider](./service-provider.md) - Building x402 services
- [JavaScript SDK](../sdks/javascript.md) - Client SDK for consuming services
- [CLI Tool](./cli.md) - Command-line tools
- [Testing Sandbox](./testing-sandbox.md) - Development testing

## Support

- [GitHub Repository](https://github.com/collinsville22/x402-upl)
- [GitHub Issues](https://github.com/collinsville22/x402-upl/issues)
- [Documentation](https://collinsville22.github.io/x402-upl/)
