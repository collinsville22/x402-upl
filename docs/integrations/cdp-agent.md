# CDP Agent Integration

## Overview

The CDP Agent Integration provides autonomous demand-side agents powered by Coinbase Developer Platform (CDP) Server Wallets v2 and OpenAI's GPT-4. These agents can discover services, plan multi-step execution workflows, and autonomously pay for tool calls on Solana using micropayments. This integration enables AI agents to act as economic actors in the X402 ecosystem, making intelligent decisions about which services to consume and automatically handling payments.

The CDP Agent system combines blockchain wallet management, AI reasoning, and service orchestration into a cohesive framework. Agents can be given high-level tasks and budgets, then autonomously plan and execute complex workflows by discovering and chaining together multiple paid services. This creates a fully autonomous economic loop where AI agents can purchase and compose services to accomplish objectives.

Built on top of Coinbase's enterprise-grade wallet infrastructure, the CDP Agent ensures secure key management through Trusted Execution Environments (TEEs) while providing a simple developer experience. The integration is production-ready with comprehensive error handling, type safety, and extensive test coverage.

## Key Features

- **CDP Server Wallets v2 Integration**: Enterprise-grade wallet creation and transaction signing through Coinbase's secure infrastructure
- **Autonomous Task Planning**: GPT-4 powered reasoning for intelligent service selection and workflow orchestration
- **Dynamic Tool Discovery**: Registry-based service discovery with category search and metadata management
- **Multi-Step Execution**: Complex workflow execution with automatic dependency resolution and topological sorting
- **Payment Automation**: Automatic SOL micropayments to service providers before each tool invocation
- **Cost Optimization**: LLM-based plan optimization to minimize costs while achieving task objectives
- **Budget Management**: Strict budget enforcement with pre-execution validation and runtime cost tracking
- **Solana Native**: Full SVM support with devnet and mainnet-beta compatibility
- **Result Analysis**: Post-execution AI analysis for insights and recommendations
- **Production Quality**: Comprehensive error handling, TypeScript type safety, and extensive test coverage
- **Secure Key Management**: Private keys never exposed, managed in CDP's Trusted Execution Environment
- **Transaction Verification**: On-chain confirmation tracking for payment reliability

## Architecture

The CDP Agent system consists of five core components that work together to enable autonomous agent operation:

```
┌─────────────────────────────────────────────────────────────────┐
│                        DemandSideAgent                          │
│  (High-level orchestration and lifecycle management)            │
└─────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ CDPSolana    │      │ ToolRegistry │      │  AgentBrain  │
│   Client     │      │              │      │   (GPT-4)    │
│              │      │              │      │              │
│ - Wallet Mgmt│      │ - Discovery  │      │ - Planning   │
│ - Txn Signing│      │ - Metadata   │      │ - Reasoning  │
│ - Balance    │      │ - Execution  │      │ - Analysis   │
└──────────────┘      └──────────────┘      └──────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               ▼
                     ┌──────────────────┐
                     │ ExecutionEngine  │
                     │                  │
                     │ - Dependency Res │
                     │ - Payment Flow   │
                     │ - Error Handling │
                     └──────────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │  Solana Network  │
                     │  (devnet/mainnet)│
                     └──────────────────┘
```

### Component Responsibilities

**DemandSideAgent**: Top-level orchestrator that manages the agent lifecycle, coordinates between components, and provides the main API for task execution. Handles initialization, tool registration, balance management, and result reporting.

**CDPSolanaClient**: Wraps the official Coinbase CDP SDK for Solana-specific operations. Manages wallet creation, transaction signing, balance queries, and faucet requests for devnet. Ensures secure key management through CDP's infrastructure.

**ToolRegistry**: Maintains a catalog of available services/tools with their metadata, costs, and endpoints. Provides discovery capabilities through category-based search and handles the actual HTTP execution of tool APIs.

**AgentBrain**: LLM-powered reasoning engine that plans tool execution chains, optimizes for cost and efficiency, and analyzes execution results. Uses GPT-4's structured output capabilities for reliable JSON-based planning.

**ExecutionEngine**: Coordinates multi-step workflow execution with automatic dependency resolution using topological sorting. Handles payment flow (pay before execution), error recovery, and budget enforcement during runtime.

### Data Flow

1. **Task Submission**: Developer provides task description and budget
2. **Tool Discovery**: Registry returns available tools matching task requirements
3. **Planning Phase**: AgentBrain uses LLM to create execution plan with cost estimates
4. **Optimization**: Plan is optimized for cost efficiency and parallelization opportunities
5. **Budget Validation**: Plan cost is compared against available budget
6. **Execution Loop**: For each step in dependency order:
   - Send payment to tool provider
   - Execute tool API call
   - Collect and store result
   - Update cost tracking
7. **Analysis**: LLM analyzes results and generates insights
8. **Reporting**: Complete execution report returned to developer

## Installation

### Prerequisites

- Node.js 18+ and npm/pnpm
- Coinbase Developer Platform account with API credentials
- OpenAI API key
- Solana wallet for mainnet operations (devnet uses faucet)

### Package Installation

Install the CDP Agent package and its dependencies:

```bash
# Using npm
npm install @x402-upl/cdp-agent

# Using pnpm
pnpm add @x402-upl/cdp-agent
```

### Core Dependencies

The package requires these peer dependencies (automatically installed):

- `@coinbase/cdp-sdk`: ^1.38.5 - Official Coinbase CDP SDK
- `@solana/web3.js`: ^1.95.8 - Solana JavaScript SDK
- `openai`: ^4.73.1 - OpenAI API client
- `axios`: ^1.7.9 - HTTP client for tool execution
- `zod`: ^3.24.1 - Runtime type validation

### Development Setup

For local development, clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/x402-upl.git
cd x402-upl/packages/integrations/cdp-agent
pnpm install
pnpm build
```

## Configuration

### Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Required: Coinbase Developer Platform Credentials
CDP_API_KEY_NAME=organizations/your-org-id/apiKeys/your-api-key-id
CDP_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nYourPrivateKeyHere\n-----END EC PRIVATE KEY-----"

# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Solana Network (defaults to devnet)
SOLANA_NETWORK=devnet  # or mainnet-beta

# Optional: LLM Model (defaults to gpt-4)
LLM_MODEL=gpt-4  # or gpt-4-turbo, gpt-3.5-turbo
```

### Obtaining CDP Credentials

1. Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create or select your organization
3. Navigate to API Keys section
4. Create a new API key with Solana permissions
5. Download the JSON file containing your credentials
6. Extract `name` field for `CDP_API_KEY_NAME`
7. Extract `privateKey` field for `CDP_PRIVATE_KEY`

### Network Configuration

**Devnet** (Development):
- Automatic faucet funding for test SOL
- No real value, safe for testing
- Fast confirmation times
- RPC: `https://api.devnet.solana.com`

**Mainnet-beta** (Production):
- Real SOL required for transactions
- Production-grade infrastructure
- Standard confirmation times
- RPC: `https://api.mainnet-beta.solana.com`

### LLM Model Selection

Choose based on your use case:

- **gpt-4**: Best reasoning, highest accuracy, slower, more expensive
- **gpt-4-turbo**: Balanced performance and cost
- **gpt-3.5-turbo**: Fastest, cheapest, good for simple tasks

## Basic Usage

### Quick Start Example

