# x402 Express Service

Production-ready x402 service built with Express and TypeScript.

## Features

- x402 payment protocol integration
- Type-safe with TypeScript and Zod
- Redis-backed signature verification
- Structured logging with Pino
- Security headers with Helmet
- CORS enabled
- Hot reload in development
- Production-ready architecture

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `TREASURY_WALLET`: Your Solana wallet address for receiving payments
- `NETWORK`: Solana network (devnet/mainnet-beta)
- `REDIS_URL`: Redis connection string

### 3. Start Development Server

```bash
npm run dev
```

Server runs on http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code

## Project Structure

```
src/
├── index.ts              # Server entry point
├── config.ts             # Environment configuration
└── routes/
    ├── index.ts          # Route registration
    └── examples.ts       # Example endpoints
```

## Adding New Endpoints

Create route handlers in `src/routes/`:

```typescript
import { Express, Request, Response } from 'express';

export function myRoutes(app: Express): void {
  app.get('/api/my-endpoint', async (req: Request, res: Response) => {
    res.json({
      message: 'Hello x402',
      timestamp: Date.now(),
    });
  });
}
```

Register in `src/routes/index.ts`:

```typescript
import { myRoutes } from './my-routes.js';

export function registerRoutes(app: Express): void {
  myRoutes(app);
}
```

## x402 Payment Configuration

All endpoints are automatically protected by x402 payment middleware.

Configure pricing in your service registration:

```bash
x402 register \
  --name "My Service" \
  --url "http://localhost:3000" \
  --price 0.01 \
  --category data \
  --network devnet
```

## Testing

Test with x402 CLI:

```bash
x402 pay http://localhost:3000/api/data --network devnet
```

Or use the SDK:

```typescript
import { SolanaX402Client } from '@x402-upl/sdk';

const client = new SolanaX402Client({
  wallet: myWallet,
  network: 'devnet',
});

const response = await client.get('http://localhost:3000/api/data');
```

## Production Deployment

### Docker

```bash
docker build -t my-x402-service .
docker run -p 3000:3000 --env-file .env my-x402-service
```

### Environment Variables

Required:
- `TREASURY_WALLET` - Wallet address for payments
- `NETWORK` - Solana network

Optional:
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)
- `LOG_LEVEL` - Logging level (default: info)
- `CORS_ORIGIN` - CORS origin (default: *)

## Security

- Helmet for security headers
- CORS configuration
- Input validation with Zod
- Signature verification via Redis
- Rate limiting (add @express/rate-limit)

## Monitoring

Structured logging with Pino. All requests logged automatically.

Health check endpoint:

```bash
curl http://localhost:3000/health
```

## Support

- Documentation: https://docs.x402.network
- GitHub: https://github.com/x402-upl/x402

## License

MIT
