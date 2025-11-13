# Phantom CASH Integration

## Overview

The Phantom CASH integration implements the HTTP 402 Payment Required protocol with CASH Token-2022 micropayments on Solana, enabling autonomous AI agents to discover, pay for, and consume paid services seamlessly. This production-grade implementation combines three cutting-edge technologies:

1. **HTTP 402 Payment Required Protocol**: Industry-standard protocol for API monetization
2. **Phantom CASH**: USD-pegged stablecoin with gasless transactions using Token-2022 standard
3. **LLM-Powered Autonomy**: GPT-4 driven service discovery, workflow planning, and execution

### Key Capabilities

- Automatic HTTP 402 response detection and payment handling
- Gasless CASH token transfers using Token-2022 program
- AI-powered service discovery and multi-step workflow planning
- Budget management with spending limits and cost optimization
- Payment verification and transaction tracking
- Integration with X402 service registry for service discovery
- Optional Visa TAP authentication for enhanced security

### CASH Token Details

- **Mint Address**: `CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH`
- **Token Standard**: SPL Token-2022
- **Decimals**: 6
- **Peg**: 1 CASH = 1 USD
- **Network**: Solana mainnet-beta / devnet

## Features

### 1. Production HTTP 402 Implementation

The client automatically handles the complete HTTP 402 payment flow:

- **Automatic 402 Detection**: Intercepts HTTP 402 responses from services
- **Payment Header Construction**: Creates compliant payment proofs per X402 spec
- **Transaction Verification**: Confirms on-chain transactions before retry
- **Comprehensive Error Handling**: Graceful handling of network, payment, and service errors
- **Retry Logic**: Automatically retries requests with payment headers after successful payment

### 2. Gasless Token-2022 Transactions

Leverages Solana's Token-2022 program for enhanced token functionality:

- **Automatic ATA Creation**: Creates Associated Token Accounts as needed
- **Gasless Transfers**: Fee sponsor support for zero-cost transactions
- **6 Decimal Precision**: Accurate micropayments down to $0.000001
- **Balance Checking**: Real-time SOL and CASH balance queries
- **Transaction Verification**: On-chain confirmation of all payments

### 3. Autonomous Agent Capabilities

Powered by GPT-4 for intelligent decision-making:

- **Service Discovery**: LLM-powered search and selection of X402 services
- **Multi-Step Planning**: Creates optimal execution chains considering cost and dependencies
- **Cost Optimization**: Identifies cheaper alternatives and eliminates redundancies
- **Parallel Execution**: Analyzes dependencies for concurrent service calls
- **Budget Management**: Enforces spending limits per hour/task with real-time tracking
- **Result Analysis**: AI-generated insights on execution efficiency and outcomes

### 4. Enterprise-Grade Quality

Built for production deployment:

- **TypeScript**: Strict type safety throughout
- **Error Handling**: Comprehensive error types and graceful degradation
- **Thread Safety**: Safe concurrent operations with proper state management
- **Logging**: Structured logging for observability
- **Testing**: Full integration test suite
- **Metrics**: Real-time payment and performance metrics

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│            PhantomAgent (Orchestration)                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐              ┌──────────────────┐     │
│  │  AgentBrain  │◄────────────►│ ServiceRegistry  │     │
│  │   (GPT-4)    │              │   (Discovery)    │     │
│  └──────┬───────┘              └──────────────────┘     │
│         │                                                │
│         │ Plans execution chain                         │
│         ▼                                                │
│  ┌──────────────────────────────────────┐               │
│  │       ExecutionEngine                │               │
│  │    (Workflow Execution)              │               │
│  └──────────────┬───────────────────────┘               │
│                 │                                        │
│                 │ Executes service calls                │
│                 ▼                                        │
│  ┌──────────────────────────────────────┐               │
│  │         X402Handler                  │               │
│  │     (Payment Protocol)               │               │
│  └──────────────┬───────────────────────┘               │
│                 │                                        │
│                 │ Handles HTTP 402                      │
│                 ▼                                        │
│  ┌──────────────────────────────────────┐               │
│  │   PhantomCashX402Client              │               │
│  │   (Token-2022 Payments)              │               │
│  └──────────────┬───────────────────────┘               │
│                 │                                        │
└─────────────────┼────────────────────────────────────────┘
                  │
                  │ On-chain transactions
                  ▼
         ┌────────────────────┐
         │       Solana       │
         │  (CASH Token-2022) │
         └────────────────────┘
```

### HTTP 402 Payment Flow

```
┌──────┐                 ┌─────────┐                ┌────────┐
│Agent │                 │ Service │                │ Solana │
└──┬───┘                 └────┬────┘                └───┬────┘
   │                          │                         │
   │ GET /api/data            │                         │
   ├─────────────────────────►│                         │
   │                          │                         │
   │ 402 Payment Required     │                         │
   │ {payTo, amount, asset}   │                         │
   │◄─────────────────────────┤                         │
   │                          │                         │
   │ Parse requirements       │                         │
   │                          │                         │
   │ Send CASH payment        │                         │
   ├──────────────────────────┼────────────────────────►│
   │                          │                         │
   │                          │        Confirm TX       │
   │◄─────────────────────────┼─────────────────────────┤
   │                          │                         │
   │ GET /api/data            │                         │
   │ X-Payment: {signature}   │                         │
   ├─────────────────────────►│                         │
   │                          │                         │
   │                          │ Verify payment          │
   │                          ├────────────────────────►│
   │                          │                         │
   │                          │ Payment verified        │
   │                          │◄────────────────────────┤
   │                          │                         │
   │ 200 OK + data            │                         │
   │◄─────────────────────────┤                         │
   │                          │                         │
```

### Component Responsibilities

#### PhantomAgent
- Orchestrates all components
- Manages wallet and balances
- Enforces spending limits
- Tracks payment history
- Provides high-level API

#### AgentBrain
- Plans service execution chains using GPT-4
- Optimizes plans for cost and efficiency
- Analyzes execution results
- Generates insights and recommendations

#### ExecutionEngine
- Executes planned service chains
- Handles dependencies via topological sort
- Tracks execution progress
- Aggregates results

#### X402Handler
- Wraps PhantomCashX402Client
- Provides service call interface
- Returns standardized responses
- Tracks payments

#### PhantomCashX402Client
- Low-level HTTP client with 402 handling
- Creates and sends CASH payments
- Constructs payment headers
- Manages spending limits

#### ServiceRegistry
- Stores local service definitions
- Integrates with remote X402 registry
- Provides search and discovery
- Calculates costs

## Installation

### Prerequisites

- Node.js 18+ or Bun runtime
- Solana wallet with SOL for gas fees
- CASH tokens for payments
- OpenAI API key for GPT-4 access

### Package Installation

```bash
# Using npm
npm install @x402-upl/phantom-cash

# Using pnpm
pnpm add @x402-upl/phantom-cash

# Using yarn
yarn add @x402-upl/phantom-cash

# Using bun
bun add @x402-upl/phantom-cash
```

### Dependencies

The package includes these key dependencies:

```json
{
  "@solana/web3.js": "^1.95.8",
  "@solana/spl-token": "^0.4.9",
  "axios": "^1.7.9",
  "openai": "^4.73.1"
}
```

### Development Setup

Clone and build the integration:

```bash
# Clone the repository
git clone https://github.com/your-org/x402-upl.git
cd x402-upl/packages/integrations/phantom-cash

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Required: OpenAI API key for GPT-4
OPENAI_API_KEY=sk-...

# Required: Path to Solana wallet keypair JSON
WALLET_PATH=./wallet.json

# Optional: Custom Solana RPC endpoint
RPC_URL=https://api.mainnet-beta.solana.com

# Optional: Network selection
NETWORK=mainnet-beta  # or 'devnet'

# Optional: X402 service registry URL
REGISTRY_URL=https://registry.x402.network

# Optional: Spending limit per hour in CASH
SPENDING_LIMIT_PER_HOUR=10.0

# Optional: LLM model selection
LLM_MODEL=gpt-4
```

### Wallet Setup

#### Generate New Wallet

```typescript
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Generate new keypair
const wallet = Keypair.generate();

// Save to file
const secretKey = Array.from(wallet.secretKey);
fs.writeFileSync('wallet.json', JSON.stringify(secretKey));

console.log('Wallet address:', wallet.publicKey.toBase58());
```

#### Load Existing Wallet

```typescript
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Load from file
const secretKey = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

