# @x402-upl/core

Solana-compatible x402 payment middleware for Express and Fastify.

## Why This Package Exists

The official x402-express middleware only supports EVM chains (Ethereum, Base, etc.). This package provides x402 protocol implementation for Solana, enabling:

- Express middleware for Solana-based x402 services
- Fastify middleware for Solana-based x402 services
- On-chain transaction verification
- SPL token payment support (USDC, CASH)
- Compliant with x402 protocol specification

## Key Differences from x402-express

| Feature | x402-express | @x402-upl/core |
|---------|--------------|----------------|
| Chain | EVM (Ethereum, Base) | Solana |
| Signature Scheme | EIP-3009 | Ed25519 |
| Token Standard | ERC-20 | SPL Token |
| Verification | Smart contract | On-chain RPC |
| Facilitator | CDP Facilitator | Custom or PayAI |

## Installation

```bash
npm install @x402-upl/core
```

## Usage

### Express Middleware

```typescript
import express from 'express';
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';

const app = express();

const middleware = createX402Middleware({
  config: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    treasuryWallet: new PublicKey('YOUR_WALLET_ADDRESS'),
    acceptedTokens: [],
    timeout: 300000,
    redisUrl: 'redis://localhost:6379',
  },
  pricing: {
    '/api/weather': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
    '/api/sentiment': {
      pricePerCall: 0.002,
      currency: 'USDC',
    },
  },
  onPaymentVerified: async (receipt) => {
    console.log('Payment verified:', receipt);
  },
});

app.use('/api', middleware);

app.get('/api/weather', (req, res) => {
  res.json({ temperature: 72, condition: 'sunny' });
});
```

### Fastify Middleware

```typescript
import Fastify from 'fastify';
import { createX402FastifyPlugin } from '@x402-upl/core';

const fastify = Fastify();

await fastify.register(createX402FastifyPlugin, {
  config: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    treasuryWallet: new PublicKey('YOUR_WALLET_ADDRESS'),
    acceptedTokens: [],
    timeout: 300000,
  },
  pricing: {
    '/weather': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
  },
});
```

## How It Works

### 1. Client Makes Request (No Payment)

```
GET /api/weather
```

**Response**: 402 Payment Required
```json
{
  "scheme": "exact",
  "network": "solana-devnet",
  "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "payTo": "YOUR_WALLET_ADDRESS",
  "amount": "0.001",
  "timeout": 300000,
  "nonce": "abc123xyz"
}
```

### 2. Client Creates Payment

Client uses Solana to transfer tokens and signs transaction.

### 3. Client Retries with Payment Header

```
GET /api/weather
X-Payment: base64(JSON.stringify({
  network: "solana-devnet",
  asset: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  from: "CLIENT_WALLET",
  to: "YOUR_WALLET",
  amount: "0.001",
  signature: "TRANSACTION_SIGNATURE",
  timestamp: 1699999999,
  nonce: "abc123xyz"
}))
```

### 4. Middleware Verifies Payment

- Decodes X-Payment header
- Fetches transaction from Solana RPC
- Verifies signature is valid
- Verifies amount matches requirement
- Verifies recipient is correct
- Checks transaction is not replayed

### 5. Request Proceeds

If valid, middleware calls `next()` and request handler executes.

## API Reference

### createX402Middleware(options)

Creates Express middleware.

**Options**:
- `config`: X402Config - Network and wallet configuration
- `pricing`: ServicePricing | Record<string, ServicePricing> - Pricing per route
- `onPaymentVerified?`: (receipt) => Promise<void> - Callback on successful payment
- `onPaymentFailed?`: (reason) => Promise<void> - Callback on failed payment

### X402Config

```typescript
interface X402Config {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl: string;
  treasuryWallet: PublicKey;
  acceptedTokens: PublicKey[];
  timeout: number;
  redisUrl?: string;
}
```

### ServicePricing

```typescript
interface ServicePricing {
  pricePerCall: number;
  currency: 'USDC' | 'CASH' | 'SOL';
  minPrice?: number;
  maxPrice?: number;
}
```

## Compliance with x402 Protocol

This implementation follows the official x402 specification:

✅ Returns 402 status with PaymentRequirements
✅ Accepts X-Payment header with base64 JSON
✅ Verifies payments on-chain
✅ Prevents replay attacks with nonce tracking
✅ Supports timeout for payment windows
✅ Returns payment receipt in X-Payment-Response header

## Differences from Official x402

**Official x402 (EVM)**:
- Uses EIP-3009 transferWithAuthorization
- Verifies via smart contract call
- Supports ETH, USDC on Base/Ethereum

**This Package (Solana)**:
- Uses standard SPL token transfers
- Verifies via RPC transaction fetch
- Supports SOL, USDC, CASH on Solana

## Integration with x402 Ecosystem

Works with:
- x402 Bazaar discovery (register services)
- PayAI facilitator (Solana support)
- x402 client SDKs (with Solana wallet)

Does NOT work with:
- CDP Facilitator (EVM only)
- x402-express (EVM only)

## Security Considerations

- **Replay Protection**: Tracks processed signatures in-memory
- **Amount Verification**: Requires exact amount match
- **Recipient Verification**: Checks treasury wallet matches
- **Transaction Finality**: Waits for 'confirmed' commitment
- **Timeout Enforcement**: Rejects expired payment requests

## Production Deployment

For production use:

1. Use mainnet-beta network
2. Configure Redis for persistent signature tracking
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```
3. Set redisUrl in X402Config
   ```typescript
   const config: X402Config = {
     network: 'mainnet-beta',
     rpcUrl: process.env.SOLANA_RPC_URL,
     treasuryWallet: new PublicKey(process.env.TREASURY_WALLET),
     acceptedTokens: [],
     timeout: 300000,
     redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
   };
   ```
4. Configure facilitator for settlement
5. Monitor failed payments
6. Set up alerts for verification errors
7. Use dedicated RPC endpoint (not public)

## License

MIT
