# x402 Universal Payment Layer

Production-grade infrastructure for autonomous agent payments on Solana.

## Architecture

- **Registry API**: Service discovery and agent reputation
- **Solana Contracts**: On-chain reputation and staking
- **Core Protocol**: x402 payment verification and settlement
- **Visa TAP**: Cryptographic agent identity
- **CDP Wallets**: Instant embedded wallets for agents
- **Phantom CASH**: Zero-fee micropayments
- **Switchboard**: Price and quality oracles
- **MCP Bridge**: Claude Code integration
- **Reasoning Engine**: Autonomous task decomposition
- **SDKs**: TypeScript, Python, Rust
- **CLI**: Developer tools
- **Dashboard**: Merchant analytics

## Prerequisites

- Node.js >= 20.0.0
- Rust >= 1.75.0 (for Solana contracts)
- Solana CLI >= 1.18.0
- PostgreSQL >= 14
- Redis (Upstash)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- Neon PostgreSQL database URL
- Upstash Redis credentials
- Solana wallet keys
- CDP API credentials
- Sponsor API keys

### 3. Database Setup

```bash
cd packages/registry/api
npx prisma generate
npx prisma db push
```

### 4. Build All Packages

```bash
npm run build
```

### 5. Deploy Solana Contracts

```bash
cd packages/contracts
anchor build
anchor deploy --provider.cluster devnet
```

Update program IDs in `Anchor.toml` and `packages/registry/api/src/config.ts`.

## Development

### Start Registry API

```bash
cd packages/registry/api
npm run dev
```

### Start Indexer

```bash
cd packages/registry/indexer
npm run dev
```

### Start MCP Server

```bash
cd packages/mcp-bridge
npm run dev
```

### Start Dashboard

```bash
cd packages/dashboard/frontend
npm run dev
```

## Production Deployment

### Vercel (Dashboard + APIs)

```bash
vercel deploy --prod
```

### Railway (Background Services)

```bash
railway up
```

### Database Migrations

```bash
cd packages/registry/api
npx prisma migrate deploy
```

## Testing

```bash
npm run test
```

## Usage

### For Developers (Enable x402 on Your API)

```bash
npx @x402-upl/cli enable https://api.yourservice.com \
  --price 0.001 \
  --name "Your Service"
```

### For Agents (TypeScript SDK)

```typescript
import { X402Client } from '@x402-upl/sdk';

const client = new X402Client({
  network: 'devnet',
  wallet: agentWallet,
});

const services = await client.discover({
  category: 'data-analytics',
  maxPrice: 0.01,
});

const result = await client.payAndFetch(services[0].url, params);
```

## Security

- All private keys stored in encrypted environment variables
- Multi-sig wallets for treasury
- Rate limiting on all APIs
- Input validation with Zod
- SQL injection prevention with Prisma
- CORS configured for production domains

## License

Apache License 2.0 - See [LICENSE](./LICENSE) for details.

This project is fully open source and available for commercial and non-commercial use under the Apache License 2.0.