Here's a simple example demonstrating agent creation, tool registration, and task execution:

```typescript
import { DemandSideAgent } from '@x402-upl/cdp-agent';
import type { ToolMetadata } from '@x402-upl/cdp-agent';

// Initialize agent
const agent = new DemandSideAgent({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  cdpNetwork: 'devnet',
  llmModel: 'gpt-4',
});

// Create wallet and fund via faucet (devnet only)
const agentAddress = await agent.initialize();
console.log(`Agent wallet: ${agentAddress}`);

// Check balance
const balance = await agent.getBalance();
console.log(`Balance: ${balance / 1e9} SOL`);

// Register a tool
const echoTool: ToolMetadata = {
  toolId: 'echo-service',
  name: 'Echo Service',
  description: 'Returns the input message for testing',
  costLamports: 1000,
  paymentAddress: 'ToolProviderWalletAddressHere',
  parameters: {
    message: {
      type: 'string',
      description: 'Message to echo back',
      required: true,
    },
  },
  endpoint: 'https://api.example.com/echo',
  method: 'POST',
};

agent.registerTool(echoTool);

// Execute a task
const task = {
  taskId: 'task-001',
  description: 'Send a greeting message using the echo service',
  maxBudgetLamports: 10000,
};

const report = await agent.executeTask(task);

// Review results
console.log('Execution Success:', report.execution.success);
console.log('Total Cost:', report.execution.totalCost / 1e9, 'SOL');
console.log('Steps Executed:', report.execution.steps.length);
console.log('AI Analysis:', report.analysis);

// Cleanup
await agent.close();
```

### Step-by-Step Walkthrough

**1. Agent Initialization**

The `initialize()` method creates a new Solana wallet via CDP and funds it on devnet:

```typescript
const agent = new DemandSideAgent({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  cdpNetwork: 'devnet',
});

const address = await agent.initialize();
// Agent now has a funded wallet on devnet
```

**2. Tool Registration**

Define tools with metadata including costs, parameters, and API endpoints:

```typescript
const priceOracle: ToolMetadata = {
  toolId: 'price-oracle',
  name: 'Cryptocurrency Price Oracle',
  description: 'Get real-time cryptocurrency prices',
  costLamports: 5000,
  paymentAddress: 'PriceOracleProviderAddress',
  parameters: {
    symbol: {
      type: 'string',
      description: 'Crypto symbol (e.g., SOL, BTC)',
      required: true,
    },
    currency: {
      type: 'string',
      description: 'Fiat currency (e.g., USD, EUR)',
      required: false,
    },
  },
  endpoint: 'https://api.oracle.com/v1/price',
  method: 'GET',
};

agent.registerTool(priceOracle);
```

**3. Task Execution**

Submit high-level tasks and let the agent plan and execute:

```typescript
const task = {
  taskId: 'market-research-001',
  description: 'Get the current price of SOL in USD',
  maxBudgetLamports: 20000,
};

const report = await agent.executeTask(task);
```

**4. Result Inspection**

The execution report contains detailed information:

```typescript
console.log('Task:', report.task.description);
console.log('Plan:', report.plan.reasoning);
console.log('Steps:', report.plan.steps.length);

// Examine each step
for (const step of report.execution.steps) {
  console.log(`Step ${step.stepNumber}:`);
  console.log('  Tool:', step.toolId);
  console.log('  Success:', step.toolResult.success);
  console.log('  Data:', step.toolResult.data);
  console.log('  Payment:', step.payment?.signature);
  console.log('  Cost:', step.cost / 1e9, 'SOL');
}

console.log('Total Cost:', report.execution.totalCost / 1e9, 'SOL');
console.log('Total Time:', report.execution.totalTime, 'ms');
console.log('AI Analysis:', report.analysis);
```

## Advanced Usage

### Multi-Step Workflow with Dependencies

Create complex workflows where later steps depend on earlier results:

```typescript
// Register multiple tools
agent.registerTool({
  toolId: 'price-feed',
  name: 'Price Feed',
  description: 'Get cryptocurrency price',
  costLamports: 2000,
  paymentAddress: 'PriceFeedProviderAddress',
  parameters: {
    symbol: { type: 'string', description: 'Symbol', required: true },
  },
  endpoint: 'https://api.example.com/price',
  method: 'GET',
});

agent.registerTool({
  toolId: 'sentiment-analyzer',
  name: 'Market Sentiment Analyzer',
  description: 'Analyze market sentiment from social media',
  costLamports: 5000,
  paymentAddress: 'SentimentProviderAddress',
  parameters: {
    symbol: { type: 'string', description: 'Symbol', required: true },
  },
  endpoint: 'https://api.example.com/sentiment',
  method: 'GET',
});

agent.registerTool({
  toolId: 'trading-recommendation',
  name: 'Trading Recommendation Engine',
  description: 'Generate trading recommendation based on price and sentiment',
  costLamports: 10000,
  paymentAddress: 'TradingProviderAddress',
  parameters: {
    price: { type: 'number', description: 'Current price', required: true },
    sentiment: { type: 'string', description: 'Sentiment score', required: true },
  },
  endpoint: 'https://api.example.com/recommend',
  method: 'POST',
});

// Agent will automatically plan the dependency chain:
// 1. Get price (no dependencies)
// 2. Get sentiment (no dependencies)
// 3. Get recommendation (depends on 1 and 2)
const task = {
  taskId: 'trading-analysis-001',
  description: 'Analyze SOL market and provide trading recommendation',
  maxBudgetLamports: 50000,
};

const report = await agent.executeTask(task);

// The agent's plan will show the dependency structure
console.log('Execution Plan:', JSON.stringify(report.plan, null, 2));
```

### Custom Tool Discovery

Use category-based discovery to find relevant tools:

```typescript
// Discover tools by category
const priceTools = await agent.discoverTools('price');
const analysisTools = await agent.discoverTools('analysis');
const tradingTools = await agent.discoverTools('trading');

console.log('Available price tools:', priceTools.length);
console.log('Available analysis tools:', analysisTools.length);
console.log('Available trading tools:', tradingTools.length);

// List all registered tools
const allTools = agent.listAvailableTools();
console.log('Total tools:', allTools.length);

// Inspect tool metadata
for (const tool of allTools) {
  console.log(`${tool.name} (${tool.toolId})`);
  console.log(`  Cost: ${tool.costLamports / 1e9} SOL`);
  console.log(`  Endpoint: ${tool.endpoint}`);
  console.log(`  Method: ${tool.method}`);
}
```

### Error Handling and Retry Logic

Implement robust error handling for production deployments:

```typescript
async function executeWithRetry(
  agent: DemandSideAgent,
  task: AgentTask,
  maxRetries: number = 3
): Promise<AgentExecutionReport | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check balance before execution
      const balance = await agent.getBalance();
      if (balance < task.maxBudgetLamports) {
        throw new Error(`Insufficient balance: ${balance} < ${task.maxBudgetLamports}`);
      }

      // Execute task
      const report = await agent.executeTask(task);

      // Check if execution was successful
      if (!report.execution.success) {
        throw new Error(`Execution failed: ${report.execution.error}`);
      }

      return report;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error('All retry attempts failed:', lastError);
  return null;
}

// Usage
const report = await executeWithRetry(agent, task);
if (report) {
  console.log('Task completed successfully');
} else {
  console.log('Task failed after all retries');
}
```

