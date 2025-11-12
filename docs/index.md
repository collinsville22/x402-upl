# X402 Universal Payment Layer Documentation

Welcome to the X402-UPL documentation. This is a complete Solana-based payment infrastructure enabling micropayments for AI agents and autonomous services.

## Quick Links

- [Architecture Overview](architecture) - System design and technical architecture
- [Setup Guide](setup) - Installation and configuration instructions
- [GitHub Repository](https://github.com/collinsville22/x402-upl)

## What is X402-UPL?

X402-UPL is a production-ready payment layer implementing the HTTP 402 Payment Required protocol on Solana. It enables:

- **Micropayments**: Pay-per-call API monetization with SOL, USDC, and CASH tokens
- **Autonomous Agents**: Self-directed AI agents that discover and pay for services
- **Service Discovery**: Registry of payment-gated services with reputation scoring
- **Multi-Framework Support**: Middleware for Express, Fastify, Next.js, NestJS, and more
- **Smart Contracts**: Deployed on Solana devnet with escrow and settlement capabilities

## Getting Started

### Prerequisites

- Node.js 18+ or Python 3.9+
- Solana CLI tools
- A Solana wallet with devnet SOL

### Quick Start

1. **Install the SDK**

```bash
npm install @x402-upl/sdk
# or
pip install x402-upl
```

2. **Create a Client**

```typescript
import { X402Client } from '@x402-upl/sdk';
import { Keypair } from '@solana/web3.js';

const wallet = Keypair.generate();
const client = new X402Client({
  network: 'devnet',
  wallet,
  registryApiUrl: 'https://registry.x402.network',
});
```

3. **Discover and Call Services**

```typescript
const services = await client.discover({
  category: 'AI & ML',
  maxPrice: 0.1,
});

const result = await client.post(services[0].url, { query: 'test' });
```

## Core Components

### X042 Core
Solana-compatible HTTP 402 middleware for Node.js frameworks.
- Supports Express, Fastify, Next.js, Koa, NestJS
- On-chain payment verification
- SPL token support (USDC, CASH)

### Facilitator API
Payment routing and settlement management service.
- 45+ REST endpoints
- Multi-hop routing
- Escrow functionality
- Webhook notifications

### Registry API
Service discovery and reputation system.
- Service registration and search
- Reputation scoring (0-10000)
- Verification levels
- Analytics and metrics

### Smart Contracts
Solana programs for payments and escrow.
- Program ID: `85GHuKTjE4RXR2d4tCMKLXSbdwr2wkELVvUhNeyrwEfj`
- Written in Anchor framework
- Deployed on devnet

## SDKs

Multi-language SDKs for building x402 clients:

- **JavaScript/TypeScript SDK** - Full-featured client with TAP authentication
- **Python SDK** - Async/await support with type hints
- **Rust SDK** - High-performance native implementation
- **Go SDK** - Concurrent client with context support

## Integrations

Production-ready integrations and examples:

### MCP Bridge
Claude Desktop integration via Model Context Protocol.
- Automatic payment handling
- Service discovery from registry
- Tool exposure for Claude

### Eliza Plugin
AI agent framework plugin for autonomous service marketplace.
- Service advertisement and discovery
- On-chain reputation and escrow
- Auto-accept offers configuration

### Switchboard Oracle
On-demand oracle data marketplace with x402 payments.
- Real Switchboard protocol integration
- Custom feed creation
- Real-time streaming

### Phantom CASH
Autonomous agent with CASH token micropayments.
- Token-2022 support
- LLM-powered autonomy
- Multi-step workflows

### CDP Agent
Coinbase Developer Platform embedded wallets integration.
- CDP Server Wallets v2
- Autonomous task planning
- Chained tool calls

### Gradient
AI marketplace integration with distributed compute.
- GPU/CPU compute access
- Model training and inference
- Pay-per-compute pricing

## Applications

### Dashboard
Service provider dashboard for managing x402 services.
- Next.js 15 + React 19
- Real-time analytics
- Payment management
- Service configuration

### Consumer App
End-user application for discovering and using services.
- Service marketplace
- Payment history
- Wallet integration
- Testing sandbox

## Tools

### CLI
Command-line tool for service management.
```bash
npx @x402-upl/cli register-service \
  --url https://api.example.com/weather \
  --price 0.001 \
  --name "Weather API"
```

### Testing Sandbox
Interactive testing environment for x402 services.
- Mock payment scenarios
- Service testing
- Integration debugging

### Create X402 Service
Project scaffolding for new x402 services.
```bash
npx create-x402-service my-service
```

Supports templates for:
- Express
- Fastify
- Next.js
- NestJS
- Python FastAPI
- Rust Actix
- Go net/http

## Security

X402-UPL implements comprehensive security measures:

- **On-chain Verification**: All payments verified on Solana blockchain
- **Replay Protection**: Transaction signature tracking prevents replay attacks
- **TAP Authentication**: RFC 9421 HTTP message signatures
- **Rate Limiting**: Configurable limits on all APIs
- **Input Validation**: Zod schema validation throughout
- **Encryption**: Private keys stored encrypted
- **Multi-sig**: Treasury wallet uses multi-signature

## Architecture

The platform consists of multiple layers:

1. **Protocol Layer**: HTTP 402 specification implementation
2. **Blockchain Layer**: Solana smart contracts and SPL tokens
3. **Service Layer**: APIs for discovery, routing, and settlement
4. **SDK Layer**: Client libraries for multiple languages
5. **Application Layer**: User-facing dashboards and apps

See [Architecture Documentation](architecture) for complete details.

## Deployment

### Infrastructure
- **Facilitator API**: Deployed on Railway
- **Registry API**: Deployed on Railway
- **Dashboard**: Deployed on Vercel
- **Consumer App**: Deployed on Vercel
- **Smart Contracts**: Solana devnet
- **Database**: PostgreSQL on Supabase
- **Cache**: Redis on Railway

### Monitoring
- Sentry for error tracking
- Datadog for metrics
- LogRocket for session replay
- Custom analytics dashboard

## Contributing

This is an open-source project under the Apache License 2.0. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [GitHub Repository](https://github.com/collinsville22/x402-upl) for more details.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/collinsville22/x402-upl/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/collinsville22/x402-upl/discussions)

## License

Apache License 2.0 - See [LICENSE](https://github.com/collinsville22/x402-upl/blob/master/LICENSE) for details.

This project is fully open source and available for commercial and non-commercial use.

---

**Solana Program ID**: `85GHuKTjE4RXR2d4tCMKLXSbdwr2wkELVvUhNeyrwEfj`
