# x402 NestJS Service

Production-ready x402-enabled API service built with NestJS, TAP authentication, decorators, and automatic registry integration.

## Features

- NestJS enterprise TypeScript framework
- x402 payment verification interceptor
- Decorator-based payment configuration (`@X402Payment`)
- TAP (Trusted Agent Protocol) authentication
- Dependency injection throughout
- Automatic service registration with x402 registry
- Redis-backed signature store for horizontal scalability
- CASH token support (TOKEN_2022)
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
SERVICE_NAME=My x402 NestJS Service
SERVICE_DESCRIPTION=Production-ready x402-enabled NestJS service
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
nestjs/
├── src/
│   ├── config/
│   │   └── configuration.ts       # Environment configuration
│   ├── example/
│   │   ├── example.controller.ts  # Example x402-protected controller
│   │   └── example.module.ts      # Example module
│   ├── health/
│   │   ├── health.controller.ts   # Health check controller
│   │   └── health.module.ts       # Health module
│   ├── x402/
│   │   └── registry-client.ts     # x402 registry integration
│   ├── app.module.ts              # Root application module
│   └── main.ts                    # Application entry point
├── nest-cli.json                  # NestJS CLI configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies
```

## API Endpoints

### Protected Endpoints

**POST /api/example**
- Requires x402 payment
- Price: 0.01 CASH
- Accepts JSON body
- Returns processed data with payment info

**GET /api/example**
- Requires x402 payment
- Price: 0.005 CASH
- Returns success message with payment info

### Public Endpoints

**GET /health**
- Health check endpoint
- No payment required
- Returns service status

## Using the X402Payment Decorator

The `@X402Payment` decorator makes routes require payment:

```typescript
import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { X402Payment, X402Interceptor } from '@x402-upl/core/nestjs';

@Controller('api/service')
@UseInterceptors(X402Interceptor)
export class ServiceController {
  @Post('process')
  @X402Payment({
    price: 0.02,
    asset: 'CASH',
    description: 'Process data endpoint',
    required: true,
  })
  async processData(@Body() data: any) {
    return {
      success: true,
      processed: data,
    };
  }
}
```

### Decorator Options

- `price`: Payment amount required (number)
- `asset`: Token type ('CASH', 'USDC', 'SOL')
- `description`: Human-readable description
- `required`: Whether payment is mandatory (boolean)

## Accessing Payment Data

Payment information is available in the request object:

```typescript
import { Req } from '@nestjs/common';
import { Request } from 'express';

interface X402Request extends Request {
  x402?: {
    verified: boolean;
    signature?: string;
    from?: string;
    to?: string;
    amount?: string;
    asset?: string;
  };
}

@Post('example')
@X402Payment({ price: 0.01, asset: 'CASH' })
async handleRequest(@Req() request: X402Request) {
  const payment = request.x402;

  return {
    success: true,
    paymentVerified: payment?.verified,
    signature: payment?.signature,
  };
}
```

## Module Configuration

### Synchronous Configuration

```typescript
import { X402Module } from '@x402-upl/core/nestjs';

@Module({
  imports: [
    X402Module.forRoot({
      network: 'devnet',
      treasuryWallet: 'YOUR_WALLET_ADDRESS',
      redisUrl: 'redis://localhost:6379',
    }),
  ],
})
export class AppModule {}
```

### Async Configuration (Recommended)

```typescript
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    X402Module.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        network: config.get('network'),
        treasuryWallet: config.get('treasuryWallet'),
        redisUrl: config.get('redisUrl'),
      }),
    }),
  ],
})
export class AppModule {}
```

## TAP Authentication

TAP authentication is configured globally in the module:

```typescript
X402Module.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    network: config.get('network'),
    treasuryWallet: config.get('treasuryWallet'),
    enableTAP: true,
    registryUrl: 'https://registry.x402.network',
  }),
})
```

## Registry Integration

Enable automatic registration in `.env`:

```env
AUTO_REGISTER_SERVICE=true
SERVICE_URL=https://api.example.com
SERVICE_NAME=My NestJS Service
```

The service automatically:
- Registers on module initialization
- Sends periodic heartbeats (every 60s)
- Updates status to PAUSED on shutdown

## Creating New Modules

Generate a new module with NestJS CLI:

```bash
nest generate module features/custom
nest generate controller features/custom
```

Add x402 protection:

```typescript
import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { X402Payment, X402Interceptor } from '@x402-upl/core/nestjs';

@Controller('api/custom')
@UseInterceptors(X402Interceptor)
export class CustomController {
  @Post()
  @X402Payment({ price: 0.05, asset: 'CASH' })
  async customEndpoint() {
    return { success: true };
  }
}
```

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Environment Variables

Production environment requires:
- `NETWORK=mainnet-beta`
- `REDIS_URL` (required for mainnet)
- `TREASURY_WALLET` (production wallet)
- `SERVICE_URL` (public HTTPS URL)

## Dependency Injection

NestJS provides powerful DI capabilities:

```typescript
import { Injectable } from '@nestjs/common';
import { X402Service } from '@x402-upl/core/nestjs';

@Injectable()
export class CustomService {
  constructor(private x402Service: X402Service) {}

  async checkPayment(signature: string) {
    const config = this.x402Service.getConfig();
    return { config };
  }
}
```

## Testing

Generate and run tests:

```bash
npm run test
npm run test:cov
npm run test:e2e
```

## Monitoring

NestJS uses Pino for structured logging:

```typescript
import { Logger } from 'nestjs-pino';

@Controller()
export class AppController {
  constructor(private logger: Logger) {}

  @Get()
  handleRequest() {
    this.logger.log('Processing request');
    return { success: true };
  }
}
```

## Security

- Redis required for mainnet (horizontal scaling)
- Interceptor validates all payments before route execution
- Decorator metadata ensures type safety
- Global exception filters handle errors
- Helmet security headers (add `@nestjs/helmet`)

## Support

- Documentation: https://collinsville22.github.io/x402-upl
- Registry: https://registry.x402.network
- Issues: https://github.com/x402-upl/issues
