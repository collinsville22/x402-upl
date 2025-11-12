# @x402-upl/sdk

TypeScript/JavaScript SDK for x402 Universal Payment Layer with TAP authentication, agent identity, and CASH token support.

## Features

- HTTP 402 Payment Required protocol handling
- Automatic Solana payment execution (SOL, USDC, CASH)
- TAP (Trusted Agent Protocol) authentication
- Agent identity and reputation management
- Service discovery with reputation filtering
- CASH token (TOKEN_2022) native support
- Payment metrics and history tracking
- Spending limits and budget management

## Installation

```bash
npm install @x402-upl/sdk
```

## Quick Start

### Basic Usage (No TAP)

```typescript
import { Keypair } from '@solana/web3.js';
import { X402Client } from '@x402-upl/sdk';

const wallet = Keypair.generate();

const client = new X402Client({
  network: 'devnet',
  wallet,
  registryApiUrl: 'https://registry.x402.network',
});

const services = await client.discover({
  category: 'AI & ML',
  maxPrice: 0.1,
});

const result = await client.post(services[0].url, { query: 'test' });
console.log(result);
```

### With TAP Authentication

```typescript
import { Keypair } from '@solana/web3.js';
import { X402Client, RFC9421Signature } from '@x402-upl/sdk';

const wallet = Keypair.generate();
const { privateKey, publicKey } = RFC9421Signature.generateEd25519KeyPair();

const client = new X402Client({
  network: 'devnet',
  wallet,
  registryApiUrl: 'https://registry.x402.network',
  enableTAP: true,
  tapConfig: {
    keyId: wallet.publicKey.toBase58(),
    privateKey,
    algorithm: 'ed25519',
    registryUrl: 'https://registry.x402.network',
    did: `did:x402:${wallet.publicKey.toBase58().substring(0, 8)}`,
    visaTapCert: `cert_${wallet.publicKey.toBase58().substring(0, 8)}`,
  },
  agentIdentity: {
    did: `did:x402:${wallet.publicKey.toBase58().substring(0, 8)}`,
    visaTapCert: `cert_${wallet.publicKey.toBase58().substring(0, 8)}`,
    walletAddress: wallet.publicKey.toBase58(),
  },
  preferredTokens: ['CASH', 'USDC', 'SOL'],
});

const agentIdentity = await client.registerAgent(1.0);
console.log('Agent registered:', agentIdentity);
```

## API Reference

### X402Client

#### Constructor Options

```typescript
interface X402ClientConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  wallet: Keypair;
  rpcUrl?: string;
  registryApiUrl?: string;
  facilitatorUrl?: string;
  enableTAP?: boolean;
  tapConfig?: TAPConfig;
  agentIdentity?: AgentIdentity;
  preferredTokens?: string[];
}
```

#### Methods

**Service Discovery**

```typescript
await client.discover(options?: DiscoverOptions): Promise<X402Service[]>
```

Options:
- `category?: string` - Filter by category
- `maxPrice?: number` - Maximum price per call
- `minUptime?: number` - Minimum uptime percentage
- `minReputation?: number` - Minimum reputation score
- `sortBy?: 'price' | 'reputation' | 'value' | 'recent'`
- `limit?: number` - Maximum results

**Making Requests**

```typescript
await client.get<T>(url: string, params?: Record<string, any>): Promise<T>
await client.post<T>(url: string, data?: any, params?: Record<string, any>): Promise<T>
```

Automatically handles 402 responses and executes payments.

**Agent Registration (TAP Required)**

```typescript
await client.registerAgent(stake?: number): Promise<AgentIdentity>
```

Register as an agent on the x402 network with optional reputation stake.

**Agent Discovery (TAP Required)**

```typescript
await client.discoverAgents(filters?: {
  category?: string;
  minReputation?: number;
  verified?: boolean;
}): Promise<AgentIdentity[]>
```

**Wallet Operations**

```typescript
await client.getBalance(asset?: string): Promise<number>
client.getWalletAddress(): string
client.getWallet(): Keypair
```

**Metrics and History**

```typescript
client.getMetrics(): PaymentMetrics
client.getPaymentHistory(limit?: number): PaymentRecord[]
await client.fetchPaymentHistory(limit?: number): Promise<PaymentRecord[]>
```

### TAP Authentication

#### RFC 9421 HTTP Message Signatures