### Budget Optimization

Implement cost-aware task execution:

```typescript
interface BudgetConfig {
  maxBudgetLamports: number;
  reservePercentage: number; // Keep reserve for gas fees
}

async function executWithBudgetControl(
  agent: DemandSideAgent,
  taskDescription: string,
  budgetConfig: BudgetConfig
): Promise<void> {
  const balance = await agent.getBalance();
  const usableBudget = Math.floor(
    balance * (1 - budgetConfig.reservePercentage / 100)
  );

  const adjustedBudget = Math.min(
    budgetConfig.maxBudgetLamports,
    usableBudget
  );

  console.log(`Balance: ${balance / 1e9} SOL`);
  console.log(`Max Budget: ${budgetConfig.maxBudgetLamports / 1e9} SOL`);
  console.log(`Adjusted Budget: ${adjustedBudget / 1e9} SOL`);

  const task = {
    taskId: `task-${Date.now()}`,
    description: taskDescription,
    maxBudgetLamports: adjustedBudget,
  };

  const report = await agent.executeTask(task);

  console.log(`Actual Cost: ${report.execution.totalCost / 1e9} SOL`);
  console.log(`Savings: ${(adjustedBudget - report.execution.totalCost) / 1e9} SOL`);
  console.log(`Remaining Balance: ${(balance - report.execution.totalCost) / 1e9} SOL`);
}

// Usage
await executWithBudgetControl(
  agent,
  'Analyze SOL market conditions',
  {
    maxBudgetLamports: 100000, // 0.0001 SOL
    reservePercentage: 10, // Keep 10% reserve
  }
);
```

### Parallel Tool Execution

While the ExecutionEngine handles dependencies automatically, you can structure tasks for maximum parallelism:

```typescript
// Register independent tools that can run in parallel
agent.registerTool({
  toolId: 'btc-price',
  name: 'Bitcoin Price',
  description: 'Get BTC price',
  costLamports: 2000,
  paymentAddress: 'Provider1Address',
  parameters: {},
  endpoint: 'https://api.example.com/btc',
  method: 'GET',
});

agent.registerTool({
  toolId: 'eth-price',
  name: 'Ethereum Price',
  description: 'Get ETH price',
  costLamports: 2000,
  paymentAddress: 'Provider2Address',
  parameters: {},
  endpoint: 'https://api.example.com/eth',
  method: 'GET',
});

agent.registerTool({
  toolId: 'sol-price',
  name: 'Solana Price',
  description: 'Get SOL price',
  costLamports: 2000,
  paymentAddress: 'Provider3Address',
  parameters: {},
  endpoint: 'https://api.example.com/sol',
  method: 'GET',
});

// This task will be planned with parallel execution where possible
const task = {
  taskId: 'multi-price-001',
  description: 'Get current prices for BTC, ETH, and SOL',
  maxBudgetLamports: 20000,
};

const report = await agent.executeTask(task);

// Check the plan to see parallel steps (dependsOn: [] for all)
console.log('Plan:', JSON.stringify(report.plan, null, 2));
```

## API Reference

### Classes

#### DemandSideAgent

Main agent class for autonomous task execution.

```typescript
class DemandSideAgent {
  constructor(config: DemandAgentConfig);

  // Lifecycle methods
  initialize(): Promise<string>;
  close(): Promise<void>;

  // Tool management
  registerTool(tool: ToolMetadata): void;
  discoverTools(query: string): Promise<ToolMetadata[]>;
  listAvailableTools(): ToolMetadata[];

  // Execution
  executeTask(task: AgentTask): Promise<AgentExecutionReport>;

  // Wallet management
  getBalance(): Promise<number>;
  getAddress(): string | null;
}
```

**Constructor Parameters:**

```typescript
interface DemandAgentConfig {
  openaiApiKey: string;           // OpenAI API key
  cdpNetwork: 'devnet' | 'mainnet-beta'; // Solana network
  llmModel?: string;              // Optional: LLM model (default: 'gpt-4')
}
```

**Methods:**

- `initialize()`: Creates CDP wallet and funds on devnet. Returns wallet address.
- `registerTool(tool)`: Adds a tool to the agent's registry.
- `discoverTools(query)`: Searches for tools matching the query string.
- `listAvailableTools()`: Returns all registered tools.
- `executeTask(task)`: Executes a task with autonomous planning and execution.
- `getBalance()`: Returns current wallet balance in lamports.
- `getAddress()`: Returns wallet address or null if not initialized.
- `close()`: Closes CDP client and cleans up resources.

#### CDPSolanaClient

Low-level CDP SDK wrapper for Solana operations.

```typescript
class CDPSolanaClient {
  constructor(network: 'devnet' | 'mainnet-beta');

  // Account management
  createAccount(): Promise<SolanaAccount>;
  requestFaucet(address: string): Promise<void>;
  getBalance(address: string): Promise<number>;
  waitForBalance(address: string, maxAttempts?: number): Promise<number>;

  // Transactions
  sendTransaction(from: string, to: string, lamports: number): Promise<TransactionResult>;
  verifyTransaction(signature: string): Promise<boolean>;
  getTransactionDetails(signature: string): Promise<TransactionDetails | null>;

  // Cleanup
  close(): Promise<void>;
}
```

**Types:**

```typescript
interface SolanaAccount {
  accountId: string;
  address: string;
  created: Date;
}

interface TransactionResult {
  signature: string;
  confirmed: boolean;
}
```

#### ToolRegistry

Service discovery and execution registry.

```typescript
class ToolRegistry {
  constructor();

  // Registration
  registerTool(tool: ToolMetadata): void;
  getTool(toolId: string): ToolMetadata | undefined;

  // Discovery
  listTools(): ToolMetadata[];
  findToolsByCategory(category: string): ToolMetadata[];

  // Execution
  executeTool(toolId: string, parameters: Record<string, any>): Promise<ToolResult>;

  // Cost calculation
  calculateTotalCost(toolIds: string[]): number;
}
```

**Types:**

```typescript
interface ToolMetadata {
  toolId: string;
  name: string;
  description: string;
  costLamports: number;
  paymentAddress: string;
  parameters: Record<string, ToolParameter>;
  endpoint: string;
  method: 'GET' | 'POST';
}

interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}
```

#### AgentBrain

LLM-powered reasoning and planning engine.

```typescript
class AgentBrain {
  constructor(openaiApiKey: string, registry: ToolRegistry, model?: string);

  // Planning
  planToolChain(task: AgentTask): Promise<ToolChainPlan>;
  optimizePlan(plan: ToolChainPlan): Promise<ToolChainPlan>;

  // Analysis
  reasonAboutResults(
    task: AgentTask,
    plan: ToolChainPlan,
    results: Array<{ step: number; result: any }>
  ): Promise<string>;
}
```

**Types:**

```typescript
interface AgentTask {
  taskId: string;
  description: string;
  maxBudgetLamports: number;
}

interface ToolChainPlan {
  steps: ToolChainStep[];
  estimatedCost: number;
  reasoning: string;
}

interface ToolChainStep {
  stepNumber: number;
  toolId: string;
  parameters: Record<string, any>;
  costLamports: number;
  dependsOn: number[];
}
```

#### ExecutionEngine

Multi-step workflow execution with payment automation.

