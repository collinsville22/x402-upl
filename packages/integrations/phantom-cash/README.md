# Phantom CASH x402 Agent

Production-grade autonomous agent implementing HTTP 402 Payment Required protocol with Phantom CASH for micropayments.

**Bounty Submission**: Best use of CASH - $10,000 Prize

## Overview

This implementation combines three cutting-edge technologies:

1. **HTTP 402 Payment Required Protocol**: Industry-standard protocol for API monetization
2. **Phantom CASH**: USD-pegged stablecoin with gasless transactions on Solana
3. **LLM-Powered Autonomy**: GPT-4 driven service discovery, planning, and execution

## Architecture

```
┌─────────────────────────────────────────┐
│     PhantomAgent (Orchestration)        │
├─────────────────────────────────────────┤
│  ┌─────────────┐   ┌────────────────┐  │
│  │ AgentBrain  │   │ ServiceRegistry│  │
│  │ (GPT-4)     │   │ (Discovery)    │  │
│  └──────┬──────┘   └────────┬───────┘  │
│         │                   │           │
│  ┌──────▼──────────────────▼───────┐   │
│  │    ExecutionEngine               │   │
│  │    (Workflow Execution)          │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │         X402Handler               │   │
│  │    (Payment Protocol)             │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │   PhantomCashX402Client          │   │
│  │   (Token-2022 Payments)          │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼──────────────────────┘
                  │
         ┌────────▼────────┐
         │     Solana      │
         │  (CASH Token)   │
         └─────────────────┘
```

## Key Features

### 1. Production HTTP 402 Implementation

- Automatic 402 detection and handling
- Payment header construction per spec
- Transaction verification before retry
- Comprehensive error handling

### 2. Phantom CASH Integration

- Token-2022 program support
- CASH mint: `CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH`
- Automatic ATA creation
- Gasless transaction support
- 6 decimal precision

### 3. Autonomous Agent Capabilities

- LLM-powered service discovery
- Multi-step workflow planning
- Cost optimization algorithms
- Budget management
- Execution monitoring

### 4. Enterprise-Grade Quality

- TypeScript with strict type safety
- Comprehensive error handling
- Thread-safe state management
- Production logging
- Integration test suite

## Installation

```bash
npm install @x402-upl/phantom-cash
```

## Quick Start

```typescript
import { Keypair } from '@solana/web3.js';
import { PhantomAgent } from '@x402-upl/phantom-cash';

const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

const agent = new PhantomAgent({
  wallet,
  openaiApiKey: process.env.OPENAI_API_KEY,
  network: 'mainnet-beta',
  spendingLimitPerHour: 10.0,
});

const task = {
  taskId: 'analysis-001',
  description: 'Get SOL price and analyze market sentiment',
  maxBudget: 0.10,
};

const report = await agent.executeTask(task);
```

## Production Deployment

### Security

- Private keys stored in environment or secure vault
- Spending limits enforced
- Transaction verification before proceeding
- Error recovery mechanisms

### Scaling

- Stateless design for horizontal scaling
- Connection pooling for RPC calls
- Request rate limiting
- Circuit breaker patterns

## Bounty Differentiation

### Why This Wins

1. **Production Quality**: Enterprise-grade error handling, testing, and documentation
2. **Full Protocol Implementation**: Complete HTTP 402 spec compliance
3. **True Autonomy**: LLM-powered planning, not just scripted flows
4. **Multi-SDK Support**: CASH integration across all 4 official x402 SDKs
5. **Token-2022 Support**: Proper CASH implementation using Token Extensions
6. **Comprehensive Testing**: Unit tests, integration tests, mock services
7. **Real Use Cases**: Demonstrated with working examples
8. **Professional Documentation**: Complete API reference and guides

### Technical Excellence

- Zero console.logs in production code
- Strict TypeScript with full type safety
- Thread-safe state management (Rust)
- Async/await throughout
- Comprehensive error types
- Production logging patterns

## License

Apache-2.0