console.log('Loaded wallet:', wallet.publicKey.toBase58());
```

#### Import from Phantom Extension

Export your private key from Phantom wallet and convert to Keypair:

```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// If you have base58 encoded private key
const privateKeyBase58 = 'your-private-key-here';
const wallet = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
```

### Network Configuration

#### Mainnet Configuration

```typescript
import { PhantomAgent } from '@x402-upl/phantom-cash';

const agent = new PhantomAgent({
  wallet: myWallet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  network: 'mainnet-beta',
  rpcUrl: 'https://api.mainnet-beta.solana.com', // or use Helius/QuickNode
  spendingLimitPerHour: 100.0, // CASH limit
});
```

#### Devnet Configuration

```typescript
const agent = new PhantomAgent({
  wallet: myWallet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  spendingLimitPerHour: 10.0,
});
```

### Spending Limits

Configure spending limits to control costs:

```typescript
const agent = new PhantomAgent({
  wallet: myWallet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  network: 'mainnet-beta',
  spendingLimitPerHour: 50.0, // Maximum $50 per hour
});

// Check current spending
const spent = agent.getSpentThisHour();
const remaining = agent.getRemainingHourlyBudget();

console.log(`Spent this hour: ${spent} CASH`);
console.log(`Remaining budget: ${remaining} CASH`);
```

## Usage

### Basic Agent Setup

```typescript
import { Keypair } from '@solana/web3.js';
import { PhantomAgent } from '@x402-upl/phantom-cash';
import fs from 'fs';

// Load wallet
const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

// Initialize agent
const agent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  network: 'mainnet-beta',
  spendingLimitPerHour: 10.0,
  llmModel: 'gpt-4',
});

// Check balances
console.log('Wallet:', await agent.getWalletAddress());
console.log('SOL Balance:', await agent.getSolBalance());
console.log('CASH Balance:', await agent.getCashBalance());
```

### Service Discovery

#### Manual Service Registration

Register services manually for local registry:

```typescript
import { X402Service } from '@x402-upl/phantom-cash';

const priceOracle: X402Service = {
  serviceId: 'coingecko-price',
  name: 'CoinGecko Price Oracle',
  description: 'Get real-time cryptocurrency prices',
  endpoint: 'https://api.x402.network/coingecko/price',
  method: 'GET',
  costCash: 0.01, // $0.01 per call
  paymentAddress: 'RECIPIENT_WALLET_ADDRESS',
  parameters: {
    ids: {
      type: 'string',
      description: 'Cryptocurrency IDs (comma-separated)',
      required: true,
    },
    vs_currencies: {
      type: 'string',
      description: 'Fiat currencies (comma-separated)',
      required: true,
    },
  },
  category: ['price', 'data', 'crypto'],
};

agent.registerService(priceOracle);
```

#### Using X402 Registry

Connect to remote service registry:

```typescript
const agent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  network: 'mainnet-beta',
  registryUrl: 'https://registry.x402.network',
});

// Discover services
const allServices = await agent.listServices();
console.log(`Found ${allServices.length} services`);

// Search by keyword
const aiServices = await agent.searchServices('artificial intelligence');

// Filter by category
const priceServices = await agent.findServicesByCategory('price');

console.log('AI Services:', aiServices.map(s => s.name));
console.log('Price Services:', priceServices.map(s => s.name));
```

### Executing Tasks

#### Simple Task Execution

```typescript
import { AgentTask } from '@x402-upl/phantom-cash';

const task: AgentTask = {
  taskId: 'price-check-001',
  description: 'Get current price of Solana in USD',
  maxBudget: 0.05, // Maximum $0.05 to spend
};

const report = await agent.executeTask(task);

console.log('Task completed:', report.execution.success);
console.log('Total cost:', report.execution.totalCost, 'CASH');
console.log('Execution time:', report.execution.totalTime, 'ms');
console.log('\nAnalysis:', report.analysis);
```

#### Multi-Step Workflow

```typescript
const complexTask: AgentTask = {
  taskId: 'market-analysis-001',
  description: `Perform comprehensive market analysis for Solana:
    1. Get current SOL price from multiple sources
    2. Analyze trading volume and liquidity
    3. Check social media sentiment
    4. Calculate technical indicators (RSI, MACD)
    5. Generate investment recommendation`,
  maxBudget: 0.50, // $0.50 budget
};

const report = await agent.executeTask(complexTask);

// Review execution plan
console.log('Execution Plan:');
report.plan.steps.forEach((step, i) => {
  console.log(`${i + 1}. ${step.serviceId} - Cost: ${step.costCash} CASH`);
  console.log(`   Parameters:`, step.parameters);
  console.log(`   Depends on:`, step.dependsOn.length > 0 ? step.dependsOn : 'None');
});

// Review results
console.log('\nExecution Results:');
report.execution.steps.forEach(step => {
  console.log(`Step ${step.stepNumber}: ${step.serviceId}`);
  console.log(`  Success: ${step.success}`);
  console.log(`  Cost: ${step.cost} CASH`);
  console.log(`  Time: ${step.executionTime}ms`);
  if (step.data) {
    console.log(`  Data:`, JSON.stringify(step.data, null, 2));
  }
});

// AI-generated analysis
console.log('\nAgent Analysis:');
console.log(report.analysis);
```

### Payment Management

#### Tracking Payments

```typescript
// Get payment history
const payments = agent.getPaymentHistory();

console.log(`Total payments: ${payments.length}`);

payments.forEach(payment => {
  console.log(`\nSignature: ${payment.signature}`);
  console.log(`Amount: ${payment.amount} ${payment.currency}`);
  console.log(`Time: ${new Date(payment.timestamp).toISOString()}`);
});

// Get metrics
const metrics = agent.getMetrics();
console.log('\nPayment Metrics:');
console.log(`Total spent: ${metrics.totalSpent} CASH`);
console.log(`Total earned: ${metrics.totalEarned} CASH`);
console.log(`Net: ${metrics.netProfit} CASH`);
console.log(`Transactions: ${metrics.transactionCount}`);
console.log(`Average cost: ${metrics.averageCostPerInference} CASH`);
```

#### Verifying Transactions

```typescript
// Verify specific transaction
const signature = 'YOUR_TX_SIGNATURE';
const isValid = await agent.verifyTransaction(signature);

console.log(`Transaction ${signature} is ${isValid ? 'valid' : 'invalid'}`);

// Get transaction details
const client = agent['cashClient']; // Access internal client
const txDetails = await client.getTransactionDetails(signature);

console.log('Transaction details:', txDetails);
```

### Direct X402 Service Calls

For more control, call services directly without agent planning:

```typescript
import { X402Handler, PhantomCashX402Client } from '@x402-upl/phantom-cash';

// Create client
const client = new PhantomCashX402Client({
  wallet,
  network: 'mainnet-beta',
  spendingLimitPerHour: 10.0,
});

// Create handler
const handler = new X402Handler(client);

// Call service
const response = await handler.callService({
  url: 'https://api.x402.network/coingecko/price',
  method: 'GET',
  params: {
    ids: 'solana',
    vs_currencies: 'usd',
  },
});

if (response.success) {
  console.log('Response data:', response.data);
} else {
  console.error('Error:', response.error);
}
```

### Using Low-Level CASH Client

For simple CASH transfers without HTTP 402:

```typescript
import { PhantomCashClient, CASH_MINT } from '@x402-upl/phantom-cash';

// Create CASH client
const cashClient = new PhantomCashClient(wallet, 'mainnet-beta');

// Get CASH balance
const balance = await cashClient.getCashBalance();
console.log('CASH Balance:', balance);

// Send CASH
const result = await cashClient.sendCash(
  'RECIPIENT_ADDRESS',
  1.50, // 1.50 CASH ($1.50)
  'Payment for API services'
);

console.log('Transaction signature:', result.signature);
console.log('Amount sent:', result.amount, 'CASH');