```typescript
class ExecutionEngine {
  constructor(cdpClient: CDPSolanaClient, registry: ToolRegistry);

  execute(plan: ToolChainPlan, context: ExecutionContext): Promise<ExecutionResult>;
}
```

**Types:**

```typescript
interface ExecutionContext {
  agentAddress: string;
  maxBudgetLamports: number;
}

interface ExecutionResult {
  success: boolean;
  steps: StepResult[];
  totalCost: number;
  totalTime: number;
  error?: string;
}

interface StepResult {
  stepNumber: number;
  toolId: string;
  toolResult: ToolResult;
  payment: TransactionResult | null;
  cost: number;
}
```

### Type Definitions

#### AgentExecutionReport

Complete execution report returned by `executeTask()`:

```typescript
interface AgentExecutionReport {
  task: AgentTask;              // Original task
  plan: ToolChainPlan;          // Execution plan
  execution: ExecutionResult;    // Execution results
  analysis: string;              // AI-generated analysis
  timestamp: number;             // Unix timestamp
}
```

## Examples

### Example 1: Simple Echo Service

Basic example demonstrating agent initialization and single-tool execution:

```typescript
import { DemandSideAgent } from '@x402-upl/cdp-agent';
import dotenv from 'dotenv';

dotenv.config();

async function simpleExample() {
  // Initialize agent
  const agent = new DemandSideAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    cdpNetwork: 'devnet',
  });

  // Create and fund wallet
  console.log('Initializing agent...');
  const address = await agent.initialize();
  console.log(`Agent address: ${address}`);

  const balance = await agent.getBalance();
  console.log(`Balance: ${balance / 1e9} SOL`);

  // Register echo tool
  agent.registerTool({
    toolId: 'echo',
    name: 'Echo Service',
    description: 'Echoes back the input message',
    costLamports: 1000,
    paymentAddress: 'YourProviderAddressHere',
    parameters: {
      message: {
        type: 'string',
        description: 'Message to echo',
        required: true,
      },
    },
    endpoint: 'https://httpbin.org/post',
    method: 'POST',
  });

  // Execute task
  console.log('\nExecuting task...');
  const report = await agent.executeTask({
    taskId: 'echo-001',
    description: 'Echo the message "Hello X402!"',
    maxBudgetLamports: 5000,
  });

  // Display results
  console.log('\n=== Execution Report ===');
  console.log(`Success: ${report.execution.success}`);
  console.log(`Steps: ${report.execution.steps.length}`);
  console.log(`Cost: ${report.execution.totalCost / 1e9} SOL`);
  console.log(`Time: ${report.execution.totalTime}ms`);
  console.log(`\nAnalysis: ${report.analysis}`);

  await agent.close();
}

simpleExample().catch(console.error);
```

### Example 2: Market Analysis Workflow

Complex multi-step workflow for cryptocurrency market analysis:

```typescript
import { DemandSideAgent } from '@x402-upl/cdp-agent';
import dotenv from 'dotenv';

dotenv.config();

async function marketAnalysisExample() {
  const agent = new DemandSideAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    cdpNetwork: 'devnet',
    llmModel: 'gpt-4',
  });

  await agent.initialize();

  // Register price oracle
  agent.registerTool({
    toolId: 'price-oracle',
    name: 'Crypto Price Oracle',
    description: 'Real-time cryptocurrency price data',
    costLamports: 3000,
    paymentAddress: 'PriceProviderAddress',
    parameters: {
      symbol: { type: 'string', description: 'Crypto symbol', required: true },
    },
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    method: 'GET',
  });

  // Register sentiment analyzer
  agent.registerTool({
    toolId: 'sentiment',
    name: 'Social Sentiment Analyzer',
    description: 'Analyze social media sentiment for cryptocurrencies',
    costLamports: 8000,
    paymentAddress: 'SentimentProviderAddress',
    parameters: {
      symbol: { type: 'string', description: 'Crypto symbol', required: true },
      sources: { type: 'string', description: 'Data sources', required: false },
    },
    endpoint: 'https://api.sentiment.com/analyze',
    method: 'POST',
  });

  // Register technical analyzer
  agent.registerTool({
    toolId: 'technical',
    name: 'Technical Analysis Engine',
    description: 'Calculate technical indicators and chart patterns',
    costLamports: 12000,
    paymentAddress: 'TechnicalProviderAddress',
    parameters: {
      symbol: { type: 'string', description: 'Crypto symbol', required: true },
      timeframe: { type: 'string', description: 'Chart timeframe', required: true },
    },
    endpoint: 'https://api.technical.com/analyze',
    method: 'GET',
  });

  // Register recommendation engine
  agent.registerTool({
    toolId: 'recommendation',
    name: 'Trading Recommendation Engine',
    description: 'Generate trading recommendations based on analysis',
    costLamports: 15000,
    paymentAddress: 'RecommendationProviderAddress',
    parameters: {
      price: { type: 'number', description: 'Current price', required: true },
      sentiment: { type: 'object', description: 'Sentiment data', required: true },
      technical: { type: 'object', description: 'Technical data', required: true },
    },
    endpoint: 'https://api.recommendation.com/generate',
    method: 'POST',
  });

  // Execute comprehensive market analysis
  const task = {
    taskId: 'market-analysis-001',
    description: `Perform comprehensive market analysis for SOL:
      1. Get current price
      2. Analyze social sentiment
      3. Calculate technical indicators (1h timeframe)
      4. Generate trading recommendation`,
    maxBudgetLamports: 100000, // 0.0001 SOL
  };

  console.log('Starting market analysis...\n');
  const report = await agent.executeTask(task);

  // Display detailed results
  console.log('=== Market Analysis Report ===\n');

  console.log('Execution Plan:');
  console.log(`  Total Steps: ${report.plan.steps.length}`);
  console.log(`  Estimated Cost: ${report.plan.estimatedCost / 1e9} SOL`);
  console.log(`  Reasoning: ${report.plan.reasoning}\n`);

  console.log('Execution Results:');
  for (const step of report.execution.steps) {
    console.log(`\nStep ${step.stepNumber}: ${step.toolId}`);
    console.log(`  Success: ${step.toolResult.success}`);
    console.log(`  Cost: ${step.cost / 1e9} SOL`);
    console.log(`  Payment: ${step.payment?.signature || 'Free'}`);
    console.log(`  Execution Time: ${step.toolResult.executionTime}ms`);

    if (step.toolResult.success && step.toolResult.data) {
      console.log(`  Data:`, JSON.stringify(step.toolResult.data, null, 2));
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total Cost: ${report.execution.totalCost / 1e9} SOL`);
  console.log(`Total Time: ${report.execution.totalTime}ms`);
  console.log(`Success Rate: ${report.execution.steps.filter(s => s.toolResult.success).length}/${report.execution.steps.length}`);

  console.log(`\n=== AI Analysis ===`);
  console.log(report.analysis);

  await agent.close();
}

marketAnalysisExample().catch(console.error);
```

### Example 3: Budget-Constrained Execution

Demonstrates cost optimization and budget management:

```typescript
import { DemandSideAgent } from '@x402-upl/cdp-agent';

