# JavaScript/TypeScript SDK

Complete guide for the X402-UPL JavaScript/TypeScript SDK.

**Package**: `@x402-upl/sdk`
**Version**: 1.0.0
**Location**: `C:\Users\User\x402-upl\packages\sdk\javascript`

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [X402Client API](#x402client-api)
4. [TAP Authentication](#tap-authentication)
5. [Service Discovery](#service-discovery)
6. [Payment Handling](#payment-handling)
7. [Agent Identity](#agent-identity)
8. [Error Handling](#error-handling)
9. [Advanced Usage](#advanced-usage)
10. [TypeScript Types](#typescript-types)

---

## Installation

```bash
npm install @x402-upl/sdk
# or
yarn add @x402-upl/sdk
# or
pnpm add @x402-upl/sdk
```

### Peer Dependencies

```bash
npm install @solana/web3.js @solana/spl-token
```

---

## Quick Start

### Basic Usage (No TAP)

```typescript
import { Keypair } from '@solana/web3.js';
import { X402Client } from '@x402-upl/sdk';

// Create wallet
const wallet = Keypair.generate();

// Initialize client
const client = new X402Client({
  network: 'devnet',
  wallet,
  registryApiUrl: 'https://registry.x402.network',
});

// Discover services
const services = await client.discover({
  category: 'AI & ML',
  maxPrice: 0.1,
});

// Call service (automatic payment handling)
const result = await client.post(services[0].url, {
  query: 'Analyze this text',
});

console.log(result);
```

### With TAP Authentication

```typescript
import { X402Client, RFC9421Signature } from '@x402-upl/sdk';
import { Keypair } from '@solana/web3.js';

const wallet = Keypair.generate();
const { privateKey, publicKey } = RFC9421Signature.generateEd25519KeyPair();

const client = new X402Client({
  network: 'devnet',
  wallet,
  enableTAP: true,
  tapConfig: {
    keyId: wallet.publicKey.toBase58(),
    privateKey,
    algorithm: 'ed25519',
    registryUrl: 'https://registry.x402.network',
  },
  agentIdentity: {
    did: `did:x402:${wallet.publicKey.toBase58().substring(0, 8)}`,
    visaTapCert: `cert_${wallet.publicKey.toBase58().substring(0, 8)}`,
    walletAddress: wallet.publicKey.toBase58(),
  },
  preferredTokens: ['CASH', 'USDC', 'SOL'],
});

// Register as agent
const agentIdentity = await client.registerAgent(1.0);
console.log('Agent DID:', agentIdentity.did);
```

---

## X402Client API

### Constructor

```typescript
new X402Client(config: X402ClientConfig)
```

**Config**:
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
  spendingLimitPerHour?: number;
}
```

**Example**:
```typescript
const client = new X402Client({
  network: 'devnet',
  wallet: Keypair.fromSecretKey(secretKey),
  rpcUrl: 'https://api.devnet.solana.com',
  registryApiUrl: 'https://registry.x402.network',
  spendingLimitPerHour: 1.0, // Max 1 SOL per hour
});
```

---

### Service Discovery

#### discover(options?: DiscoverOptions): Promise<X402Service[]>

Search for services with filters.

**Options**:
```typescript
interface DiscoverOptions {
  category?: string;
  maxPrice?: number;
  minUptime?: number;
  minReputation?: number;
  sortBy?: 'price' | 'reputation' | 'value' | 'recent';
  limit?: number;
  acceptedTokens?: string[];
}
```

**Example**:
```typescript
const services = await client.discover({
  category: 'AI & ML',
  maxPrice: 0.01,
  minReputation: 8000,
  acceptedTokens: ['CASH', 'USDC'],
  sortBy: 'value',
  limit: 10,
});

for (const service of services) {
  console.log(`${service.name}: ${service.pricePerCall} ${service.acceptedTokens[0]}`);
  console.log(`  Reputation: ${service.reputationScore}/10000`);
  console.log(`  Uptime: ${service.metrics.uptime}%`);
}
```

---

#### getService(serviceId: string): Promise<X402Service>

Get detailed service information.

**Example**:
```typescript
const service = await client.getService('svc_abc123');

console.log(service.name);
console.log(service.description);
console.log(`Price: ${service.pricePerCall}`);
console.log(`Rating: ${service.averageRating}/5`);
```

---

#### registerService(service: ServiceRegistration): Promise<X402Service>

Register your service in the registry.

**Example**:
```typescript
const service = await client.registerService({
  url: 'https://api.example.com/analyze',
  name: 'Sentiment Analysis API',
  description: 'Real-time sentiment analysis for text',
  category: 'AI & ML',
  ownerWalletAddress: wallet.publicKey.toBase58(),
  pricePerCall: 0.001,
  acceptedTokens: ['USDC', 'CASH'],
  capabilities: ['sentiment', 'emotion', 'sarcasm-detection'],
  tags: ['nlp', 'ai', 'text-analysis'],
});

console.log(`Service registered: ${service.id}`);
```

---

#### getCategories(): Promise<string[]>

Get list of service categories.

**Example**:
```typescript
const categories = await client.getCategories();
console.log(categories);
// ['AI & ML', 'Data Analytics', 'Storage', 'Compute', ...]
```

---

### Making Requests

#### get<T>(url: string, params?: Record<string, any>): Promise<T>

Make a GET request with automatic payment handling.

**Example**:
```typescript
const result = await client.get<{ temperature: number }>(
  'https://api.weather.com/current',
  { city: 'San Francisco' }
);

console.log(`Temperature: ${result.temperature}°F`);
```

---

#### post<T>(url: string, data?: any, params?: Record<string, any>): Promise<T>

Make a POST request with automatic payment handling.

**Example**:
```typescript
const analysis = await client.post<{ sentiment: string; confidence: number }>(
  'https://api.sentiment.com/analyze',
  { text: 'I love this product!' }
);

console.log(`Sentiment: ${analysis.sentiment} (${analysis.confidence * 100}%)`);
```

---

#### payAndFetch(serviceUrl: string, params?: unknown): Promise<unknown>

Alias for `post()` - more explicit about payment flow.

**Example**:
```typescript
const result = await client.payAndFetch(
  'https://api.example.com/service',
  { input: 'data' }
);
```

---

### Wallet Operations

#### getBalance(asset?: string): Promise<number>

Get wallet balance for SOL or SPL token.

**Example**:
```typescript
// Get SOL balance
const solBalance = await client.getBalance();
console.log(`SOL: ${solBalance}`);

// Get USDC balance
const usdcBalance = await client.getBalance('USDC');
console.log(`USDC: ${usdcBalance}`);

// Get CASH balance
const cashBalance = await client.getBalance('CASH');
console.log(`CASH: ${cashBalance}`);
```

---

#### getWalletAddress(): string

Get wallet public key as base58 string.

**Example**:
```typescript
const address = client.getWalletAddress();
console.log(`Wallet: ${address}`);
```

---

#### getWallet(): Keypair

Get the underlying Solana keypair.

**Example**:
```typescript
const wallet = client.getWallet();
const signature = await sign(message, wallet.secretKey);
```

---

### Payment Metrics

#### getMetrics(): PaymentMetrics

Get payment statistics.

**Example**:
```typescript
const metrics = client.getMetrics();

console.log(`Total spent: ${metrics.totalSpent} SOL`);
console.log(`Total earned: ${metrics.totalEarned} SOL`);
console.log(`Net profit: ${metrics.netProfit} SOL`);
console.log(`Transactions: ${metrics.transactionCount}`);
console.log(`Avg cost: ${metrics.averageCostPerInference} SOL`);
```

---

#### getPaymentHistory(limit?: number): PaymentRecord[]

Get recent payment history from memory.

**Example**:
```typescript
const history = client.getPaymentHistory(10);

for (const payment of history) {
  console.log(`${payment.type === 'sent' ? 'Paid' : 'Received'}: ${payment.amount} ${payment.asset}`);
  console.log(`  Signature: ${payment.signature}`);
  console.log(`  From: ${payment.from}`);
  console.log(`  To: ${payment.to}`);
}
```

---

#### fetchPaymentHistory(limit?: number): Promise<PaymentRecord[]>

Fetch payment history from blockchain.

**Example**:
```typescript
const history = await client.fetchPaymentHistory(50);
console.log(`Found ${history.length} transactions`);
```

---

### Spending Limits

#### getSpentThisHour(): number

Get amount spent in current hour.

**Example**:
```typescript
const spent = client.getSpentThisHour();
console.log(`Spent this hour: ${spent} SOL`);
```

---

#### getRemainingHourlyBudget(): number

Get remaining hourly budget.

**Example**:
```typescript
const remaining = client.getRemainingHourlyBudget();
console.log(`Remaining budget: ${remaining} SOL`);

if (remaining < 0.01) {
  console.warn('Low budget remaining!');
}
```

---

## TAP Authentication

### Enabling TAP

```typescript
import { RFC9421Signature } from '@x402-upl/sdk';

const { privateKey, publicKey } = RFC9421Signature.generateEd25519KeyPair();

const client = new X402Client({
  network: 'devnet',
  wallet,
  enableTAP: true,
  tapConfig: {
    keyId: wallet.publicKey.toBase58(),
    privateKey,
    algorithm: 'ed25519',
    registryUrl: 'https://registry.x402.network',
  },
});
```

---

### TAP Configuration

```typescript
interface TAPConfig {
  keyId: string;                      // Agent key ID
  privateKey: Uint8Array | string;    // Ed25519 private key
  algorithm: 'ed25519' | 'rsa-pss-sha256';
  registryUrl: string;                // Registry API URL
}
```

---

### RFC 9421 Signature Generation

```typescript
import { RFC9421Signature } from '@x402-upl/sdk';

// Generate key pair
const { privateKey, publicKey } = RFC9421Signature.generateEd25519KeyPair();

// Sign request
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

const result = await RFC9421Signature.signEd25519(
  components,
  params,
  privateKey
);

console.log('Signature-Input:', result.signatureInput);
console.log('Signature:', result.signature);
```

---

### Agent Registration

#### registerAgent(stake?: number): Promise<AgentIdentity>

Register as an agent on the x402 network.

**Example**:
```typescript
// Register with 1 SOL stake
const agentIdentity = await client.registerAgent(1.0);

console.log('Agent Identity:');
console.log(`  DID: ${agentIdentity.did}`);
console.log(`  Cert: ${agentIdentity.visaTapCert}`);
console.log(`  Wallet: ${agentIdentity.walletAddress}`);
console.log(`  Reputation: ${agentIdentity.reputationScore}/10000`);
```

---

### Agent Discovery

#### discoverAgents(filters?: AgentFilters): Promise<AgentIdentity[]>

Discover other agents.

**Example**:
```typescript
const agents = await client.discoverAgents({
  category: 'data-analysis',
  minReputation: 8500,
  verified: true,
});

for (const agent of agents) {
  console.log(`DID: ${agent.did}`);
  console.log(`  Reputation: ${agent.reputationScore}/10000`);
  console.log(`  Wallet: ${agent.walletAddress}`);
}
```

---

### Agent Identity Management

#### getAgentIdentity(): AgentIdentity | undefined

Get current agent identity.

**Example**:
```typescript
const identity = client.getAgentIdentity();

if (identity) {
  console.log(`Logged in as: ${identity.did}`);
} else {
  console.log('Not registered as agent');
}
```

---

### TAP Client Access

#### getTAPClient(): TAPClient | undefined

Get underlying TAP client for advanced operations.

**Example**:
```typescript
const tapClient = client.getTAPClient();

if (tapClient) {
  const headers = await tapClient.signRequest('https://api.example.com', 'POST');

  const response = await fetch('https://api.example.com', {
    method: 'POST',
    headers: Object.fromEntries(headers),
    body: JSON.stringify({ data: 'test' }),
  });
}
```

---

## Service Discovery

### ServiceDiscovery Class

For standalone service discovery without full client:

```typescript
import { ServiceDiscovery } from '@x402-upl/sdk';

const discovery = new ServiceDiscovery('https://registry.x402.network');

// Search services
const services = await discovery.search({
  category: 'AI & ML',
  maxPrice: 0.01,
});

// Get service by ID
const service = await discovery.getService('svc_abc123');

// Register service
const newService = await discovery.registerService({
  url: 'https://api.example.com',
  name: 'My Service',
  category: 'AI & ML',
  pricePerCall: 0.001,
  acceptedTokens: ['USDC'],
});
```

---

## Payment Handling

### Automatic Payment Flow

The SDK automatically handles the x402 payment flow:

```typescript
// 1. Client makes request
const result = await client.post('https://api.example.com/service', { data: 'input' });

// Behind the scenes:
// 1. SDK receives 402 Payment Required
// 2. SDK reads payment requirements
// 3. SDK creates Solana transaction
// 4. SDK signs and sends transaction
// 5. SDK retries request with X-Payment header
// 6. SDK returns final response
```

---

### Manual Payment Creation

For advanced use cases:

```typescript
import { SolanaX402Client } from '@x402-upl/sdk';

const solanaClient = new SolanaX402Client({
  network: 'devnet',
  wallet,
});

// Get requirements manually
const requirements = {
  payTo: 'ServiceWallet...',
  amount: '0.001',
  asset: 'SOL',
  nonce: 'abc123',
};

// Create payment
const paymentHeader = await solanaClient['createPayment'](requirements);

// Use in request
const response = await fetch('https://api.example.com', {
  headers: {
    'X-Payment': paymentHeader,
  },
});
```

---

### CASH Token Support

The SDK automatically handles CASH token (TOKEN_2022):

```typescript
// SDK detects CASH mint and uses TOKEN_2022_PROGRAM_ID
const client = new X402Client({
  network: 'devnet',
  wallet,
  preferredTokens: ['CASH'], // Prefer CASH over other tokens
});

// Payment automatically uses CASH if service accepts it
const result = await client.post(serviceUrl, data);
```

**CASH Mint Address**:
```typescript
import { CASH_MINT } from '@x402-upl/sdk';

console.log(CASH_MINT.toBase58());
// CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH
```

---

## Agent Identity

### AgentIdentity Interface

```typescript
interface AgentIdentity {
  did: string;              // Decentralized Identifier
  visaTapCert: string;      // Visa TAP certificate
  walletAddress: string;    // Solana wallet address
  reputationScore?: number; // 0-10000 reputation score
}
```

---

### DID Format

```typescript
// DID structure: did:x402:{first-8-chars-of-wallet}
const did = `did:x402:${wallet.publicKey.toBase58().substring(0, 8)}`;

// Example: did:x402:7xKXtg2C
```

---

### Agent-to-Agent Communication

```typescript
// Agent A discovers Agent B
const agents = await clientA.discoverAgents({
  category: 'data-analysis',
  minReputation: 9000,
});

const agentB = agents[0];

// Agent A calls Agent B with TAP authentication
const tapClient = clientA.getTAPClient();
const headers = await tapClient.signRequest(agentB.serviceUrl, 'POST');

const response = await fetch(agentB.serviceUrl, {
  method: 'POST',
  headers: {
    ...Object.fromEntries(headers),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ task: 'analyze' }),
});

const result = await response.json();
```

---

## Error Handling

### Error Types

```typescript
try {
  const result = await client.post(serviceUrl, data);
} catch (error) {
  if (error.response?.status === 402) {
    console.error('Payment required but failed');
  } else if (error.message.includes('Insufficient')) {
    console.error('Insufficient balance');
  } else if (error.message.includes('Rate limit')) {
    console.error('Rate limited - retry later');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

---

### Retry Logic

```typescript
async function callServiceWithRetry(
  client: X402Client,
  url: string,
  data: any,
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.post(url, data);
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

---

## Advanced Usage

### Connection Management

```typescript
import { Connection } from '@solana/web3.js';

// Get underlying Solana connection
const connection = client.getConnection();

// Use for direct blockchain interactions
const balance = await connection.getBalance(wallet.publicKey);
const latestBlockhash = await connection.getLatestBlockhash();
```

---

### Network Selection

```typescript
// Devnet (for development)
const devClient = new X402Client({
  network: 'devnet',
  wallet,
  rpcUrl: 'https://api.devnet.solana.com',
});

// Mainnet (for production)
const mainnetClient = new X402Client({
  network: 'mainnet-beta',
  wallet,
  rpcUrl: process.env.HELIUS_RPC_URL, // Premium RPC
});

// Custom RPC
const customClient = new X402Client({
  network: 'mainnet-beta',
  wallet,
  rpcUrl: 'https://my-custom-rpc.com',
});
```

---

### Token Preferences

```typescript
const client = new X402Client({
  network: 'devnet',
  wallet,
  preferredTokens: ['CASH', 'USDC', 'SOL'], // Priority order
});

// SDK will use CASH if service accepts it,
// otherwise USDC, then SOL
```

---

### Budget Management

```typescript
const client = new X402Client({
  network: 'devnet',
  wallet,
  spendingLimitPerHour: 1.0, // Max 1 SOL per hour
});

// Check before expensive operation
const remaining = client.getRemainingHourlyBudget();
if (remaining < 0.1) {
  throw new Error('Insufficient hourly budget');
}

// Make request
const result = await client.post(serviceUrl, data);

// Check updated budget
const newRemaining = client.getRemainingHourlyBudget();
console.log(`Remaining: ${newRemaining} SOL`);
```

---

### Custom Facilitator

```typescript
const client = new X402Client({
  network: 'devnet',
  wallet,
  facilitatorUrl: 'https://my-facilitator.com',
});

// Uses custom facilitator for payment routing
```

---

## TypeScript Types

### X402Service

```typescript
interface X402Service {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  ownerWalletAddress: string;
  pricePerCall: number;
  acceptedTokens: string[];
  capabilities?: string[];
  tags?: string[];
  reputationScore?: number;
  averageRating?: number;
  metrics?: {
    uptime: number;
    successRate: number;
    averageResponseTime: number;
  };
}
```

---

### PaymentMetrics

```typescript
interface PaymentMetrics {
  totalSpent: number;
  totalEarned: number;
  netProfit: number;
  transactionCount: number;
  averageCostPerInference: number;
}
```

---

### PaymentRecord

```typescript
interface PaymentRecord {
  signature: string;
  timestamp: number;
  amount: number;
  asset: string;
  type: 'sent' | 'received';
  from: string;
  to: string;
}
```

---

### PaymentRequirements

```typescript
interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  amount: string;
  memo?: string;
  timeout: number;
  nonce?: string;
}
```

---

### PaymentPayload

```typescript
interface PaymentPayload {
  network: string;
  asset: string;
  from: string;
  to: string;
  amount: string;
  signature: string;
  timestamp: number;
  nonce: string;
  memo?: string;
}
```

---

## Examples

### Complete Agent Example

```typescript
import { Keypair } from '@solana/web3.js';
import { X402Client, RFC9421Signature } from '@x402-upl/sdk';

// Setup
const wallet = Keypair.generate();
const { privateKey } = RFC9421Signature.generateEd25519KeyPair();

const client = new X402Client({
  network: 'devnet',
  wallet,
  enableTAP: true,
  tapConfig: {
    keyId: wallet.publicKey.toBase58(),
    privateKey,
    algorithm: 'ed25519',
    registryUrl: 'https://registry.x402.network',
  },
  agentIdentity: {
    did: `did:x402:${wallet.publicKey.toBase58().substring(0, 8)}`,
    visaTapCert: `cert_${wallet.publicKey.toBase58().substring(0, 8)}`,
    walletAddress: wallet.publicKey.toBase58(),
  },
  spendingLimitPerHour: 1.0,
});

// Register as agent
const identity = await client.registerAgent(1.0);
console.log(`Registered as ${identity.did}`);

// Discover services
const services = await client.discover({
  category: 'AI & ML',
  maxPrice: 0.01,
  minReputation: 8000,
});

console.log(`Found ${services.length} services`);

// Call service
for (const service of services.slice(0, 3)) {
  console.log(`\nCalling ${service.name}...`);

  const result = await client.post(service.url, {
    input: 'test data',
  });

  console.log('Result:', result);
}

// Check metrics
const metrics = client.getMetrics();
console.log(`\nTotal spent: ${metrics.totalSpent} SOL`);
console.log(`Average cost: ${metrics.averageCostPerInference} SOL`);
```

---

### Service Provider Example

```typescript
import { X402Client } from '@x402-upl/sdk';
import { Keypair } from '@solana/web3.js';

const wallet = Keypair.fromSecretKey(secretKey);

const client = new X402Client({
  network: 'mainnet-beta',
  wallet,
  rpcUrl: process.env.HELIUS_RPC_URL,
});

// Register service
const service = await client.registerService({
  url: 'https://api.myservice.com/analyze',
  name: 'Advanced Sentiment Analysis',
  description: 'State-of-the-art sentiment analysis with emotion detection',
  category: 'AI & ML',
  ownerWalletAddress: wallet.publicKey.toBase58(),
  pricePerCall: 0.002,
  acceptedTokens: ['USDC', 'CASH'],
  capabilities: ['sentiment', 'emotion', 'sarcasm', 'context'],
  tags: ['nlp', 'ai', 'gpt-4', 'production'],
});

console.log(`Service registered: ${service.id}`);
console.log(`Access at: ${service.url}`);
```

---

## Summary

The X402-UPL JavaScript/TypeScript SDK provides:

- **Automatic Payment Handling**: Transparent x402 protocol implementation
- **Service Discovery**: Find and filter services by category, price, reputation
- **TAP Authentication**: RFC 9421 HTTP message signatures for agents
- **Multi-Token Support**: SOL, USDC, CASH (Token-2022)
- **Budget Management**: Hourly spending limits and tracking
- **Agent Identity**: DID-based agent registration and discovery
- **TypeScript Support**: Full type definitions included

For more information:
- [Core Concepts](../guides/concepts.md)
- [Best Practices](../guides/best-practices.md)
- [Facilitator API](../api-reference/facilitator-api.md)
- [Troubleshooting](../troubleshooting/common-issues.md)