// Verify transaction
const verified = await cashClient.verifyTransaction(result.signature);
console.log('Transaction verified:', verified);
```

## API Reference

### PhantomAgent

Main orchestration class for autonomous agent operations.

#### Constructor

```typescript
constructor(config: PhantomAgentConfig)
```

**Parameters:**
- `config.wallet` (Keypair): Solana wallet keypair
- `config.openaiApiKey` (string): OpenAI API key for GPT-4
- `config.network` ('devnet' | 'mainnet-beta'): Solana network (default: 'mainnet-beta')
- `config.rpcUrl` (string, optional): Custom RPC endpoint
- `config.spendingLimitPerHour` (number, optional): Hourly spending limit in CASH
- `config.llmModel` (string, optional): LLM model (default: 'gpt-4')
- `config.registryUrl` (string, optional): X402 registry URL

#### Methods

##### executeTask()

Execute an autonomous task with AI planning.

```typescript
async executeTask(task: AgentTask): Promise<AgentExecutionReport>
```

**Parameters:**
- `task.taskId` (string): Unique task identifier
- `task.description` (string): Natural language task description
- `task.maxBudget` (number): Maximum CASH budget for task

**Returns:** `AgentExecutionReport` with plan, execution results, and analysis

**Throws:**
- Error if insufficient CASH balance
- Error if LLM planning fails
- Error if budget exceeded during execution

##### getWalletAddress()

Get the agent's Solana wallet address.

```typescript
async getWalletAddress(): Promise<string>
```

**Returns:** Base58-encoded wallet address

##### getSolBalance()

Get SOL balance in the wallet.

```typescript
async getSolBalance(): Promise<number>
```

**Returns:** SOL balance as a number

##### getCashBalance()

Get CASH token balance.

```typescript
async getCashBalance(): Promise<number>
```

**Returns:** CASH balance (e.g., 100.50 for $100.50)

##### registerService()

Register a service in the local registry.

```typescript
registerService(service: X402Service): void
```

**Parameters:**
- `service` (X402Service): Service definition object

##### listServices()

List all available services.

```typescript
async listServices(): Promise<X402Service[]>
```

**Returns:** Array of service definitions

##### searchServices()

Search for services by keyword.

```typescript
async searchServices(query: string): Promise<X402Service[]>
```

**Parameters:**
- `query` (string): Search query

**Returns:** Matching services

##### findServicesByCategory()

Find services by category.

```typescript
async findServicesByCategory(category: string): Promise<X402Service[]>
```

**Parameters:**
- `category` (string): Category name

**Returns:** Services in category

##### getMetrics()

Get payment metrics.

```typescript
getMetrics(): PaymentMetrics
```

**Returns:** Object with totalSpent, totalEarned, netProfit, transactionCount, averageCostPerInference

##### getSpentThisHour()

Get amount spent in current hour.

```typescript
getSpentThisHour(): number
```

**Returns:** CASH spent in current hour

##### getRemainingHourlyBudget()

Get remaining hourly budget.

```typescript
getRemainingHourlyBudget(): number
```

**Returns:** Remaining CASH budget for current hour

##### getPaymentHistory()

Get payment history.

```typescript
getPaymentHistory(): X402PaymentProof[]
```

**Returns:** Array of payment records

##### getTotalSpent()

Get total amount spent.

```typescript
getTotalSpent(): number
```

**Returns:** Total CASH spent

##### verifyTransaction()

Verify a transaction on-chain.

```typescript
async verifyTransaction(signature: string): Promise<boolean>
```

**Parameters:**
- `signature` (string): Transaction signature

**Returns:** true if transaction is confirmed and successful

### PhantomCashX402Client

Low-level HTTP client with automatic HTTP 402 handling.

#### Constructor

```typescript
constructor(config: PhantomCashX402Config)
```

**Parameters:**
- `config.wallet` (Keypair): Solana wallet
- `config.network` ('devnet' | 'mainnet-beta'): Network
- `config.rpcUrl` (string, optional): Custom RPC
- `config.spendingLimitPerHour` (number, optional): Spending limit
- `config.timeout` (number, optional): HTTP timeout in ms (default: 30000)

#### Methods

##### get()

Make GET request with automatic 402 handling.

```typescript
async get<T = any>(url: string, params?: Record<string, any>): Promise<T>
```

**Parameters:**
- `url` (string): Request URL
- `params` (object, optional): Query parameters

**Returns:** Response data

**Throws:** PhantomCashX402Error on failure

##### post()

Make POST request with automatic 402 handling.

```typescript
async post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<T>
```

**Parameters:**
- `url` (string): Request URL
- `data` (any, optional): Request body
- `params` (object, optional): Query parameters

**Returns:** Response data

**Throws:** PhantomCashX402Error on failure

##### getWalletAddress()

Get wallet address.

```typescript
async getWalletAddress(): Promise<string>
```

##### getSolBalance()

Get SOL balance.

```typescript
async getSolBalance(): Promise<number>
```

##### getCashBalance()

Get CASH balance.

```typescript
async getCashBalance(): Promise<number>
```

##### getMetrics()

Get payment metrics.

```typescript
getMetrics(): PaymentMetrics
```

##### getPaymentHistory()

Get payment history.

```typescript
getPaymentHistory(limit?: number): PaymentRecord[]
```

**Parameters:**
- `limit` (number, optional): Maximum records to return

**Returns:** Payment records (newest first)

##### getSpentThisHour()

Get amount spent in current hour.

```typescript
getSpentThisHour(): number
```

##### getRemainingHourlyBudget()

Get remaining budget for current hour.

```typescript
getRemainingHourlyBudget(): number
```

##### verifyTransaction()

Verify transaction on-chain.

```typescript
async verifyTransaction(signature: string): Promise<boolean>
```

### PhantomCashClient

Basic CASH token client for transfers without HTTP 402.

#### Constructor

```typescript
constructor(wallet: Keypair, network: 'devnet' | 'mainnet-beta' = 'mainnet-beta')
```

#### Methods

##### getWalletAddress()

```typescript
async getWalletAddress(): Promise<string>
```

##### getSolBalance()

```typescript
async getSolBalance(): Promise<number>
```

##### getCashBalance()

```typescript
async getCashBalance(): Promise<number>
```

##### sendCash()

Send CASH tokens to recipient.

```typescript
async sendCash(
  recipientAddress: string,
  amount: number,
  memo?: string
): Promise<TransferResult>
```

**Parameters:**
- `recipientAddress` (string): Recipient's wallet address
- `amount` (number): Amount in CASH
- `memo` (string, optional): Transaction memo

**Returns:** Object with signature, amount, recipient

##### verifyTransaction()

```typescript
async verifyTransaction(signature: string): Promise<boolean>
```

##### requestAirdrop()

Request SOL airdrop (devnet only).

```typescript
async requestAirdrop(lamports: number = LAMPORTS_PER_SOL): Promise<string>
```

**Parameters:**
- `lamports` (number): Amount in lamports (default: 1 SOL)

**Returns:** Airdrop signature

**Throws:** Error if not on devnet

### TAPPhantomAgent

Extended agent with Visa TAP authentication support.

#### Constructor

```typescript
constructor(config: TAPPhantomAgentConfig)
```

**Additional Config:**
- `config.tap.registryUrl` (string, optional): TAP registry URL
- `config.tap.name` (string): Agent name
- `config.tap.domain` (string): Agent domain
- `config.tap.description` (string, optional): Agent description
- `config.tap.contactEmail` (string, optional): Contact email
- `config.tap.algorithm` ('ed25519' | 'rsa-pss-sha256', optional): Signing algorithm
- `config.ownerDID` (string): Owner DID

#### Methods

##### initialize()

Initialize and register with TAP.

```typescript
async initialize(): Promise<void>
```

##### executeTaskWithTAP()

Execute task with TAP authentication.

```typescript
async executeTaskWithTAP(task: string): Promise<AgentExecutionReport>
```

##### callServiceWithTAP()

Call service with TAP authentication.

```typescript
async callServiceWithTAP(
  url: string,
  options?: {
    tag?: 'agent-browser-auth' | 'agent-payer-auth';
    method?: 'GET' | 'POST';
    data?: any;
  }
): Promise<any>
```

##### getTAPIdentity()

Get TAP identity information.

```typescript
getTAPIdentity(): {
  keyId: string;
  algorithm: string;
  publicKey: string;
  agent: AgentResponse | null;
} | null
```

##### isTAPRegistered()

Check if registered with TAP.

```typescript
isTAPRegistered(): boolean
```

##### exportTAPPrivateKey()

Export TAP private key.

```typescript
exportTAPPrivateKey(): string | null
```

##### Static: loadFromTAPRegistry()

Load existing TAP registration.

```typescript
static async loadFromTAPRegistry(
  config: TAPPhantomAgentConfig,
  tapPrivateKey: string,
  tapKeyId: string
): Promise<TAPPhantomAgent>
```

### Types

#### AgentTask

```typescript
interface AgentTask {
  taskId: string;
  description: string;
  maxBudget: number;
}
```

#### AgentExecutionReport

```typescript
interface AgentExecutionReport {
  task: AgentTask;
  plan: ServiceChainPlan;
  execution: ExecutionResult;
  analysis: string;
  timestamp: number;
  walletAddress: string;
  initialCashBalance: number;
  finalCashBalance: number;
  initialSolBalance: number;
  finalSolBalance: number;
}
```

#### X402Service

```typescript
interface X402Service {
  serviceId: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  costCash: number;
  paymentAddress: string;
  parameters: Record<string, ServiceParameter>;
  category: string[];
}
```

#### PaymentMetrics

```typescript
interface PaymentMetrics {
  totalSpent: number;
  totalEarned: number;
  netProfit: number;
  transactionCount: number;
  averageCostPerInference: number;
}
```

#### PhantomCashX402Error

Custom error class for payment errors.

```typescript
class PhantomCashX402Error extends Error {
  code: string;
  details?: any;
}
```

**Error Codes:**
- `EMPTY_RESPONSE`: Empty response after payment
- `HTTP_ERROR`: HTTP error status
- `NETWORK_ERROR`: Network/connection error
- `INVALID_PAYMENT_REQUIREMENTS`: Invalid 402 response format
- `MISSING_FIELD`: Required field missing in payment requirements
- `UNSUPPORTED_SCHEME`: Unsupported payment scheme
- `INVALID_AMOUNT`: Invalid payment amount
- `SPENDING_LIMIT_EXCEEDED`: Hourly spending limit exceeded
- `INVALID_ADDRESS`: Invalid recipient address
- `UNSUPPORTED_ASSET`: Unsupported payment asset
- `INSUFFICIENT_BALANCE`: Insufficient token balance

## Examples

### Example 1: Simple Price Check

Check cryptocurrency prices with automatic payment:

```typescript
import { Keypair } from '@solana/web3.js';
import { PhantomAgent, X402Service } from '@x402-upl/phantom-cash';
import fs from 'fs';