async function budgetOptimizationExample() {
  const agent = new DemandSideAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    cdpNetwork: 'devnet',
  });

  await agent.initialize();

  // Register tools with varying costs
  const tools = [
    {
      toolId: 'cheap-api',
      name: 'Basic Price Feed',
      description: 'Low-cost basic price data',
      costLamports: 500,
      endpoint: 'https://api.cheap.com/price',
    },
    {
      toolId: 'premium-api',
      name: 'Premium Price Feed',
      description: 'High-quality premium price data with volume',
      costLamports: 5000,
      endpoint: 'https://api.premium.com/price',
    },
    {
      toolId: 'ml-analysis',
      name: 'ML-Powered Analysis',
      description: 'Advanced machine learning price prediction',
      costLamports: 20000,
      endpoint: 'https://api.ml.com/predict',
    },
  ];

  for (const tool of tools) {
    agent.registerTool({
      ...tool,
      paymentAddress: 'ProviderAddress',
      parameters: {
        symbol: { type: 'string', description: 'Symbol', required: true },
      },
      method: 'GET',
    });
  }

  // Test with different budgets
  const budgets = [2000, 10000, 50000];

  for (const budget of budgets) {
    console.log(`\n=== Testing with budget: ${budget / 1e9} SOL ===`);

    try {
      const report = await agent.executeTask({
        taskId: `budget-test-${budget}`,
        description: 'Get SOL price data with best available quality',
        maxBudgetLamports: budget,
      });

      console.log(`Plan: ${report.plan.reasoning}`);
      console.log(`Selected tool: ${report.plan.steps[0].toolId}`);
      console.log(`Actual cost: ${report.execution.totalCost / 1e9} SOL`);
      console.log(`Savings: ${(budget - report.execution.totalCost) / 1e9} SOL`);
    } catch (error) {
      console.error(`Failed with budget ${budget}:`, error.message);
    }
  }

  await agent.close();
}

budgetOptimizationExample().catch(console.error);
```

### Example 4: Error Recovery and Retry

Production-ready error handling with retry logic:

```typescript
import { DemandSideAgent, AgentExecutionReport } from '@x402-upl/cdp-agent';

class ResilientAgent {
  private agent: DemandSideAgent;
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;

  constructor(agent: DemandSideAgent, maxRetries?: number) {
    this.agent = agent;
    if (maxRetries) this.maxRetries = maxRetries;
  }

