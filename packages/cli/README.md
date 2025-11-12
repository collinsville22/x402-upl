# x402 CLI

Command-line interface for the x402 Universal Payment Layer.

## Installation

```bash
npm install -g @x402-upl/cli
```

## Quick Start

### 1. Register as an Agent

```bash
x402 register
```

This will:
- Create or import a Solana wallet
- Register you as an agent on the x402 network
- Stake SOL for reputation

### 2. Enable x402 on Your Service

```bash
x402 enable https://api.example.com/my-service \
  --name "My AI Service" \
  --description "Provides AI analysis" \
  --category "AI & ML" \
  --price 0.05
```

### 3. Generate Middleware Code

```bash
x402 deploy --framework express --output ./middleware
```

Supported frameworks:
- `express` - Express.js
- `fastify` - Fastify
- `nextjs` - Next.js

### 4. Test Your Service

```bash
x402 test https://api.example.com/my-service
```

Test with payment:

```bash
x402 test https://api.example.com/my-service --params '{"query": "test"}'
```

### 5. View Earnings

```bash
x402 earnings --services
```

View agent stats:

```bash
x402 earnings --agent
```

## Commands

### `x402 tap init`

Initialize TAP (Trusted Agent Protocol) authentication.

Options:
- `--did <did>` - Decentralized Identifier
- `--alg <algorithm>` - Signature algorithm (ed25519 or rsa-pss-sha256), default: ed25519

Example:
```bash
x402 tap init --alg ed25519
```

### `x402 tap verify`

Verify TAP configuration and check that keys are properly set up.

### `x402 tap show`

Display current TAP configuration including key ID, algorithm, and DID.

### `x402 register`

Register as an agent on the x402 network with optional TAP authentication.

Options:
- `-s, --stake <amount>` - Amount of SOL to stake
- `--did <did>` - Decentralized Identifier
- `--cert <cert>` - Visa TAP certificate
- `--metadata <uri>` - Metadata URI

Note: If TAP is initialized (via `x402 tap init`), registration will automatically use TAP authentication.

### `x402 enable <url>`

Register a service with x402 protocol.

Options:
- `-n, --name <name>` - Service name
- `-d, --description <description>` - Service description
- `-c, --category <category>` - Service category
- `-p, --price <price>` - Price per call in USDC
- `-t, --tokens <tokens>` - Accepted tokens (comma-separated), default: CASH,USDC,SOL
- `--with-tap` - Enable TAP authentication for this service
- `--cash-enabled` - Prioritize CASH token payments
- `--capabilities <capabilities>` - Service capabilities (comma-separated)
- `--tags <tags>` - Service tags (comma-separated)

### `x402 test <service>`

Test a service integration. Service can be a service ID or URL.

Options:
- `--params <json>` - Test parameters as JSON
- `--no-payment` - Test without payment (check 402 response)

### `x402 earnings`

View your earnings and statistics.

Options:
- `-s, --services` - Show per-service breakdown
- `-a, --agent` - Show agent stats

### `x402 deploy`

Generate x402 middleware code for your service.

Options:
- `-f, --framework <framework>` - Framework (express, fastify, nextjs)
- `-o, --output <path>` - Output directory

### `x402 discover`

Discover available services on the network.

Options:
- `-q, --query <query>` - Search query
- `-c, --category <category>` - Filter by category
- `--max-price <price>` - Maximum price per call
- `--min-reputation <score>` - Minimum reputation score
- `--min-uptime <percentage>` - Minimum uptime percentage
- `--sort <field>` - Sort by: price, reputation, value, recent
- `-l, --limit <number>` - Limit results (default: 10)

### `x402 config`

Manage CLI configuration.

Subcommands:
- `show` - Show current configuration
- `set <key> <value>` - Set a configuration value
- `reset` - Reset all configuration
- `network <network>` - Switch network (mainnet-beta, devnet, testnet)

## Configuration

Configuration is stored in `~/.config/x402-upl/config.json`.

Settings:
- `network` - Solana network (mainnet-beta, devnet, testnet)
- `rpcUrl` - Custom RPC URL
- `registryApiUrl` - Custom registry API URL
- `walletPrivateKey` - Encrypted wallet private key
- `agentId` - Your agent ID
- `did` - Your DID
- `visaTapCert` - Your Visa TAP certificate

## Examples

### Complete Workflow with TAP

```bash
x402 tap init --alg ed25519

x402 register --stake 1

x402 enable https://api.example.com/analyze \
  --name "Market Analyzer" \
  --description "Real-time market analysis" \
  --category "Data Analytics" \
  --price 0.10 \
  --tokens "CASH,USDC,SOL" \
  --with-tap \
  --cash-enabled \
  --tags "market,analysis,real-time"

x402 test https://api.example.com/analyze --no-payment

x402 earnings --services
```

### Complete Workflow without TAP

```bash
x402 register --stake 1

x402 enable https://api.example.com/analyze \
  --name "Market Analyzer" \
  --description "Real-time market analysis" \
  --category "Data Analytics" \
  --price 0.10 \
  --tokens "CASH,USDC" \
  --tags "market,analysis,real-time"

x402 earnings --services
```

### Service Discovery

```bash
x402 discover --category "AI & ML" --max-price 0.05 --sort value

x402 discover --query "blockchain data" --min-uptime 99 --limit 5
```

### Network Management

```bash
x402 config network devnet

x402 config set rpcUrl https://api.devnet.solana.com

x402 config show
```

## Integration Guide

### Express.js

1. Generate middleware:
```bash
x402 deploy --framework express
```

2. Use in your app:
```typescript
import express from 'express';
import x402 from './x402-middleware';

const app = express();

app.post('/api/service', x402, async (req, res) => {
  res.json({ result: 'Service executed' });
});
```

### Fastify

1. Generate middleware:
```bash
x402 deploy --framework fastify
```

2. Use as hook:
```typescript
import Fastify from 'fastify';
import { x402 } from './x402-middleware';

const fastify = Fastify();

fastify.addHook('preHandler', x402);

fastify.post('/api/service', async (request, reply) => {
  return { result: 'Service executed' };
});
```

### Next.js

1. Generate middleware:
```bash
x402 deploy --framework nextjs
```

2. Use in route handler:
```typescript
import { withX402 } from './x402-middleware';

export async function POST(request: NextRequest) {
  return withX402(request, async (req) => {
    return NextResponse.json({ result: 'Service executed' });
  });
}
```

## License

Apache License 2.0