async function priceCheck() {
  // Load wallet
  const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  // Initialize agent
  const agent = new PhantomAgent({
    wallet,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    network: 'mainnet-beta',
    spendingLimitPerHour: 10.0,
  });

  console.log('Agent initialized');
  console.log('Wallet:', await agent.getWalletAddress());
  console.log('CASH Balance:', await agent.getCashBalance());

  // Register price service
  const priceService: X402Service = {
    serviceId: 'coingecko-price',
    name: 'CoinGecko Price API',
    description: 'Get real-time cryptocurrency prices',
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    method: 'GET',
    costCash: 0.01,
    paymentAddress: 'YOUR_PAYMENT_ADDRESS',
    parameters: {
      ids: {
        type: 'string',
        description: 'Cryptocurrency IDs',
        required: true,
      },
      vs_currencies: {
        type: 'string',
        description: 'Fiat currencies',
        required: true,
      },
    },
    category: ['price', 'data'],
  };

  agent.registerService(priceService);

  // Execute task
  const task = {
    taskId: 'price-001',
    description: 'Get current price of Bitcoin, Ethereum, and Solana in USD',
    maxBudget: 0.05,
  };

  const report = await agent.executeTask(task);

  // Display results
  console.log('\n=== RESULTS ===');
  console.log('Success:', report.execution.success);
  console.log('Cost:', report.execution.totalCost, 'CASH');

  report.execution.steps.forEach(step => {
    if (step.success && step.data) {
      console.log('\nPrice Data:');
      console.log(JSON.stringify(step.data, null, 2));
    }
  });

  console.log('\nAnalysis:', report.analysis);
}

priceCheck().catch(console.error);
```

### Example 2: Market Analysis Agent

Comprehensive market analysis using multiple services:

```typescript
import { Keypair } from '@solana/web3.js';
import { PhantomAgent, X402Service } from '@x402-upl/phantom-cash';
import fs from 'fs';

async function marketAnalysis() {
  const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  const agent = new PhantomAgent({
    wallet,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    network: 'mainnet-beta',
    spendingLimitPerHour: 50.0,
    llmModel: 'gpt-4',
  });

  const agentWallet = await agent.getWalletAddress();

  // Register multiple analysis services
  const services: X402Service[] = [
    {
      serviceId: 'price-oracle',
      name: 'Price Oracle',
      description: 'Real-time crypto prices',
      endpoint: 'https://api.coingecko.com/api/v3/simple/price',
      method: 'GET',
      costCash: 0.01,
      paymentAddress: agentWallet,
      parameters: {
        ids: { type: 'string', description: 'Crypto IDs', required: true },
        vs_currencies: { type: 'string', description: 'Currencies', required: true },
      },
      category: ['price', 'data'],
    },
    {
      serviceId: 'market-data',
      name: 'Market Data',
      description: 'Volume, market cap, and liquidity data',
      endpoint: 'https://api.coingecko.com/api/v3/coins/markets',
      method: 'GET',
      costCash: 0.02,
      paymentAddress: agentWallet,
      parameters: {
        vs_currency: { type: 'string', description: 'Base currency', required: true },
        ids: { type: 'string', description: 'Crypto IDs', required: false },
      },
      category: ['market', 'data'],
    },
    {
      serviceId: 'technical-indicators',
      name: 'Technical Indicators',
      description: 'RSI, MACD, moving averages',
      endpoint: 'https://api.coingecko.com/api/v3/coins/solana/market_chart',
      method: 'GET',
      costCash: 0.015,
      paymentAddress: agentWallet,
      parameters: {
        vs_currency: { type: 'string', description: 'Currency', required: true },
        days: { type: 'number', description: 'Days of data', required: true },
      },
      category: ['technical', 'analysis'],
    },
    {
      serviceId: 'sentiment-analysis',
      name: 'Sentiment Analysis',
      description: 'Social media and news sentiment',
      endpoint: 'https://api.sentimentanalysis.com/crypto',
      method: 'POST',
      costCash: 0.03,
      paymentAddress: agentWallet,
      parameters: {
        symbol: { type: 'string', description: 'Crypto symbol', required: true },
        sources: { type: 'string', description: 'Data sources', required: false },
      },
      category: ['sentiment', 'social'],
    },
  ];

  services.forEach(service => agent.registerService(service));

  console.log(`Registered ${services.length} services`);
  console.log(`CASH Balance: ${await agent.getCashBalance()}`);

  // Execute comprehensive analysis
  const task = {
    taskId: 'analysis-001',
    description: `Perform comprehensive market analysis for Solana (SOL):
      1. Get current SOL price from price oracle
      2. Fetch market data including volume and market cap
      3. Calculate technical indicators (RSI, MACD) for the past 7 days
      4. Analyze social media sentiment
      5. Generate investment recommendation with risk assessment`,
    maxBudget: 0.20,
  };

  console.log('\nExecuting market analysis...');
  const report = await agent.executeTask(task);

  // Display comprehensive results
  console.log('\n=== MARKET ANALYSIS REPORT ===');
  console.log(`Task ID: ${report.task.taskId}`);
  console.log(`Completed: ${new Date(report.timestamp).toISOString()}`);

  console.log('\n--- Budget Summary ---');
  console.log(`Initial: ${report.initialCashBalance.toFixed(6)} CASH`);
  console.log(`Final: ${report.finalCashBalance.toFixed(6)} CASH`);
  console.log(`Spent: ${(report.initialCashBalance - report.finalCashBalance).toFixed(6)} CASH`);

  console.log('\n--- Execution Plan ---');
  console.log(`Steps: ${report.plan.steps.length}`);
  console.log(`Estimated Cost: ${report.plan.estimatedCost.toFixed(6)} CASH`);
  console.log(`Reasoning: ${report.plan.reasoning}`);

  console.log('\n--- Service Calls ---');
  report.execution.steps.forEach(step => {
    console.log(`\nStep ${step.stepNumber}: ${step.serviceId}`);
    console.log(`  Status: ${step.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Cost: ${step.cost.toFixed(6)} CASH`);
    console.log(`  Time: ${step.executionTime}ms`);
    if (step.data) {
      console.log(`  Data Preview: ${JSON.stringify(step.data).substring(0, 200)}...`);
    }
    if (step.error) {
      console.log(`  Error: ${step.error}`);
    }
  });

  console.log('\n--- Overall Results ---');
  console.log(`Success: ${report.execution.success}`);
  console.log(`Total Cost: ${report.execution.totalCost.toFixed(6)} CASH`);
  console.log(`Total Time: ${report.execution.totalTime}ms`);
  console.log(`Cost Efficiency: ${((report.plan.estimatedCost / report.execution.totalCost) * 100).toFixed(1)}%`);

  console.log('\n--- AI Analysis ---');
  console.log(report.analysis);

  console.log('\n--- Payment History ---');
  const payments = agent.getPaymentHistory();
  payments.forEach((payment, i) => {
    console.log(`\nPayment ${i + 1}:`);
    console.log(`  Signature: ${payment.signature}`);
    console.log(`  Amount: ${payment.amount.toFixed(6)} ${payment.currency}`);
    console.log(`  Time: ${new Date(payment.timestamp).toISOString()}`);
  });

  const metrics = agent.getMetrics();
  console.log('\n--- Agent Metrics ---');
  console.log(`Total Transactions: ${metrics.transactionCount}`);
  console.log(`Total Spent: ${metrics.totalSpent.toFixed(6)} CASH`);
  console.log(`Average Cost Per Call: ${metrics.averageCostPerInference.toFixed(6)} CASH`);
}

