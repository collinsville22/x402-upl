# CDP Embedded Wallets - Demand-Side Agents

Production implementation of autonomous demand-side agents using CDP Server Wallets v2 that discover, reason over, and pay for chained tool calls on Solana.

## Architecture

```
DemandSideAgent
├── CDPSolanaClient (CDP v2 API wrapper)
├── ToolRegistry (Tool discovery and management)
├── AgentBrain (LLM-based reasoning with GPT-4)
├── ExecutionEngine (Chained tool execution)
└── Payment Automation (Per-tool SOL payments)
```

## Features

- **CDP Server Wallet v2 Integration**: Real Solana account creation and transaction signing
- **Autonomous Agent**: GPT-4 powered reasoning for task planning
- **Tool Discovery**: Dynamic tool registry with category-based search
- **Chained Execution**: Multi-step workflows with dependency resolution
- **Payment Automation**: Automatic SOL payment per tool call
- **Cost Optimization**: LLM-based plan optimization for budget constraints
- **Production Ready**: Full error handling, type safety, comprehensive tests

## Installation

```bash
npm install
```

## Environment Variables

```bash
CDP_API_KEY_NAME=your_cdp_api_key
CDP_PRIVATE_KEY=your_cdp_private_key
OPENAI_API_KEY=your_openai_api_key
```

## Quick Start

```typescript
import { DemandSideAgent } from '@x402-upl/cdp-wallets';

const agent = new DemandSideAgent({
  openaiApiKey: process.env.OPENAI_API_KEY,
  cdpNetwork: 'devnet',
});

await agent.initialize();

agent.registerTool({
  toolId: 'price-oracle',
  name: 'Price Oracle',
  description: 'Get cryptocurrency prices',
  costLamports: 1000,
  paymentAddress: 'RecipientWalletAddress',
  parameters: {
    symbol: {
      type: 'string',
      description: 'Crypto symbol',
      required: true,
    },
  },
  endpoint: 'https://api.example.com/price',
  method: 'GET',
});

const report = await agent.executeTask({
  taskId: 'task-001',
  description: 'Get SOL price and analyze sentiment',
  maxBudgetLamports: 50000,
});

console.log(report.analysis);
```

## Core Components

### 1. CDPSolanaClient

Wrapper around CDP v2 SDK for Solana operations:

```typescript
const client = new CDPSolanaClient('devnet');
const account = await client.createAccount();
await client.requestFaucet(account.address);
const result = await client.sendTransaction(
  account.address,
  recipientAddress,
  lamports
);
```

### 2. ToolRegistry

Manages available tools and executes API calls:

```typescript
const registry = new ToolRegistry();
registry.registerTool(toolMetadata);
const tools = registry.findToolsByCategory('price');
const result = await registry.executeTool('tool-id', { param: 'value' });
```

### 3. AgentBrain

LLM-powered reasoning engine:

```typescript
const brain = new AgentBrain(openaiApiKey, registry);
const plan = await brain.planToolChain(task);
const optimized = await brain.optimizePlan(plan);
const analysis = await brain.reasonAboutResults(task, plan, results);
```

### 4. ExecutionEngine

Executes tool chains with payment automation:

```typescript
const engine = new ExecutionEngine(cdpClient, registry);
const result = await engine.execute(plan, {
  agentAddress: 'AgentWalletAddress',
  maxBudgetLamports: 100000,
});
```

### 5. DemandSideAgent

High-level autonomous agent interface:

```typescript
const agent = new DemandSideAgent({
  openaiApiKey,
  cdpNetwork: 'devnet',
});

await agent.initialize();
agent.registerTool(toolMetadata);
const report = await agent.executeTask(task);
```

## Testing

```bash
npm test
```

Tests include:
- CDP client account creation and transactions
- Tool registry operations
- Agent task execution
- Payment automation
- Error handling

## Examples

### Simple Echo Agent

```bash
npm run example:simple
```

### Market Analysis Agent

```bash
npm run example:market
```

Executes multi-step market analysis:
1. Gets current SOL price
2. Analyzes market sentiment
3. Calculates technical indicators
4. Provides trading recommendation

Each step pays the tool provider automatically.

## How It Works

1. **Task Submission**: User provides task description and budget
2. **Tool Discovery**: Agent searches registry for relevant tools
3. **Plan Generation**: LLM creates execution plan with cost estimates
4. **Plan Optimization**: LLM optimizes for cost and efficiency
5. **Budget Check**: Validates plan against budget constraints
6. **Execution**:
   - For each tool:
     - Sends payment to tool provider
     - Executes tool API call
     - Collects result
7. **Analysis**: LLM analyzes results and generates report

## Key Features

- **CDP Server Wallets v2**: Uses official `@coinbase/cdp-sdk` for secure wallet management
- **Solana Support**: Full SVM transaction support with on-chain verification
- **Autonomous Agents**: Self-directed task planning and execution with GPT-4
- **Tool Discovery**: Dynamic tool registry with category-based search
- **Reasoning Engine**: LLM-powered decision making and cost optimization
- **Chained Tool Calls**: Multi-step workflows with automatic dependency resolution
- **Payment Automation**: Automatic SOL payments per tool invocation
- **Production Quality**: Comprehensive error handling, type safety, and test coverage

## Technical Details

### CDP v2 API Usage

- Account creation: `cdp.solana.createAccount()`
- Transaction signing: `cdp.solana.signTransaction()`
- Faucet requests: `cdp.solana.requestFaucet()`

### Solana Integration

- Connection to devnet/mainnet RPC
- Transaction building with `@solana/web3.js`
- Base64 serialization for CDP signing
- Confirmation tracking

### LLM Integration

- GPT-4 for task planning
- JSON mode for structured outputs
- Cost optimization reasoning
- Result analysis generation

### Payment Flow

```
Agent Wallet (CDP) → Tool Provider Wallet
     ↓
Tool API Call
     ↓
Result Collection
     ↓
Next Tool (repeat)
```

## Security

- Private keys never exposed (CDP TEE)
- Budget constraints enforced
- Balance verification before execution
- Transaction confirmation required
- Error handling for failed payments

## License

MIT
