# @x402-upl/reasoning

Enterprise AI task orchestration engine for x402 protocol.

## Overview

Production-grade system that decomposes natural language tasks into executable workflows, discovers x402 services, orchestrates payments, and executes multi-step operations with retry and rollback capabilities.

## Features

- AI-powered task decomposition using Claude 3.5 Sonnet
- Intelligent service discovery and matching from x402 Bazaar
- Automatic payment orchestration with Solana wallets
- DAG-based execution with parallel step optimization
- Retry policies with exponential backoff
- Rollback and compensation on failures
- Real-time progress streaming via WebSocket
- Redis-backed state management
- PostgreSQL for durable persistence
- Cost estimation and approval flow

## Architecture

```
User Input → AI Planner → Service Discovery → Cost Estimation
                ↓
          Approval Flow
                ↓
    Execution Engine (DAG) → Payment Orchestrator
                ↓
         Real-time Events → WebSocket Stream
```

## Installation

```bash
npm install @x402-upl/reasoning
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-xxx
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REGISTRY_URL=http://localhost:3001
SOLANA_RPC_URL=https://api.devnet.solana.com
NETWORK=devnet
ESCROW_KEYPAIR=base64_encoded_keypair
PORT=5000
```

Generate escrow keypair:

```bash
node -e "const {Keypair} = require('@solana/web3.js'); const k = Keypair.generate(); console.log('ESCROW_KEYPAIR=' + Buffer.from(k.secretKey).toString('base64')); console.log('Address:', k.publicKey.toBase58());"
```

## API Endpoints

### Create Workflow

```http
POST /workflows/create
Content-Type: application/json

{
  "userId": "user_123",
  "input": "Analyze last 30 days of Solana DEX volume and create trend report",
  "maxCost": 10.0,
  "maxTime": 120000
}
```

Response:

```json
{
  "success": true,
  "workflow": {
    "id": "wf_1234567890_abc123",
    "status": "planning",
    "createdAt": "2025-01-11T12:00:00Z"
  }
}
```

### Get Workflow Status

```http
GET /workflows/:id
```

### Approve Workflow

```http
POST /workflows/:id/approve

No request body needed. System checks escrow balance automatically.

Response on success:
{
  "success": true,
  "message": "Workflow approved and execution started"
}

Response on insufficient balance:
{
  "success": false,
  "error": "Insufficient escrow balance. Available: 0.5, Required: 2.0. Please top up."
}
```

### Real-time Updates

```javascript
const ws = new WebSocket('ws://localhost:5000/workflows/:id/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data.data);
};
```

Event types:
- `workflow.planning`
- `workflow.plan_ready`
- `workflow.awaiting_approval`
- `workflow.executing`
- `step.started`
- `step.progress`
- `step.completed`
- `workflow.completed`

### Get User Workflows

```http
GET /users/:userId/workflows?limit=50
```

### Cancel Workflow

```http
POST /workflows/:id/cancel
```

### Escrow Management

```http
GET /escrow/address
GET /escrow/:userId/balance
POST /escrow/:userId/create
POST /escrow/:userId/deposit
GET /escrow/:userId/history
POST /escrow/:userId/withdraw
```

See [ESCROW.md](./ESCROW.md) for detailed documentation.

## Programmatic Usage

```typescript
import { WorkflowManager } from '@x402-upl/reasoning';
import { Keypair, Connection, SystemProgram, Transaction } from '@solana/web3.js';

const escrowKeypair = Keypair.fromSecretKey(
  Buffer.from(process.env.ESCROW_KEYPAIR, 'base64')
);

const manager = new WorkflowManager({
  redisUrl: 'redis://localhost:6379',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  registryUrl: 'http://localhost:3001',
  solanaRpcUrl: 'https://api.devnet.solana.com',
  network: 'devnet',
  escrowKeypair,
});

const escrowManager = manager.getEscrowManager();

await escrowManager.createUserEscrow('user_123', userWallet.publicKey.toBase58());

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const depositTx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: userWallet.publicKey,
    toPubkey: escrowManager.getEscrowPublicKey(),
    lamports: 10_000_000_000,
  })
);

const signature = await connection.sendTransaction(depositTx, [userWallet]);
await connection.confirmTransaction(signature, 'confirmed');

await escrowManager.depositFunds('user_123', 10.0, signature);

const workflow = await manager.createWorkflow({
  userId: 'user_123',
  input: 'Fetch blockchain data and analyze trends',
  maxCost: 5.0,
});

manager.on('workflow-event', (event) => {
  console.log(event.type, event.data);
});

await manager.approveWorkflow(workflow.id);

const result = await manager.getWorkflow(workflow.id);
console.log(result.status, result.totalCost);

const balance = await escrowManager.getBalance('user_123');
console.log('Remaining balance:', balance);
```

## Database Setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Running the Server

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

## Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/server/index.js"]
```

## Performance

- Planning latency: <3s (with caching <100ms)
- Execution throughput: 100+ workflows/sec
- WebSocket connections: 10k+ concurrent
- Redis operations: <1ms p99
- Database queries: <10ms p95

## Security

- Rate limiting: 100 req/min per user
- Input validation with Zod schemas
- Session-based wallet approvals with spending limits
- Private keys never exposed or transmitted
- Browser wallet integration (Phantom, Solflare)
- Per-transaction and total spending limits
- Time-based approval expiration
- API key rotation supported
- Audit logging of all operations
- Redis auth and TLS support
- PostgreSQL SSL connections

## Monitoring

Metrics exposed at `/health`:

- Workflow success rate
- Average execution time
- Total cost processed
- Active workflows
- Queue depth
- Error rates

## License

Apache-2.0