marketAnalysis().catch(console.error);
```

### Example 3: Automated Trading Bot

Build a trading bot that monitors prices and executes trades:

```typescript
import { Keypair } from '@solana/web3.js';
import { PhantomAgent, X402Service } from '@x402-upl/phantom-cash';
import fs from 'fs';

async function tradingBot() {
  const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  const agent = new PhantomAgent({
    wallet,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    network: 'mainnet-beta',
    spendingLimitPerHour: 100.0,
    llmModel: 'gpt-4',
  });

  const agentWallet = await agent.getWalletAddress();

  // Register trading-related services
  const services: X402Service[] = [
    {
      serviceId: 'price-feed',
      name: 'Real-Time Price Feed',
      description: 'High-frequency price updates',
      endpoint: 'https://api.tradingdata.com/price-feed',
      method: 'GET',
      costCash: 0.005,
      paymentAddress: agentWallet,
      parameters: {
        symbol: { type: 'string', description: 'Trading pair', required: true },
      },
      category: ['price', 'trading'],
    },
    {
      serviceId: 'order-book',
      name: 'Order Book Data',
      description: 'Live order book depth',
      endpoint: 'https://api.tradingdata.com/order-book',
      method: 'GET',
      costCash: 0.01,
      paymentAddress: agentWallet,
      parameters: {
        symbol: { type: 'string', description: 'Trading pair', required: true },
      },
      category: ['trading', 'data'],
    },
    {
      serviceId: 'signal-generator',
      name: 'Trading Signals',
      description: 'AI-generated trading signals',
      endpoint: 'https://api.tradingsignals.com/generate',
      method: 'POST',
      costCash: 0.05,
      paymentAddress: agentWallet,
      parameters: {
        symbol: { type: 'string', description: 'Trading pair', required: true },
        strategy: { type: 'string', description: 'Trading strategy', required: true },
        timeframe: { type: 'string', description: 'Timeframe', required: true },
      },
      category: ['signals', 'ai'],
    },
  ];

  services.forEach(service => agent.registerService(service));

  console.log('Trading bot initialized');
  console.log(`CASH Balance: ${await agent.getCashBalance()}`);

  // Main trading loop
  const tradingPairs = ['SOL/USD', 'BTC/USD', 'ETH/USD'];
  const checkInterval = 60000; // Check every 60 seconds

  while (true) {
    console.log(`\n[${new Date().toISOString()}] Checking markets...`);

    for (const pair of tradingPairs) {
      try {
        const task = {
          taskId: `trade-${pair}-${Date.now()}`,
          description: `Analyze ${pair} market:
            1. Get current price and order book
            2. Generate trading signal based on technical analysis
            3. If signal is strong (>70% confidence), recommend action
            4. Include risk assessment and position sizing`,
          maxBudget: 0.10,
        };

        const report = await agent.executeTask(task);

        if (report.execution.success) {
          console.log(`\n${pair} Analysis:`);
          console.log(report.analysis);

          // Check if action is recommended
          if (report.analysis.toLowerCase().includes('buy') ||
              report.analysis.toLowerCase().includes('sell')) {
            console.log(`\nACTION SIGNAL DETECTED for ${pair}!`);
            // Here you would implement actual trading logic
            // For safety, this example only logs recommendations
          }
        } else {
          console.error(`Failed to analyze ${pair}:`, report.execution.error);
        }

        // Check remaining budget
        const remaining = agent.getRemainingHourlyBudget();
        if (remaining < 0.10) {
          console.log(`Low budget remaining: ${remaining} CASH. Waiting for next hour...`);
          break;
        }

      } catch (error) {
        console.error(`Error analyzing ${pair}:`, error);
      }
    }

    // Wait before next check
    console.log(`\nWaiting ${checkInterval / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

tradingBot().catch(console.error);
```

### Example 4: Content Aggregation Service

Aggregate content from multiple paid APIs:

```typescript
import { Keypair } from '@solana/web3.js';
import { PhantomAgent, X402Service } from '@x402-upl/phantom-cash';
import fs from 'fs';

async function contentAggregator() {
  const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  const agent = new PhantomAgent({
    wallet,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    network: 'mainnet-beta',
    spendingLimitPerHour: 20.0,
  });

  const agentWallet = await agent.getWalletAddress();

  // Register content services
  const services: X402Service[] = [
    {
      serviceId: 'news-api',
      name: 'Crypto News API',
      description: 'Latest cryptocurrency news',
      endpoint: 'https://api.cryptonews.com/v1/news',
      method: 'GET',
      costCash: 0.02,
      paymentAddress: agentWallet,
      parameters: {
        category: { type: 'string', description: 'News category', required: false },
        limit: { type: 'number', description: 'Number of articles', required: false },
      },
      category: ['news', 'content'],
    },
    {
      serviceId: 'research-api',
      name: 'Research Reports',
      description: 'In-depth research reports',
      endpoint: 'https://api.cryptoresearch.com/reports',
      method: 'GET',
      costCash: 0.05,
      paymentAddress: agentWallet,
      parameters: {
        topic: { type: 'string', description: 'Research topic', required: true },
      },
      category: ['research', 'content'],
    },
    {
      serviceId: 'social-api',
      name: 'Social Media Trends',
      description: 'Trending topics on social media',
      endpoint: 'https://api.socialtrends.com/crypto',
      method: 'GET',
      costCash: 0.015,
      paymentAddress: agentWallet,
      parameters: {
        platform: { type: 'string', description: 'Social platform', required: false },
      },
      category: ['social', 'trends'],
    },
    {
      serviceId: 'summary-api',
      name: 'AI Summarization',
      description: 'Summarize long content',
      endpoint: 'https://api.aisummary.com/summarize',
      method: 'POST',
      costCash: 0.03,
      paymentAddress: agentWallet,
      parameters: {
        content: { type: 'string', description: 'Content to summarize', required: true },
        maxLength: { type: 'number', description: 'Max summary length', required: false },
      },
      category: ['ai', 'content'],
    },
  ];

  services.forEach(service => agent.registerService(service));

  // Aggregate content on a topic
  const topic = 'Solana DeFi developments';

  const task = {
    taskId: 'content-aggregation-001',
    description: `Create comprehensive content report on "${topic}":
      1. Fetch latest news articles about the topic
      2. Get relevant research reports
      3. Analyze social media trends and sentiment
      4. Summarize all findings into a cohesive report
      5. Identify key insights and future predictions`,
    maxBudget: 0.30,
  };

  console.log(`Aggregating content on: ${topic}`);
  console.log(`Budget: ${task.maxBudget} CASH\n`);

  const report = await agent.executeTask(task);

  // Save report to file
  const reportData = {
    topic,
    timestamp: new Date(report.timestamp).toISOString(),
    analysis: report.analysis,
    sources: report.execution.steps.map(step => ({
      service: step.serviceId,
      cost: step.cost,
      success: step.success,
    })),
    totalCost: report.execution.totalCost,
  };

  fs.writeFileSync(
    'content-report.json',
    JSON.stringify(reportData, null, 2)
  );

  console.log('=== CONTENT AGGREGATION REPORT ===\n');
  console.log(report.analysis);
  console.log(`\n--- Stats ---`);
  console.log(`Sources used: ${report.execution.steps.length}`);
  console.log(`Total cost: ${report.execution.totalCost.toFixed(6)} CASH`);
  console.log(`Processing time: ${report.execution.totalTime}ms`);
  console.log(`\nFull report saved to: content-report.json`);
}

contentAggregator().catch(console.error);
```

### Example 5: TAP-Enabled Shopping Agent

Autonomous shopping agent with Visa TAP authentication:

```typescript
import { Keypair } from '@solana/web3.js';
import { TAPPhantomAgent } from '@x402-upl/phantom-cash';
import fs from 'fs';

async function shoppingAgent() {
  const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  // Create TAP-enabled agent
  const agent = new TAPPhantomAgent({
    wallet,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    network: 'mainnet-beta',
    spendingLimitPerHour: 200.0,
    llmModel: 'gpt-4',
    tap: {
      registryUrl: 'https://tap-registry.x402.network',
      name: 'AI Shopping Assistant',
      domain: 'shopping-agent.x402.network',
      description: 'Autonomous AI agent for comparing and purchasing services',
      contactEmail: 'support@mycompany.com',
      algorithm: 'ed25519',
    },
    ownerDID: 'did:x402:owner:alice',
  });

  // Initialize TAP registration
  console.log('Registering with TAP...');
  await agent.initialize();

  const tapIdentity = agent.getTAPIdentity();
  console.log('TAP Identity:');
  console.log(`  Key ID: ${tapIdentity?.keyId}`);
  console.log(`  Algorithm: ${tapIdentity?.algorithm}`);
  console.log(`  Agent Name: ${tapIdentity?.agent?.name}`);

  // Save TAP credentials for later use
  const tapPrivateKey = agent.exportTAPPrivateKey();
  fs.writeFileSync('tap-credentials.json', JSON.stringify({
    keyId: tapIdentity?.keyId,
    privateKey: tapPrivateKey,
  }, null, 2));

  console.log('\nTAP credentials saved to tap-credentials.json');
  console.log(`CASH Balance: ${await agent.getCashBalance()}\n`);

  // Execute shopping task
  const shoppingTask = `Find and purchase the best AI API service for natural language processing:
    1. Search for NLP API services in the X402 registry
    2. Compare prices, features, and reputation
    3. Select the best value option
    4. Purchase 1000 API credits
    5. Verify the purchase and save credentials`;

  console.log('Executing shopping task with TAP authentication...\n');
  const report = await agent.executeTaskWithTAP(shoppingTask);

  console.log('=== SHOPPING REPORT ===\n');
  console.log(report.analysis);

  console.log('\n--- Purchase Details ---');
  report.execution.steps.forEach(step => {
    console.log(`\nStep ${step.stepNumber}: ${step.serviceId}`);
    console.log(`  Cost: ${step.cost.toFixed(6)} CASH`);
    console.log(`  Time: ${step.executionTime}ms`);
    if (step.data) {
      console.log(`  Details: ${JSON.stringify(step.data, null, 2)}`);
    }
  });

  console.log('\n--- Financial Summary ---');
  console.log(`Total Spent: ${report.execution.totalCost.toFixed(6)} CASH`);
  console.log(`Remaining Balance: ${report.finalCashBalance.toFixed(6)} CASH`);

  // Call a specific TAP-protected service
  console.log('\n--- Testing TAP-Protected Service ---');
  try {
    const response = await agent.callServiceWithTAP(
      'https://api.x402.network/nlp/analyze',
      {
        tag: 'agent-payer-auth',
        method: 'POST',
        data: {
          text: 'This is a test of the NLP service',
          task: 'sentiment',
        },
      }
    );

    console.log('Service response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Service call failed:', error);
  }
}

shoppingAgent().catch(console.error);
```

## Integration with X402

### X402 Protocol Overview

The HTTP 402 Payment Required protocol enables seamless micropayments for API access. The flow works as follows:

1. Client makes request to X402-enabled service
2. Service returns 402 status with payment requirements
3. Client creates and executes payment on-chain
4. Client retries request with payment proof header
5. Service verifies payment and returns data

### Payment Requirements Format

When a service returns HTTP 402, the response body contains:

```json
{
  "scheme": "solana",
  "network": "mainnet-beta",
  "asset": "CASH",
  "payTo": "RECIPIENT_WALLET_ADDRESS",
  "amount": "0.01",
  "timeout": 300,
  "resource": "/api/data",
  "description": "API access fee",
  "nonce": "unique-request-id"
}
```

### Payment Proof Header

After payment, the client includes proof in the `X-Payment` header:

```json
{
  "network": "mainnet-beta",
  "asset": "CASH",
  "from": "SENDER_WALLET_ADDRESS",
  "to": "RECIPIENT_WALLET_ADDRESS",
  "amount": "0.01",
  "signature": "TRANSACTION_SIGNATURE",
  "timestamp": 1699564800000,
  "nonce": "unique-request-id"
}
```

The header value is base64-encoded JSON.

### Service Registry Integration

The X402 Registry provides service discovery:

```typescript
import { X402RegistryClient } from '@x402-upl/phantom-cash';

// Connect to registry
const registry = new X402RegistryClient('https://registry.x402.network');

// Discover services
const services = await registry.discoverServices({
  category: 'artificial-intelligence',
  maxPrice: 0.10,
  minReputation: 4.0,
  minUptime: 0.95,
  sortBy: 'value',
  limit: 10,
});

console.log(`Found ${services.length} AI services`);

services.forEach(service => {
  console.log(`\n${service.name}`);
  console.log(`  Price: ${service.pricePerCall} CASH`);
  console.log(`  Reputation: ${service.reputation}/5`);
  console.log(`  Uptime: ${(service.uptime * 100).toFixed(1)}%`);
  console.log(`  Latency: ${service.averageLatency}ms`);
});
```

### Registering Your Own Service

Provide X402-enabled services:

```typescript
import { X402RegistryClient } from '@x402-upl/phantom-cash';

const registry = new X402RegistryClient('https://registry.x402.network');

// Register service
await registry.registerService({
  url: 'https://api.myservice.com/endpoint',
  name: 'My AI Service',
  description: 'Advanced machine learning API',
  category: 'artificial-intelligence',
  ownerWalletAddress: 'YOUR_WALLET_ADDRESS',
  pricePerCall: 0.05,
  pricingModel: 'FLAT',
  acceptedTokens: ['CASH', 'SOL'],
  openapiSchemaUri: 'https://api.myservice.com/openapi.json',
  capabilities: ['text-generation', 'classification'],
  tags: ['ai', 'nlp', 'ml'],
});

console.log('Service registered successfully');
```

### Payment Verification Server-Side

Services should verify payments on-chain:

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { CASH_MINT } from '@x402-upl/phantom-cash';

async function verifyPayment(
  signature: string,
  expectedAmount: number,
  expectedRecipient: string
): Promise<boolean> {
  const connection = new Connection('https://api.mainnet-beta.solana.com');

  // Get transaction
  const tx = await connection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || tx.meta?.err) {
    return false;
  }

  // Verify amount and recipient
  // Parse transaction instructions to check token transfer
  // This is simplified - production code should thoroughly validate

  return true;
}

// In your API endpoint
app.get('/api/data', async (req, res) => {
  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    return res.status(402).json({
      scheme: 'solana',
      network: 'mainnet-beta',
      asset: 'CASH',
      payTo: 'YOUR_WALLET_ADDRESS',
      amount: '0.01',
      resource: '/api/data',
      nonce: crypto.randomUUID(),
    });
  }

  // Decode and verify payment
  const payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
  const valid = await verifyPayment(
    payment.signature,
    parseFloat(payment.amount),
    'YOUR_WALLET_ADDRESS'
  );

  if (!valid) {
    return res.status(402).json({ error: 'Invalid payment' });
  }

  // Return data
  res.json({ data: 'Your API response here' });
});
```

## Troubleshooting

### Common Issues

#### 1. Insufficient CASH Balance

**Error:** `Insufficient token balance: X < Y`

**Solution:**
```typescript
// Check balance
const balance = await agent.getCashBalance();
console.log('Current CASH balance:', balance);

// If balance is 0, you need to acquire CASH tokens
// Options:
// 1. Purchase CASH from an exchange
// 2. Receive CASH from another wallet
// 3. Use a faucet (devnet only)
```

#### 2. Insufficient SOL for Gas

**Error:** `Insufficient SOL balance`

**Solution:**
```typescript
// Check SOL balance
const solBalance = await agent.getSolBalance();
console.log('SOL balance:', solBalance);

// Need at least ~0.002 SOL for transaction fees
// On devnet, request airdrop:
if (network === 'devnet') {
  const cashClient = agent['cashClient'];
  await cashClient.requestAirdrop();
}

// On mainnet, send SOL to your wallet address
```

#### 3. Spending Limit Exceeded

**Error:** `Spending limit exceeded: X > Y`

**Solution:**
```typescript
// Check spending status
const spent = agent.getSpentThisHour();
const remaining = agent.getRemainingHourlyBudget();

console.log(`Spent this hour: ${spent} CASH`);
console.log(`Remaining: ${remaining} CASH`);

// Options:
// 1. Wait for the next hour (limits reset hourly)
// 2. Increase the spending limit:
const newAgent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  spendingLimitPerHour: 100.0, // Increased limit
});
```

#### 4. Transaction Failed

**Error:** `Transaction failed` or timeout errors

**Solution:**
```typescript
// Verify transaction on-chain
const signature = 'YOUR_TX_SIGNATURE';
const verified = await agent.verifyTransaction(signature);