  async executeTaskWithRetry(
    taskDescription: string,
    budget: number
  ): Promise<AgentExecutionReport | null> {
    const task = {
      taskId: `task-${Date.now()}`,
      description: taskDescription,
      maxBudgetLamports: budget,
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${this.maxRetries}`);

        // Check balance
        const balance = await this.agent.getBalance();
        if (balance < budget * 1.1) { // 10% buffer for gas
          throw new Error('Insufficient balance');
        }

        // Execute task
        const report = await this.agent.executeTask(task);

        // Verify success
        if (!report.execution.success) {
          throw new Error(`Execution failed: ${report.execution.error}`);
        }

        // Verify all steps succeeded
        const failedSteps = report.execution.steps.filter(
          s => !s.toolResult.success
        );

        if (failedSteps.length > 0) {
          throw new Error(`${failedSteps.length} steps failed`);
        }

        console.log('Task completed successfully');
        return report;

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('All retry attempts exhausted');
    return null;
  }
}

// Usage example
async function resilientExecutionExample() {
  const agent = new DemandSideAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    cdpNetwork: 'devnet',
  });

  await agent.initialize();

  // Register potentially flaky service
  agent.registerTool({
    toolId: 'flaky-service',
    name: 'Potentially Unreliable Service',
    description: 'Service that may timeout or fail occasionally',
    costLamports: 2000,
    paymentAddress: 'ProviderAddress',
    parameters: {},
    endpoint: 'https://api.flaky.com/data',
    method: 'GET',
  });

  // Execute with retry logic
  const resilientAgent = new ResilientAgent(agent, 5);

  const report = await resilientAgent.executeTaskWithRetry(
    'Get data from the flaky service',
    10000
  );

  if (report) {
    console.log('Success! Analysis:', report.analysis);
  } else {
    console.log('Failed after all retries');
  }

  await agent.close();
}

resilientExecutionExample().catch(console.error);
```

### Example 5: Real-Time Monitoring

Monitor agent execution with real-time progress updates:

```typescript
import { DemandSideAgent, StepResult } from '@x402-upl/cdp-agent';
import { EventEmitter } from 'events';

class MonitoredAgent extends EventEmitter {
  private agent: DemandSideAgent;

  constructor(agent: DemandSideAgent) {
    super();
    this.agent = agent;
  }

  async executeTaskWithMonitoring(
    taskDescription: string,
    budget: number
  ) {
    this.emit('task:started', { description: taskDescription, budget });

    const startTime = Date.now();

    try {
      const report = await this.agent.executeTask({
        taskId: `task-${Date.now()}`,
        description: taskDescription,
        maxBudgetLamports: budget,
      });

      // Emit events for each step
      for (const step of report.execution.steps) {
        this.emit('step:completed', {
          stepNumber: step.stepNumber,
          toolId: step.toolId,
          success: step.toolResult.success,
          cost: step.cost,
          signature: step.payment?.signature,
        });
      }

      const duration = Date.now() - startTime;

      this.emit('task:completed', {
        success: report.execution.success,
        totalCost: report.execution.totalCost,
        duration,
        analysis: report.analysis,
      });

      return report;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit('task:failed', {
        error: error.message,
        duration,
      });

      throw error;
    }
  }
}

// Usage with real-time monitoring
async function monitoringExample() {
  const agent = new DemandSideAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    cdpNetwork: 'devnet',
  });

  await agent.initialize();

  // Register tools
  agent.registerTool({
    toolId: 'step1',
    name: 'Step 1',
    description: 'First step',
    costLamports: 1000,
    paymentAddress: 'Address1',
    parameters: {},
    endpoint: 'https://api.example.com/step1',
    method: 'GET',
  });

  agent.registerTool({
    toolId: 'step2',
    name: 'Step 2',
    description: 'Second step',
    costLamports: 2000,
    paymentAddress: 'Address2',
    parameters: {},
    endpoint: 'https://api.example.com/step2',
    method: 'GET',
  });

  // Create monitored agent
  const monitored = new MonitoredAgent(agent);

  // Set up event listeners
  monitored.on('task:started', (data) => {
    console.log(`\n🚀 Task started: ${data.description}`);
    console.log(`   Budget: ${data.budget / 1e9} SOL`);
  });

  monitored.on('step:completed', (data) => {
    console.log(`\n✓ Step ${data.stepNumber} completed: ${data.toolId}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Cost: ${data.cost / 1e9} SOL`);
    if (data.signature) {
      console.log(`   Signature: ${data.signature}`);
    }
  });

  monitored.on('task:completed', (data) => {
    console.log(`\n✅ Task completed successfully`);
    console.log(`   Total Cost: ${data.totalCost / 1e9} SOL`);
    console.log(`   Duration: ${data.duration}ms`);
    console.log(`   Analysis: ${data.analysis}`);
  });

  monitored.on('task:failed', (data) => {
    console.log(`\n❌ Task failed`);
    console.log(`   Error: ${data.error}`);
    console.log(`   Duration: ${data.duration}ms`);
  });

  // Execute task with monitoring
  await monitored.executeTaskWithMonitoring(
    'Execute multi-step workflow',
    20000
  );

  await agent.close();
}

monitoringExample().catch(console.error);
```

## Integration with X402

### Payment Flow Integration

The CDP Agent seamlessly integrates with the X402 payment protocol:

1. **Service Discovery**: Agents discover X402-compatible services through the registry
2. **Payment Verification**: Before execution, agents verify payment requirements
3. **Automatic Payment**: Agents send SOL payments to provider addresses
4. **Transaction Proof**: Payment signatures can be included in API headers
5. **Service Execution**: Providers verify payments and execute services

```typescript
// X402-compatible tool registration
agent.registerTool({
  toolId: 'x402-service',
  name: 'X402 Compatible Service',
  description: 'Service accepting X402 payments',
  costLamports: 5000, // Matches X402 service price
  paymentAddress: 'X402ServiceProviderWallet', // Provider's payment address
  parameters: {
    // Service-specific parameters
  },
  endpoint: 'https://x402-service.example.com/api/v1/execute',
  method: 'POST',
});
```

### Registry Integration

Integrate with X402 service registry for dynamic service discovery:

```typescript
import { X402RegistryClient } from '@x402-upl/cdp-agent';

// Connect to X402 registry
const registry = new X402RegistryClient({
  registryUrl: 'https://registry.x402.com',
});

// Discover services
const services = await registry.discoverServices({
  category: 'price-data',
  network: 'solana',
  maxCost: 10000,
});

// Register discovered services with agent
for (const service of services) {
  agent.registerTool({
    toolId: service.serviceId,
    name: service.name,
    description: service.description,
    costLamports: service.pricing.lamports,
    paymentAddress: service.paymentAddress,
    parameters: service.parameters,
    endpoint: service.endpoint,
    method: service.method,
  });
}
```

### End-to-End X402 Workflow

Complete example of CDP Agent in X402 ecosystem:

```typescript
import { DemandSideAgent } from '@x402-upl/cdp-agent';
import { X402RegistryClient } from '@x402-upl/registry-client';

async function x402WorkflowExample() {
  // Initialize agent
  const agent = new DemandSideAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    cdpNetwork: 'mainnet-beta', // Production
  });

  await agent.initialize();

  // Connect to X402 registry
  const registry = new X402RegistryClient({
    registryUrl: process.env.X402_REGISTRY_URL!,
  });

  // Discover AI services
  const aiServices = await registry.discoverServices({
    category: 'ai-inference',
    network: 'solana',
    sortBy: 'price', // Cheapest first
    limit: 5,
  });

  console.log(`Found ${aiServices.length} AI services`);

  // Register services with agent
  for (const service of aiServices) {
    agent.registerTool({
      toolId: service.serviceId,
      name: service.name,
      description: service.description,
      costLamports: service.pricing.lamports,
      paymentAddress: service.paymentAddress,
      parameters: service.parameters,
      endpoint: service.endpoint,
      method: service.method,
    });
  }

  // Execute task using discovered services
  const report = await agent.executeTask({
    taskId: 'x402-task-001',
    description: 'Analyze market sentiment using available AI services',
    maxBudgetLamports: 100000,
  });

  // Report results back to registry (optional)
  for (const step of report.execution.steps) {
    if (step.toolResult.success) {
      await registry.reportServiceUsage({
        serviceId: step.toolId,
        success: true,
        latency: step.toolResult.executionTime,
        paymentSignature: step.payment?.signature,
      });
    }
  }

  console.log('X402 workflow completed');
  console.log('Analysis:', report.analysis);

  await agent.close();
}

x402WorkflowExample().catch(console.error);
```

## Troubleshooting

### Common Issues and Solutions

#### 1. CDP Authentication Errors

**Problem**: `Error: CDP API authentication failed`

**Cause**: Invalid or malformed CDP credentials

**Solution**:
```bash
# Verify credentials format
echo $CDP_API_KEY_NAME
# Should be: organizations/{org-id}/apiKeys/{key-id}

# Check private key format
echo $CDP_PRIVATE_KEY | head -n 1
# Should start with: -----BEGIN EC PRIVATE KEY-----

# Ensure no extra whitespace or quotes
CDP_PRIVATE_KEY="$(cat cdp-key.json | jq -r .privateKey)"
```

#### 2. Insufficient Balance Errors

**Problem**: `Error: Insufficient balance: 0 < 10000`

**Cause**: Wallet not funded or faucet failed

**Solution**:
```typescript
// Wait longer for faucet
await client.waitForBalance(address, 60); // 60 attempts = 60 seconds

// Check balance manually
const balance = await agent.getBalance();
console.log(`Current balance: ${balance / 1e9} SOL`);

// For mainnet, fund wallet externally
// Use Solana CLI or exchange to send SOL
```

#### 3. OpenAI API Errors

**Problem**: `Error: OpenAI API rate limit exceeded`

**Cause**: Too many requests or quota exceeded

**Solution**:
```typescript
// Add retry logic with exponential backoff
import { sleep } from './utils';

async function executeWithBackoff(agent, task, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await agent.executeTask(task);
    } catch (error) {
      if (error.message.includes('rate limit')) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Rate limited, waiting ${delay}ms`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

#### 4. Transaction Confirmation Timeout

**Problem**: `Error: Transaction confirmation timeout`

**Cause**: Network congestion or RPC issues

**Solution**:
```typescript
// Use custom RPC endpoint with higher rate limits
const client = new CDPSolanaClient('mainnet-beta');

// Override connection (advanced)
client['connection'] = new Connection(
  process.env.CUSTOM_RPC_URL || 'https://api.mainnet-beta.solana.com',
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 120000, // 2 minutes
  }
);
```

#### 5. Tool Execution Failures

**Problem**: `Step 1 failed: HTTP 502: Bad Gateway`

**Cause**: Service provider endpoint unavailable

**Solution**:
```typescript
// Implement retry for individual tool calls
class RobustToolRegistry extends ToolRegistry {
  async executeTool(toolId: string, params: any, retries = 3): Promise<ToolResult> {
    for (let i = 0; i < retries; i++) {
      const result = await super.executeTool(toolId, params);

      if (result.success) return result;

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    return super.executeTool(toolId, params);
  }
}
```

#### 6. Budget Exceeded During Execution

**Problem**: `Error: Budget exceeded during execution`

**Cause**: Actual costs exceeded estimated costs

**Solution**:
```typescript
// Add buffer to budget
const task = {
  taskId: 'task-001',
  description: 'Execute task',
  maxBudgetLamports: estimatedCost * 1.2, // 20% buffer
};

// Or request cost breakdown before execution
const plan = await agent['brain'].planToolChain(task);
console.log('Estimated cost:', plan.estimatedCost);
console.log('Budget:', task.maxBudgetLamports);
console.log('Buffer:', task.maxBudgetLamports - plan.estimatedCost);
```

#### 7. Circular Dependency in Tool Chain

**Problem**: `Error: Circular dependency detected in tool chain`

**Cause**: LLM created invalid dependency graph

**Solution**:
```typescript
// Validate plan before execution
function validatePlan(plan: ToolChainPlan): boolean {
  const stepNumbers = new Set(plan.steps.map(s => s.stepNumber));

  for (const step of plan.steps) {
    for (const dep of step.dependsOn) {
      if (!stepNumbers.has(dep)) {
        console.error(`Invalid dependency: ${dep} not found`);
        return false;
      }
      if (dep >= step.stepNumber) {
        console.error(`Invalid dependency: ${dep} >= ${step.stepNumber}`);
        return false;
      }
    }
  }

  return true;
}

// Re-plan if validation fails
let plan = await brain.planToolChain(task);
if (!validatePlan(plan)) {
  console.log('Invalid plan, re-planning...');
  plan = await brain.planToolChain(task);
}
```

#### 8. LLM Returns Invalid JSON

**Problem**: `Error: Unexpected token in JSON`

**Cause**: LLM generated malformed JSON despite structured output

**Solution**:
```typescript
// Add JSON validation and repair
function repairJSON(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    // Try to extract JSON from markdown code blocks
    const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      return JSON.parse(match[1]);
    }

    // Try to remove trailing commas
    const repaired = jsonString.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(repaired);
  }
}

// Use in AgentBrain
const content = response.choices[0].message.content;
const plan = repairJSON(content);
```

#### 9. CDP Client Connection Issues

**Problem**: `Error: CDP client failed to connect`

**Cause**: Network issues or CDP service outage

**Solution**:
```bash
# Check CDP service status
curl -I https://api.cdp.coinbase.com/health

# Test network connectivity
ping api.cdp.coinbase.com

# Use alternative initialization
const client = new CDPSolanaClient('devnet');
await client.createAccount(); // Will throw if connection fails

# Check logs for detailed error
DEBUG=cdp:* node your-script.js
```

#### 10. Memory Leaks in Long-Running Agents

**Problem**: Memory usage grows over time

**Cause**: Event listeners or unclosed connections

**Solution**:
```typescript
class ManagedAgent {
  private agent: DemandSideAgent;
  private taskCount: number = 0;
  private maxTasksBeforeRecycle: number = 100;

  async executeTask(task: AgentTask): Promise<AgentExecutionReport> {
    const report = await this.agent.executeTask(task);
    this.taskCount++;

    // Periodically recreate agent to free memory
    if (this.taskCount >= this.maxTasksBeforeRecycle) {
      console.log('Recycling agent to free memory...');
      await this.agent.close();

      this.agent = new DemandSideAgent({
        openaiApiKey: process.env.OPENAI_API_KEY!,
        cdpNetwork: 'devnet',
      });

      await this.agent.initialize();
      this.taskCount = 0;
    }

    return report;
  }

  async close(): Promise<void> {
    await this.agent.close();
  }
}
```

#### 11. Tool Discovery Returns No Results

**Problem**: `discoverTools()` returns empty array

**Cause**: No tools match the search query

**Solution**:
```typescript
// Check registered tools
const allTools = agent.listAvailableTools();
console.log('Registered tools:', allTools.map(t => t.toolId));

// Use broader search terms
const results = await agent.discoverTools('price'); // Instead of "price-feed"

// Search is case-insensitive and searches description
agent.registerTool({
  toolId: 'my-service',
  description: 'This service provides PRICE data and analysis', // Will match "price"
  // ...
});
```

#### 12. Payment Verification Failures

**Problem**: Service provider claims payment not received

**Cause**: Transaction pending or RPC delay

**Solution**:
```typescript
// Verify transaction before calling service
async function executeWithVerification(
  engine: ExecutionEngine,
  plan: ToolChainPlan,
  context: ExecutionContext
): Promise<ExecutionResult> {
  // Custom execution with verification
  for (const step of plan.steps) {
    const tool = registry.getTool(step.toolId);

    // Send payment
    const payment = await cdpClient.sendTransaction(
      context.agentAddress,
      tool.paymentAddress,
      tool.costLamports
    );

    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify payment
    const verified = await cdpClient.verifyTransaction(payment.signature);
    if (!verified) {
      throw new Error('Payment verification failed');
    }

    // Now execute tool
    const result = await registry.executeTool(step.toolId, step.parameters);
  }
}
```

#### 13. Type Errors with Tool Parameters

**Problem**: TypeScript errors with tool parameter types

**Cause**: Parameter type mismatch

**Solution**:
```typescript
// Use proper type definitions
import type { ToolMetadata, ToolParameter } from '@x402-upl/cdp-agent';

// Define parameters with correct types
const parameters: Record<string, ToolParameter> = {
  symbol: {
    type: 'string',
    description: 'Crypto symbol',
    required: true,
  },
  limit: {
    type: 'number',
    description: 'Result limit',
    required: false,
  },
};

const tool: ToolMetadata = {
  toolId: 'my-tool',
  name: 'My Tool',
  description: 'Tool description',
  costLamports: 1000,
  paymentAddress: 'Address',
  parameters, // Correctly typed
  endpoint: 'https://api.example.com',
  method: 'GET',
};
```

#### 14. Devnet Faucet Rate Limiting

**Problem**: `Error: Faucet rate limit exceeded`

**Cause**: Too many faucet requests

**Solution**:
```typescript
// Reuse existing funded wallets
const DEVNET_WALLET_CACHE = new Map<string, string>();

async function getOrCreateDevnetWallet(
  client: CDPSolanaClient,
  identifier: string
): Promise<string> {
  if (DEVNET_WALLET_CACHE.has(identifier)) {
    return DEVNET_WALLET_CACHE.get(identifier)!;
  }

  const account = await client.createAccount();
  await client.requestFaucet(account.address);
  await client.waitForBalance(account.address);

  DEVNET_WALLET_CACHE.set(identifier, account.address);
  return account.address;
}
```

#### 15. Debugging LLM Planning Issues

**Problem**: Agent makes poor planning decisions

**Cause**: Insufficient context or unclear tool descriptions

**Solution**:
```typescript
// Improve tool descriptions
agent.registerTool({
  toolId: 'price-feed',
  name: 'Real-Time Cryptocurrency Price Feed',
  description: `Provides real-time cryptocurrency price data from multiple exchanges.
    Features:
    - Aggregated prices from 10+ exchanges
    - Support for 100+ cryptocurrencies
    - USD, EUR, GBP quote currencies
    - 99.9% uptime SLA
    Use this for: current prices, price comparisons, market data
    Do not use for: historical data, predictions, technical analysis`,
  // ...
});

// Add logging to see LLM reasoning
const brain = new AgentBrain(apiKey, registry, 'gpt-4');
const plan = await brain.planToolChain(task);
console.log('LLM Reasoning:', plan.reasoning);
console.log('Selected Tools:', plan.steps.map(s => s.toolId));
```

## Security Considerations

### Key Management Best Practices

1. **Never commit credentials**: Use `.env` files and add to `.gitignore`
2. **Use environment variables**: Store sensitive data in environment, not code
3. **Rotate keys regularly**: Generate new CDP API keys periodically
4. **Limit permissions**: Use least-privilege principle for API keys
5. **Monitor usage**: Track API key usage for anomalies

```typescript
// Good: Load from environment
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  cdpNetwork: 'mainnet-beta' as const,
};

// Bad: Hardcoded credentials
const config = {
  openaiApiKey: 'sk-hardcoded-key', // NEVER DO THIS
  cdpNetwork: 'mainnet-beta' as const,
};
```

### Budget Protection

Implement strict budget controls to prevent runaway costs:

```typescript
class BudgetProtectedAgent {
  private agent: DemandSideAgent;
  private dailyBudgetLamports: number;
  private spentToday: number = 0;
  private lastReset: Date = new Date();

  constructor(agent: DemandSideAgent, dailyBudgetLamports: number) {
    this.agent = agent;
    this.dailyBudgetLamports = dailyBudgetLamports;
  }

  private checkDailyReset(): void {
    const now = new Date();
    if (now.getDate() !== this.lastReset.getDate()) {
      this.spentToday = 0;
      this.lastReset = now;
    }
  }

  async executeTask(task: AgentTask): Promise<AgentExecutionReport> {
    this.checkDailyReset();

    // Check daily budget
    if (this.spentToday + task.maxBudgetLamports > this.dailyBudgetLamports) {
      throw new Error('Daily budget exceeded');
    }

    const report = await this.agent.executeTask(task);
    this.spentToday += report.execution.totalCost;

    return report;
  }
}
```

### Rate Limiting

Protect against excessive API usage:

```typescript
class RateLimitedAgent {
  private agent: DemandSideAgent;
  private requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(agent: DemandSideAgent, requestsPerMinute: number = 10) {
    this.agent = agent;
    this.requestsPerMinute = requestsPerMinute;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      t => t > oneMinuteAgo
    );

    // Check limit
    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + 60000 - now;

      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      return this.enforceRateLimit(); // Recursive check
    }

    this.requestTimestamps.push(now);
  }

  async executeTask(task: AgentTask): Promise<AgentExecutionReport> {
    await this.enforceRateLimit();
    return await this.agent.executeTask(task);
  }
}
```

### Transaction Validation

Always validate transaction details before execution:

```typescript
async function validateAndExecute(
  client: CDPSolanaClient,
  from: string,
  to: string,
  lamports: number
): Promise<TransactionResult> {
  // Validate addresses
  if (!PublicKey.isOnCurve(new PublicKey(from))) {
    throw new Error('Invalid sender address');
  }
  if (!PublicKey.isOnCurve(new PublicKey(to))) {
    throw new Error('Invalid recipient address');
  }

  // Validate amount
  if (lamports <= 0 || lamports > 1000000000) { // Max 1 SOL
    throw new Error('Invalid amount');
  }

  // Check balance
  const balance = await client.getBalance(from);
  if (balance < lamports + 5000) { // Include fee buffer
    throw new Error('Insufficient balance including fees');
  }

  // Execute transaction
  return await client.sendTransaction(from, to, lamports);
}
```

### Audit Logging

Implement comprehensive logging for security audits:

```typescript
import { createWriteStream } from 'fs';
import { format } from 'util';

class AuditLogger {
  private stream: WriteStream;

  constructor(logPath: string) {
    this.stream = createWriteStream(logPath, { flags: 'a' });
  }

  log(event: string, data: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };

    this.stream.write(JSON.stringify(entry) + '\n');
  }

  close(): void {
    this.stream.end();
  }
}

// Usage
const auditLog = new AuditLogger('./audit.log');

// Log task execution
auditLog.log('task:started', {
  taskId: task.taskId,
  budget: task.maxBudgetLamports,
});

// Log payments
auditLog.log('payment:sent', {
  from: agentAddress,
  to: providerAddress,
  amount: lamports,
  signature: result.signature,
});

// Log results
auditLog.log('task:completed', {
  taskId: task.taskId,
  success: report.execution.success,
  actualCost: report.execution.totalCost,
});
```

## Performance Optimization

### LLM Response Caching

Cache LLM responses for similar tasks:

```typescript
import { createHash } from 'crypto';

class CachedAgentBrain extends AgentBrain {
  private planCache: Map<string, ToolChainPlan> = new Map();

  private hashTask(task: AgentTask): string {
    return createHash('sha256')
      .update(task.description + task.maxBudgetLamports)
      .digest('hex');
  }

  async planToolChain(task: AgentTask): Promise<ToolChainPlan> {
    const hash = this.hashTask(task);

    if (this.planCache.has(hash)) {
      console.log('Using cached plan');
      return this.planCache.get(hash)!;
    }

    const plan = await super.planToolChain(task);
    this.planCache.set(hash, plan);

    // Limit cache size
    if (this.planCache.size > 100) {
      const firstKey = this.planCache.keys().next().value;
      this.planCache.delete(firstKey);
    }

    return plan;
  }
}
```

### Parallel Tool Execution

Execute independent tools in parallel:

```typescript
class ParallelExecutionEngine extends ExecutionEngine {
  async execute(
    plan: ToolChainPlan,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const results: StepResult[] = [];
    let totalCost = 0;

    // Group steps by dependency level
    const levels = this.groupByDependencyLevel(plan.steps);

    // Execute each level in parallel
    for (const level of levels) {
      const promises = level.map(step => this.executeStep(step, context));
      const levelResults = await Promise.all(promises);

      results.push(...levelResults);
      totalCost += levelResults.reduce((sum, r) => sum + r.cost, 0);
    }

    return {
      success: true,
      steps: results,
      totalCost,
      totalTime: Date.now() - startTime,
    };
  }

  private groupByDependencyLevel(steps: ToolChainStep[]): ToolChainStep[][] {
    const levels: ToolChainStep[][] = [];
    const processed = new Set<number>();

    while (processed.size < steps.length) {
      const level = steps.filter(step =>
        !processed.has(step.stepNumber) &&
        step.dependsOn.every(dep => processed.has(dep))
      );

      if (level.length === 0) break;

      levels.push(level);
      level.forEach(step => processed.add(step.stepNumber));
    }

    return levels;
  }
}
```

### Connection Pooling

Reuse HTTP connections for better performance:

```typescript
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

const httpAgent = new HttpAgent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 50 });

class OptimizedToolRegistry extends ToolRegistry {
  async executeTool(
    toolId: string,
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    const tool = this.getTool(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolId} not found`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(tool.endpoint, {
        method: tool.method,
        headers: { 'Content-Type': 'application/json' },
        body: tool.method === 'POST' ? JSON.stringify(parameters) : undefined,
        // @ts-ignore - Node.js specific
        agent: tool.endpoint.startsWith('https') ? httpsAgent : httpAgent,
      });

      const data = await response.json();

      return {
        success: true,
        data,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }
}
```

### Memory Optimization

Reduce memory footprint for long-running agents:

```typescript
class MemoryEfficientAgent {
  private agent: DemandSideAgent;
  private maxHistorySize: number = 10;
  private executionHistory: AgentExecutionReport[] = [];

  async executeTask(task: AgentTask): Promise<AgentExecutionReport> {
    const report = await this.agent.executeTask(task);

    // Store only essential data
    const summary = {
      task: { taskId: task.taskId, description: task.description },
      execution: {
        success: report.execution.success,
        totalCost: report.execution.totalCost,
        totalTime: report.execution.totalTime,
      },
      timestamp: report.timestamp,
    };

    this.executionHistory.push(summary as any);

    // Limit history size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }

    return report;
  }

  getHistory(): AgentExecutionReport[] {
    return this.executionHistory;
  }
}
```

## Changelog

### v1.0.0 (Current)

Initial release with core features:

- CDP Server Wallets v2 integration
- Autonomous agent with GPT-4 reasoning
- Tool registry and discovery
- Multi-step execution engine
- Payment automation
- Budget management
- Solana devnet/mainnet support
- Complete TypeScript types
- Comprehensive test coverage
- Example implementations

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:

- GitHub Issues: https://github.com/yourusername/x402-upl/issues
- Documentation: https://docs.x402.com
- Discord: https://discord.gg/x402

## Contributors

Built by the X402 team and community contributors.