```typescript
import { RFC9421Signature } from '@x402-upl/sdk';

const { privateKey, publicKey } = RFC9421Signature.generateEd25519KeyPair();

const components = {
  authority: 'api.example.com',
  path: '/service',
};

const params = {
  created: Math.floor(Date.now() / 1000),
  expires: Math.floor(Date.now() / 1000) + 300,
  keyId: 'agent-key-123',
  alg: 'ed25519',
  nonce: RFC9421Signature.generateNonce(),
  tag: 'agent-payer-auth',
};

const result = await RFC9421Signature.signEd25519(components, params, privateKey);

console.log(result.signatureInput);
console.log(result.signature);
```

#### TAPClient

Lower-level TAP client for custom integrations:

```typescript
import { TAPClient } from '@x402-upl/sdk';

const tapClient = new TAPClient(
  {
    keyId: 'agent-123',
    privateKey,
    algorithm: 'ed25519',
    registryUrl: 'https://registry.x402.network',
  },
  agentIdentity
);

const headers = await tapClient.signRequest('https://api.example.com/service', 'POST');

console.log(headers);
```

## CASH Token Support

The SDK has native support for CASH token (TOKEN_2022 program):

```typescript
const balance = await client.getBalance('CASH');
console.log(`CASH balance: ${balance}`);
```

CASH mint address: `CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH`

When making payments, the SDK automatically:
- Detects CASH vs other SPL tokens
- Uses correct program ID (TOKEN_2022_PROGRAM_ID)
- Creates associated token accounts if needed
- Handles 6 decimal precision

## Agent Identity

```typescript
interface AgentIdentity {
  did: string;
  visaTapCert: string;
  walletAddress: string;
  reputationScore?: number;
}
```

Agent identity enables:
- Trusted agent-to-agent communication
- Reputation-based service discovery
- Credit lines for high-reputation agents (9000+)
- Verified service providers
- On-chain fraud protection

## Payment Flow

1. Client makes HTTP request to x402-enabled service
2. Service returns 402 Payment Required with payment details
3. SDK automatically executes Solana transaction
4. SDK retries request with X-Payment proof header
5. Service verifies payment on-chain and returns response

## Examples

### Service Provider

```typescript
import { X402Client } from '@x402-upl/sdk';

const client = new X402Client({
  network: 'mainnet-beta',
  wallet,
  registryApiUrl: 'https://registry.x402.network',
  enableTAP: true,
  tapConfig: { /* TAP config */ },
});

await client.registerService({
  url: 'https://api.example.com/analyze',
  name: 'Data Analysis Service',
  description: 'Real-time data analysis and visualization',
  category: 'Data Analytics',
  ownerWalletAddress: wallet.publicKey.toBase58(),
  pricePerCall: 0.05,
  acceptedTokens: ['SOL', 'USDC', 'CASH'],
  capabilities: ['statistical-analysis', 'visualization', 'forecasting'],
  tags: ['data', 'analytics', 'real-time'],
});
```

### Service Consumer

```typescript
const services = await client.discover({
  category: 'Data Analytics',
  maxPrice: 0.1,
  minReputation: 8000,
  sortBy: 'value',
});

for (const service of services) {
  console.log(`${service.name}: ${service.pricePerCall} SOL`);
  console.log(`Reputation: ${service.reputationScore}/10000`);
  console.log(`Uptime: ${service.metrics.uptime}%`);
}

const result = await client.post(services[0].url, {
  dataset: [1, 2, 3, 4, 5],
  analysis: 'regression',
});
```

### Agent-to-Agent Communication

```typescript
const agents = await client.discoverAgents({
  minReputation: 9000,
  verified: true,
});

console.log(`Found ${agents.length} highly trusted agents`);

for (const agent of agents) {
  console.log(`${agent.did}: Reputation ${agent.reputationScore}`);
}
```

## Spending Limits

```typescript
const client = new X402Client({
  network: 'devnet',
  wallet,
  spendingLimitPerHour: 1.0,
});

console.log(`Spent this hour: ${client.getSpentThisHour()} SOL`);
console.log(`Remaining budget: ${client.getRemainingHourlyBudget()} SOL`);
```

## Error Handling

```typescript
try {
  const result = await client.post(serviceUrl, data);
} catch (error) {
  if (error.response?.status === 402) {
    console.error('Payment required but failed');
  } else if (error.message.includes('Insufficient')) {
    console.error('Insufficient balance');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  X402ClientConfig,
  X402Service,
  PaymentMetrics,
  PaymentRecord,
  AgentIdentity,
  TAPConfig,
  SignatureAlgorithm,
} from '@x402-upl/sdk';
```

## Python, Rust, and Go SDKs

See respective directories:
- `@x402-upl/sdk/python`
- `@x402-upl/sdk/rust`
- `@x402-upl/sdk/go`

## License

MIT