if (!verified) {
  console.log('Transaction not confirmed');
  // Check Solana status: https://status.solana.com
  // Try using a different RPC endpoint:
  const agent = new PhantomAgent({
    wallet,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    network: 'mainnet-beta',
    rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/YOUR-API-KEY',
  });
}
```

#### 5. Invalid Payment Requirements

**Error:** `Invalid payment requirements format`

**Solution:**
```typescript
// The service returned malformed 402 response
// Check service endpoint manually:
const response = await fetch('SERVICE_URL');
console.log('Status:', response.status);
console.log('Body:', await response.text());

// Service must return valid payment requirements
// Contact service provider if issue persists
```

#### 6. OpenAI API Errors

**Error:** `No response from LLM` or rate limit errors

**Solution:**
```typescript
// Check API key
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY not set');
}

// Check quota: https://platform.openai.com/usage
// Try different model:
const agent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  llmModel: 'gpt-3.5-turbo', // Cheaper alternative
});
```

#### 7. Network Connectivity Issues

**Error:** `Network error` or timeout errors

**Solution:**
```typescript
// Increase timeout
const client = new PhantomCashX402Client({
  wallet,
  network: 'mainnet-beta',
  timeout: 60000, // 60 seconds
});

// Test RPC connectivity
const connection = new Connection('https://api.mainnet-beta.solana.com');
const blockheight = await connection.getBlockHeight();
console.log('Connected to Solana. Block height:', blockheight);
```

### Debug Mode

Enable verbose logging for debugging:

```typescript
// Set environment variable
process.env.DEBUG = 'phantom-cash:*';

// Or add console.log statements
const agent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
});

// Log all payments
const originalExecute = agent.executeTask.bind(agent);
agent.executeTask = async (task) => {
  console.log('Executing task:', task);
  const report = await originalExecute(task);
  console.log('Task complete:', report);
  return report;
};
```

### Getting Help

If issues persist:

1. Check GitHub issues: https://github.com/your-org/x402-upl/issues
2. Join Discord community: https://discord.gg/x402
3. Contact support: support@x402.network
4. Review Solana status: https://status.solana.com

## Security

### Wallet Security

#### Private Key Management

**Never expose private keys in code or version control:**

```typescript
// BAD - Never do this
const wallet = Keypair.fromSecretKey(new Uint8Array([1, 2, 3, ...]));

// GOOD - Load from secure file
const secretKey = JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

// BETTER - Use environment variable
const secretKey = JSON.parse(process.env.WALLET_SECRET_KEY || '[]');
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

// BEST - Use secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)
const secretKey = await secretsManager.getSecretValue('wallet-key');
const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(secretKey)));
```

#### File Permissions

Secure wallet files with proper permissions:

```bash
# Set restrictive permissions
chmod 600 wallet.json

# Verify permissions
ls -l wallet.json
# Should show: -rw------- (only owner can read/write)

# Add to .gitignore
echo "wallet.json" >> .gitignore
echo "*.key" >> .gitignore
echo ".env" >> .gitignore
```

#### Multi-Wallet Strategy

Use separate wallets for different purposes:

```typescript
// Hot wallet for small transactions (keep minimal balance)
const hotWallet = loadWallet('./hot-wallet.json');

// Cold wallet for large holdings (offline storage)
const coldWallet = loadWallet('./cold-wallet.json');

// Trading wallet (only for specific use case)
const tradingWallet = loadWallet('./trading-wallet.json');

// Initialize agent with hot wallet
const agent = new PhantomAgent({
  wallet: hotWallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  spendingLimitPerHour: 10.0, // Limit exposure
});
```

### Spending Controls

#### Implement Multiple Layers of Limits

```typescript
// Per-hour limit
const HOURLY_LIMIT = 50.0;

// Per-day limit (tracked separately)
const DAILY_LIMIT = 200.0;
const dailySpending = new Map<string, number>();

// Per-task limit
const TASK_LIMIT = 5.0;

function checkDailyLimit(amount: number): boolean {
  const today = new Date().toISOString().split('T')[0];
  const spent = dailySpending.get(today) || 0;

  if (spent + amount > DAILY_LIMIT) {
    throw new Error(`Daily limit exceeded: ${spent + amount} > ${DAILY_LIMIT}`);
  }

  return true;
}

// Wrap agent execution with additional checks
const safeExecuteTask = async (agent: PhantomAgent, task: AgentTask) => {
  // Enforce task-level limit
  if (task.maxBudget > TASK_LIMIT) {
    throw new Error(`Task budget exceeds limit: ${task.maxBudget} > ${TASK_LIMIT}`);
  }

  // Check daily limit
  checkDailyLimit(task.maxBudget);

  // Execute task
  const report = await agent.executeTask(task);

  // Track daily spending
  const today = new Date().toISOString().split('T')[0];
  const spent = dailySpending.get(today) || 0;
  dailySpending.set(today, spent + report.execution.totalCost);

  return report;
};
```

#### Whitelist Services

Only allow approved services:

```typescript
const APPROVED_SERVICES = new Set([
  'price-oracle',
  'market-data',
  'technical-indicators',
]);

const APPROVED_ENDPOINTS = [
  'https://api.coingecko.com',
  'https://api.x402.network',
];

// Custom registry with filtering
class SecureServiceRegistry extends ServiceRegistry {
  async getService(serviceId: string) {
    if (!APPROVED_SERVICES.has(serviceId)) {
      throw new Error(`Service not approved: ${serviceId}`);
    }
    return super.getService(serviceId);
  }

  registerService(service: X402Service) {
    const url = new URL(service.endpoint);
    const approved = APPROVED_ENDPOINTS.some(endpoint =>
      service.endpoint.startsWith(endpoint)
    );

    if (!approved) {
      throw new Error(`Endpoint not approved: ${service.endpoint}`);
    }

    super.registerService(service);
  }
}
```

### Transaction Verification

Always verify payments before proceeding:

```typescript
import { PhantomCashX402Client } from '@x402-upl/phantom-cash';

// Wait for confirmation
async function makeVerifiedPayment(
  client: PhantomCashX402Client,
  url: string
): Promise<any> {
  // Make request (triggers payment if 402)
  const result = await client.get(url);

  // Get most recent payment
  const payments = client.getPaymentHistory(1);
  const lastPayment = payments[0];

  if (lastPayment) {
    // Verify on-chain
    const verified = await client.verifyTransaction(lastPayment.signature);

    if (!verified) {
      throw new Error('Payment verification failed');
    }

    console.log(`Payment verified: ${lastPayment.signature}`);
  }

  return result;
}
```

### Input Validation

Validate all inputs to prevent injection attacks:

```typescript
import validator from 'validator';

function validateTaskDescription(description: string): void {
  // Length check
  if (description.length > 5000) {
    throw new Error('Task description too long');
  }

  // No executable code
  const dangerousPatterns = [
    /eval\(/i,
    /Function\(/i,
    /<script>/i,
    /javascript:/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(description)) {
      throw new Error('Dangerous content detected in task description');
    }
  }
}

function validateServiceEndpoint(endpoint: string): void {
  // Must be valid URL
  if (!validator.isURL(endpoint, { protocols: ['https'] })) {
    throw new Error('Invalid service endpoint URL');
  }

  // Must be HTTPS
  if (!endpoint.startsWith('https://')) {
    throw new Error('Service endpoint must use HTTPS');
  }

  // Check against blacklist
  const blacklist = ['localhost', '127.0.0.1', '0.0.0.0'];
  const url = new URL(endpoint);

  if (blacklist.some(host => url.hostname.includes(host))) {
    throw new Error('Service endpoint hostname not allowed');
  }
}

// Use validation before execution
const task = {
  taskId: 'task-001',
  description: userInput,
  maxBudget: 0.10,
};

validateTaskDescription(task.description);
await agent.executeTask(task);
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  check(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove old timestamps
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return true;
  }
}

const limiter = new RateLimiter();

// Rate limit by wallet address
async function rateLimitedExecute(agent: PhantomAgent, task: AgentTask) {
  const walletAddress = await agent.getWalletAddress();

  // Max 10 tasks per minute
  if (!limiter.check(walletAddress, 10, 60000)) {
    throw new Error('Rate limit exceeded. Please wait before retrying.');
  }

  return agent.executeTask(task);
}
```

### Best Practices Summary

1. **Never commit private keys** to version control
2. **Use environment variables** or secure vaults for secrets
3. **Set spending limits** at multiple levels (hourly, daily, per-task)
4. **Whitelist services** and endpoints
5. **Verify all transactions** on-chain before proceeding
6. **Validate user inputs** to prevent injection attacks
7. **Implement rate limiting** to prevent abuse
8. **Use HTTPS only** for service endpoints
9. **Monitor spending** in real-time
10. **Keep minimal balances** in hot wallets
11. **Regular security audits** of your implementation
12. **Update dependencies** regularly for security patches

## Performance

### Optimization Techniques

#### 1. Connection Pooling

Reuse Solana connections to reduce overhead:

```typescript
import { Connection } from '@solana/web3.js';

// Create singleton connection
const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  }
);

// Share connection across agents
const agent1 = new PhantomAgent({
  wallet: wallet1,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  rpcUrl: connection.rpcEndpoint,
});

const agent2 = new PhantomAgent({
  wallet: wallet2,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  rpcUrl: connection.rpcEndpoint,
});
```

#### 2. Batch Operations

Process multiple tasks in parallel when possible:

```typescript
// Serial execution (slow)
for (const task of tasks) {
  await agent.executeTask(task);
}

// Parallel execution (fast)
const results = await Promise.all(
  tasks.map(task => agent.executeTask(task))
);

// Controlled concurrency (balanced)
async function executeBatch(
  agent: PhantomAgent,
  tasks: AgentTask[],
  concurrency: number = 3
) {
  const results = [];

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(task => agent.executeTask(task))
    );
    results.push(...batchResults);
  }

  return results;
}

await executeBatch(agent, tasks, 5); // 5 concurrent tasks
```

#### 3. Caching Service Registry

Cache service discovery results:

```typescript
class CachedServiceRegistry extends ServiceRegistry {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private cacheTTL = 300000; // 5 minutes

  async listServices(): Promise<X402Service[]> {
    const cacheKey = 'listServices';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    const services = await super.listServices();

    this.cache.set(cacheKey, {
      data: services,
      expires: Date.now() + this.cacheTTL,
    });

    return services;
  }

  async searchServices(query: string): Promise<X402Service[]> {
    const cacheKey = `search:${query}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    const services = await super.searchServices(query);

    this.cache.set(cacheKey, {
      data: services,
      expires: Date.now() + this.cacheTTL,
    });

    return services;
  }
}
```

#### 4. Optimize RPC Usage

Use premium RPC endpoints for better performance:

```typescript
// Free tier (slower, rate limited)
const freeAgent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
});

// Premium tier (faster, higher limits)
const premiumAgent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/YOUR-API-KEY',
});

// Or use Helius
const heliusAgent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=YOUR-API-KEY',
});
```

#### 5. Reduce LLM Costs

Optimize LLM usage to save on OpenAI costs:

```typescript
// Use GPT-3.5 for simple tasks (90% cheaper)
const cheapAgent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  llmModel: 'gpt-3.5-turbo',
});

// Use GPT-4 only for complex tasks
const smartAgent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  network: 'mainnet-beta',
  llmModel: 'gpt-4',
});

// Hybrid approach
async function smartExecute(task: AgentTask) {
  const complexity = estimateComplexity(task.description);

  const agent = complexity > 0.7 ? smartAgent : cheapAgent;

  return agent.executeTask(task);
}

function estimateComplexity(description: string): number {
  const indicators = {
    multiStep: description.includes('1.') || description.includes('step'),
    analysis: /analyze|compare|evaluate/i.test(description),
    longText: description.length > 500,
  };

  return Object.values(indicators).filter(Boolean).length / 3;
}
```

#### 6. Pre-compute Service Costs

Calculate costs ahead of time to avoid repeated queries:

```typescript
// Build cost lookup table
async function buildCostTable(registry: ServiceRegistry) {
  const services = await registry.listServices();
  const costTable = new Map<string, number>();

  for (const service of services) {
    costTable.set(service.serviceId, service.costCash);
  }

  return costTable;
}

const costTable = await buildCostTable(agent['registry']);

// Quick cost estimation
function estimateTaskCost(serviceIds: string[]): number {
  return serviceIds.reduce((total, id) => {
    return total + (costTable.get(id) || 0);
  }, 0);
}

const estimatedCost = estimateTaskCost(['price-oracle', 'market-data']);
console.log(`Estimated cost: ${estimatedCost} CASH`);
```

### Performance Monitoring

Track and optimize performance metrics:

```typescript
class PerformanceMonitor {
  private metrics: {
    taskCount: number;
    totalTime: number;
    totalCost: number;
    errors: number;
  } = {
    taskCount: 0,
    totalTime: 0,
    totalCost: 0,
    errors: 0,
  };

  async wrapExecuteTask(
    agent: PhantomAgent,
    task: AgentTask
  ): Promise<AgentExecutionReport> {
    const startTime = Date.now();

    try {
      const report = await agent.executeTask(task);

      this.metrics.taskCount++;
      this.metrics.totalTime += Date.now() - startTime;
      this.metrics.totalCost += report.execution.totalCost;

      return report;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  getStats() {
    return {
      tasksExecuted: this.metrics.taskCount,
      averageTime: this.metrics.totalTime / this.metrics.taskCount,
      averageCost: this.metrics.totalCost / this.metrics.taskCount,
      errorRate: this.metrics.errors / this.metrics.taskCount,
      totalCost: this.metrics.totalCost,
    };
  }

  report() {
    const stats = this.getStats();
    console.log('=== Performance Report ===');
    console.log(`Tasks executed: ${stats.tasksExecuted}`);
    console.log(`Average time: ${stats.averageTime.toFixed(0)}ms`);
    console.log(`Average cost: ${stats.averageCost.toFixed(6)} CASH`);
    console.log(`Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
    console.log(`Total cost: ${stats.totalCost.toFixed(6)} CASH`);
  }
}

const monitor = new PerformanceMonitor();

// Use monitored execution
const report = await monitor.wrapExecuteTask(agent, task);

// Print stats periodically
setInterval(() => monitor.report(), 60000); // Every minute
```

### Benchmarking

Compare performance across configurations:

```typescript
async function benchmark() {
  const tasks = generateTestTasks(10);

  // Test free RPC
  console.log('Testing free RPC...');
  const freeStart = Date.now();
  const freeAgent = createAgent('https://api.mainnet-beta.solana.com');
  await Promise.all(tasks.map(t => freeAgent.executeTask(t)));
  const freeTime = Date.now() - freeStart;

  // Test premium RPC
  console.log('Testing premium RPC...');
  const premiumStart = Date.now();
  const premiumAgent = createAgent('https://solana-mainnet.g.alchemy.com/v2/KEY');
  await Promise.all(tasks.map(t => premiumAgent.executeTask(t)));
  const premiumTime = Date.now() - premiumStart;

  console.log('\n=== Benchmark Results ===');
  console.log(`Free RPC: ${freeTime}ms`);
  console.log(`Premium RPC: ${premiumTime}ms`);
  console.log(`Speedup: ${(freeTime / premiumTime).toFixed(2)}x`);
}

benchmark().catch(console.error);
```

---

## License

This integration is part of the X402 Protocol project and is licensed under the Apache-2.0 License.

## Support

For questions, issues, or contributions:

- GitHub: https://github.com/your-org/x402-upl
- Discord: https://discord.gg/x402
- Email: support@x402.network
- Documentation: https://docs.x402.network

## Changelog

### Version 1.0.0 (Current)

- Initial production release
- Full HTTP 402 protocol support
- CASH Token-2022 integration
- GPT-4 powered autonomous agents
- X402 registry integration
- Visa TAP authentication support
- Comprehensive test suite
- Production-ready error handling

---

**Built with X402 Protocol - The Future of Micropayments**
