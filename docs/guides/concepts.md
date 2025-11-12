# Core Concepts

This guide provides an in-depth exploration of the core concepts powering the X402 Universal Payment Layer (X402-UPL).

## Table of Contents

1. [HTTP 402 Payment Required Protocol](#http-402-payment-required-protocol)
2. [Solana Blockchain Integration](#solana-blockchain-integration)
3. [SPL Token Payments](#spl-token-payments)
4. [Payment Verification Flow](#payment-verification-flow)
5. [Nonce and Replay Protection](#nonce-and-replay-protection)
6. [TAP Authentication (RFC 9421)](#tap-authentication-rfc-9421)
7. [Service Discovery and Reputation](#service-discovery-and-reputation)
8. [Escrow and Settlements](#escrow-and-settlements)
9. [Multi-Hop Routing](#multi-hop-routing)
10. [Agent Identity and DID](#agent-identity-and-did)

---

## HTTP 402 Payment Required Protocol

### Overview

The HTTP 402 status code was originally reserved for "Payment Required" in the HTTP specification but remained unimplemented for decades. X402-UPL brings this status code to life with a production-ready implementation for micropayments between AI agents and services.

### Protocol Flow

The x402 protocol enables pay-per-call API access through a simple handshake:

```
┌─────────────┐                                ┌──────────────┐
│   Client    │                                │   Service    │
└──────┬──────┘                                └──────┬───────┘
       │                                              │
       │  1. HTTP Request (No Payment)                │
       ├─────────────────────────────────────────────>│
       │                                              │
       │  2. 402 Payment Required + Requirements      │
       │<─────────────────────────────────────────────┤
       │                                              │
       │  3. Create & Sign Solana Transaction         │
       │     (Transfer tokens on-chain)               │
       │                                              │
       │  4. HTTP Request + X-Payment Header          │
       ├─────────────────────────────────────────────>│
       │                                              │
       │     5. Verify Payment On-Chain               │
       │        - Check signature validity            │
       │        - Verify amount & recipient           │
       │        - Check replay attack                 │
       │                                              │
       │  6. 200 OK + Response Data                   │
       │<─────────────────────────────────────────────┤
       │                                              │
```

### Step-by-Step Breakdown

#### Step 1: Initial Request

Client makes a standard HTTP request without payment:

```http
GET /api/analyze HTTP/1.1
Host: service.example.com
Content-Type: application/json

{
  "text": "Analyze this sentiment"
}
```

#### Step 2: Payment Requirements Response

Service responds with 402 and payment requirements:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "scheme": "exact",
  "network": "solana-devnet",
  "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "payTo": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": "0.001",
  "timeout": 300000,
  "nonce": "a1b2c3d4e5f6"
}
```

**Payment Requirements Fields:**

- `scheme`: Payment model (`exact`, `max`, `range`)
- `network`: Blockchain network identifier
- `asset`: Token mint address (or "SOL" for native SOL)
- `payTo`: Service wallet address
- `amount`: Required payment amount
- `timeout`: Payment window in milliseconds
- `nonce`: Unique identifier for replay protection

#### Step 3: Client Creates Payment

Client constructs and submits a Solana transaction:

```typescript
import { Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';

// For SOL payment
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: clientWallet.publicKey,
    toPubkey: new PublicKey(requirements.payTo),
    lamports: parseFloat(requirements.amount) * 1_000_000_000,
  })
);

const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [clientWallet]
);
```

#### Step 4: Retry Request with Payment Proof

Client retries the request with payment proof:

```http
GET /api/analyze HTTP/1.1
Host: service.example.com
Content-Type: application/json
X-Payment: eyJuZXR3b3JrIjoic29sYW5hLWRldm5ldCIsImFzc2V0IjoiU09MIiwiZnJvbSI6IkNsaWVudFdhbGxldCIsInRvIjoiU2VydmljZVdhbGxldCIsImFtb3VudCI6IjAuMDAxIiwic2lnbmF0dXJlIjoiNHVaWDJGNVRHSC4uLiIsInRpbWVzdGFtcCI6MTcwMDAwMDAwMCwibm9uY2UiOiJhMWIyYzNkNGU1ZjYifQ==

{
  "text": "Analyze this sentiment"
}
```

The `X-Payment` header contains base64-encoded JSON:

```json
{
  "network": "solana-devnet",
  "asset": "SOL",
  "from": "ClientWallet...",
  "to": "ServiceWallet...",
  "amount": "0.001",
  "signature": "4uZX2F5TGH...transaction-signature",
  "timestamp": 1700000000,
  "nonce": "a1b2c3d4e5f6"
}
```

#### Step 5: Service Verifies Payment

Service middleware verifies the payment on-chain:

```typescript
// Fetch transaction from Solana
const tx = await connection.getTransaction(payment.signature, {
  commitment: 'confirmed',
});

// Verify transaction exists
if (!tx || !tx.meta) {
  throw new Error('Transaction not found');
}

// Verify recipient
const recipientIndex = tx.transaction.message.accountKeys.findIndex(
  key => key.equals(servicePubkey)
);

// Verify amount
const lamportsReceived = tx.meta.postBalances[recipientIndex] -
                         tx.meta.preBalances[recipientIndex];
const solReceived = lamportsReceived / 1_000_000_000;

// Check amount matches
if (Math.abs(solReceived - expectedAmount) > 0.000001) {
  throw new Error('Payment amount mismatch');
}

// Check replay attack
if (await redis.exists(`sig:${payment.signature}`)) {
  throw new Error('Transaction already used');
}

// Store signature to prevent replay
await redis.setex(`sig:${payment.signature}`, 3600, '1');
```

#### Step 6: Service Responds

If payment is valid, service processes the request and responds:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "sentiment": "positive",
  "confidence": 0.92,
  "analysis": "The text conveys optimistic sentiment..."
}
```

### Implementation Example (Express)

```typescript
// C:\Users\User\x402-upl\packages\X042 Core\src\express-middleware.ts
import express from 'express';
import { createX402Middleware } from '@x402-upl/core';
import { PublicKey } from '@solana/web3.js';

const app = express();

// Apply x402 middleware to protected routes
app.use('/api', createX402Middleware({
  config: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    treasuryWallet: new PublicKey(process.env.WALLET_ADDRESS!),
    acceptedTokens: [],
    timeout: 300000,
    redisUrl: 'redis://localhost:6379',
  },
  pricing: {
    '/api/analyze': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
    '/api/summarize': {
      pricePerCall: 0.002,
      currency: 'USDC',
    },
  },
  onPaymentVerified: async (receipt) => {
    console.log('Payment verified:', receipt);
    // Track revenue, update analytics, etc.
  },
}));

app.post('/api/analyze', (req, res) => {
  // This only executes if payment is verified
  res.json({ sentiment: 'positive', confidence: 0.92 });
});
```

---

## Solana Blockchain Integration

### Why Solana?

X402-UPL uses Solana for several key advantages:

1. **High Throughput**: 50,000+ TPS for instant payment confirmation
2. **Low Fees**: ~$0.00025 per transaction (vs $1-50 on Ethereum)
3. **Fast Finality**: ~400ms block time, confirmed in 1-2 seconds
4. **Native Micropayments**: Cost-effective for sub-cent payments
5. **SPL Token Ecosystem**: Rich token standard (SPL Token, Token-2022)

### Network Selection

X402-UPL supports three Solana networks:

```typescript
type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';
```

**Development**: Use `devnet`
```typescript
const config = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
};
```

**Production**: Use `mainnet-beta` with dedicated RPC
```typescript
const config = {
  network: 'mainnet-beta',
  rpcUrl: process.env.HELIUS_RPC_URL, // Or QuickNode, Triton, etc.
};
```

### RPC Endpoint Considerations

**Public RPC Endpoints** (Free):
- Rate limited
- Shared infrastructure
- Variable latency
- Not recommended for production

**Dedicated RPC Providers** (Recommended):
- [Helius](https://helius.xyz): Premium RPC with enhanced APIs
- [QuickNode](https://quicknode.com): Low-latency global infrastructure
- [Triton One](https://triton.one): High-performance RPC
- [GenesysGo](https://genesysgo.com): Enterprise-grade infrastructure

### Transaction Confirmation Levels

Solana provides multiple commitment levels:

```typescript
type Commitment = 'processed' | 'confirmed' | 'finalized';
```

**X402-UPL uses `confirmed` by default** for optimal balance:

| Commitment | Finality | Speed | Recommended For |
|------------|----------|-------|-----------------|
| processed | Lowest (not voted) | ~400ms | Not recommended |
| confirmed | Medium (supermajority) | ~1s | **X402 payments** |
| finalized | Highest (32 blocks) | ~13s | High-value transfers |

Example:

```typescript
const connection = new Connection(rpcUrl, 'confirmed');

const tx = await connection.getTransaction(signature, {
  commitment: 'confirmed',
});
```

### Account Model

Solana uses an account-based model (vs UTXO):

```typescript
interface Account {
  publicKey: PublicKey;
  lamports: number;        // Balance in lamports (1 SOL = 1B lamports)
  owner: PublicKey;        // Program that owns this account
  executable: boolean;     // Is this a program?
  rentEpoch: number;       // Rent tracking
  data: Buffer;            // Account data
}
```

**System Account** (SOL balance):
- Owner: System Program (11111111111111111111111111111111)
- Data: Empty
- Holds SOL balance

**Token Account** (SPL token balance):
- Owner: Token Program
- Data: Token account state (mint, amount, authority)
- Holds specific token balance

### Transaction Structure

```typescript
import { Transaction, SystemProgram } from '@solana/web3.js';

const transaction = new Transaction();

// Add instructions
transaction.add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient.publicKey,
    lamports: 1_000_000, // 0.001 SOL
  })
);

// Set recent blockhash (required)
transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
transaction.feePayer = sender.publicKey;

// Sign and send
transaction.sign(sender);
const signature = await connection.sendRawTransaction(transaction.serialize());
await connection.confirmTransaction(signature, 'confirmed');
```

### Program Derived Addresses (PDAs)

X402-UPL smart contracts use PDAs for deterministic addresses:

```typescript
// Find PDA for agent account
const [agentPDA, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('agent'),
    wallet.publicKey.toBuffer(),
  ],
  programId
);
```

PDAs enable:
- Deterministic account addresses
- Program-controlled accounts (no private key)
- Cross-program invocation (CPI)

**Example from C:\Users\User\x402-upl\packages\contracts\programs\x402-registry\src\lib.rs:**

```rust
#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Agent::SIZE,
        seeds = [b"agent", authority.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

---

## SPL Token Payments

### Token Standards

X402-UPL supports two SPL token programs:

1. **Token Program** (Original SPL Token)
   - Program ID: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
   - Used for: USDC, most SPL tokens

2. **Token-2022 Program** (Token Extensions)
   - Program ID: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
   - Used for: CASH token
   - Features: Transfer fees, confidential transfers, metadata

### Supported Tokens

| Token | Symbol | Mint Address | Decimals | Program |
|-------|--------|--------------|----------|---------|
| USDC | USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 6 | Token |
| CASH | CASH | CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH | 6 | Token-2022 |
| SOL | SOL | Native | 9 | System |

### Token Account Model

SPL tokens use Associated Token Accounts (ATA):

```typescript
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Get or create ATA for wallet
const tokenAccount = await getAssociatedTokenAddress(
  tokenMint,        // USDC mint
  wallet.publicKey, // Owner wallet
  false,            // allowOwnerOffCurve
  TOKEN_PROGRAM_ID
);
```

**ATA Derivation** (deterministic):
```
ATA = findProgramAddress([
  wallet.publicKey,
  TOKEN_PROGRAM_ID,
  tokenMint
], ASSOCIATED_TOKEN_PROGRAM_ID)
```

### SPL Token Transfer

```typescript
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

// Get token accounts
const senderTokenAccount = await getAssociatedTokenAddress(
  usdcMint,
  sender.publicKey
);

const recipientTokenAccount = await getAssociatedTokenAddress(
  usdcMint,
  recipient.publicKey
);

// Create transfer instruction
const transaction = new Transaction().add(
  createTransferInstruction(
    senderTokenAccount,
    recipientTokenAccount,
    sender.publicKey,
    1000, // Amount in base units (1000 = 0.001 USDC with 6 decimals)
    [],
    TOKEN_PROGRAM_ID
  )
);
```

### CASH Token (Token-2022)

CASH uses the Token-2022 program with enhanced features:

```typescript
// C:\Users\User\x402-upl\packages\sdk\javascript\src\solana-x402-client.ts
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

export const CASH_MINT = new PublicKey(
  'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH'
);

// Detect program based on mint
const isCASH = assetPubkey.equals(CASH_MINT);
const programId = isCASH ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

// Get token account with correct program
const senderTokenAccount = await getAssociatedTokenAddress(
  assetPubkey,
  this.config.wallet.publicKey,
  false,
  programId
);
```

### Creating Token Accounts

If recipient doesn't have a token account, create it first:

```typescript
import { createAssociatedTokenAccountInstruction } from '@solana/spl-token';

const transaction = new Transaction();

// Check if account exists
try {
  await getAccount(connection, recipientTokenAccount, 'confirmed', programId);
} catch (error) {
  // Account doesn't exist, create it
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,           // Fee payer
      recipientTokenAccount,     // Account to create
      recipient.publicKey,       // Owner
      tokenMint,                 // Token mint
      programId                  // Token program
    )
  );
}

// Add transfer instruction
transaction.add(
  createTransferInstruction(
    senderTokenAccount,
    recipientTokenAccount,
    sender.publicKey,
    amount,
    [],
    programId
  )
);
```

### Decimal Handling

SPL tokens use base units (smallest unit):

```typescript
// Convert human-readable to base units
function toBaseUnits(amount: number, decimals: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

// Convert base units to human-readable
function fromBaseUnits(baseUnits: bigint, decimals: number): number {
  return Number(baseUnits) / Math.pow(10, decimals);
}

// Example: 0.001 USDC (6 decimals) = 1000 base units
const usdcAmount = toBaseUnits(0.001, 6); // 1000n
```

### Token Preferences

Clients can specify preferred tokens:

```typescript
const client = new X402Client({
  network: 'devnet',
  wallet: keypair,
  preferredTokens: ['CASH', 'USDC', 'SOL'], // Priority order
});
```

Service discovery filters by accepted tokens:

```typescript
const services = await client.discover({
  category: 'AI & ML',
  acceptedTokens: ['CASH', 'USDC'],
});
```

---

## Payment Verification Flow

### Overview

Payment verification is the critical security component that prevents fraud and ensures service providers receive payment before delivering services.

### Verification Steps

1. **Decode Payment Header**
2. **Fetch Transaction from Blockchain**
3. **Verify Transaction Validity**
4. **Verify Payment Amount**
5. **Verify Recipient Address**
6. **Check Replay Attack**
7. **Store Signature**
8. **Allow Request**

### Implementation (Facilitator API)

**File**: `C:\Users\User\x402-upl\packages\facilitator\src\routes\payments.ts`

```typescript
fastify.post('/verify', async (request, reply) => {
  const { signature, expectedAmount, recipient } = request.body;

  // Step 1: Validate inputs
  if (!signature || !expectedAmount || !recipient) {
    return reply.status(400).send({
      error: 'Missing required fields'
    });
  }

  try {
    // Step 2: Fetch transaction from Solana
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!tx || !tx.meta) {
      return reply.status(404).send({
        verified: false,
        error: 'Transaction not found'
      });
    }

    // Step 3: Find recipient in transaction
    const recipientPubkey = new PublicKey(recipient);
    const recipientIndex = tx.transaction.message.accountKeys.findIndex(
      key => key.equals(recipientPubkey)
    );

    if (recipientIndex === -1) {
      return reply.send({
        verified: false,
        error: 'Recipient not found in transaction'
      });
    }

    // Step 4: Verify amount
    const lamportsReceived = tx.meta.postBalances[recipientIndex] -
                             tx.meta.preBalances[recipientIndex];
    const solReceived = lamportsReceived / 1_000_000_000;
    const expected = parseFloat(expectedAmount);

    const verified = Math.abs(solReceived - expected) < 0.000001;

    // Step 5: Track metrics
    await fastify.redis.incr('payments:verified:total');
    if (verified) {
      await fastify.redis.incr('payments:verified:success');
    }

    return reply.send({
      verified,
      amount: solReceived,
      expected,
      signature,
      timestamp: new Date(tx.blockTime! * 1000).toISOString()
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      verified: false,
      error: error.message
    });
  }
});
```

### Transaction Parsing

Understanding Solana transaction structure:

```typescript
interface Transaction {
  signatures: string[];                    // Transaction signatures
  message: {
    accountKeys: PublicKey[];              // All accounts involved
    recentBlockhash: string;               // Recent blockhash
    instructions: CompiledInstruction[];   // Instructions executed
  };
}

interface TransactionMeta {
  err: any;                                // Error if failed
  fee: number;                             // Transaction fee
  preBalances: number[];                   // Balances before
  postBalances: number[];                  // Balances after
  preTokenBalances: TokenBalance[];        // Token balances before
  postTokenBalances: TokenBalance[];       // Token balances after
  logMessages: string[];                   // Program logs
}
```

### SOL Transfer Verification

```typescript
function verifySolTransfer(
  tx: Transaction,
  expectedRecipient: PublicKey,
  expectedAmount: number
): boolean {
  const recipientIndex = tx.transaction.message.accountKeys.findIndex(
    key => key.equals(expectedRecipient)
  );

  if (recipientIndex === -1) {
    return false;
  }

  const lamportsReceived =
    tx.meta.postBalances[recipientIndex] -
    tx.meta.preBalances[recipientIndex];

  const solReceived = lamportsReceived / 1_000_000_000;

  // Allow small rounding differences
  return Math.abs(solReceived - expectedAmount) < 0.000001;
}
```

### SPL Token Transfer Verification

```typescript
function verifySplTransfer(
  tx: Transaction,
  expectedRecipient: PublicKey,
  expectedAmount: number,
  tokenMint: PublicKey
): boolean {
  const { preTokenBalances, postTokenBalances } = tx.meta;

  // Find recipient's token account changes
  const recipientTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    expectedRecipient
  );

  const preBal = preTokenBalances.find(
    b => b.owner === expectedRecipient.toBase58()
  );
  const postBal = postTokenBalances.find(
    b => b.owner === expectedRecipient.toBase58()
  );

  if (!preBal || !postBal) {
    return false;
  }

  const received = postBal.uiTokenAmount.uiAmount -
                   preBal.uiTokenAmount.uiAmount;

  return Math.abs(received - expectedAmount) < 0.000001;
}
```

### Verification Timing

**Critical**: Verify AFTER transaction is confirmed on-chain:

```typescript
// ❌ WRONG: Don't trust client claim
app.post('/api/service', (req, res) => {
  const { signature } = req.headers['x-payment'];
  // Immediate response without verification - INSECURE!
  res.json({ result: 'data' });
});

// ✅ CORRECT: Verify on-chain first
app.post('/api/service', async (req, res) => {
  const { signature } = req.headers['x-payment'];

  const tx = await connection.getTransaction(signature);
  if (!verifyPayment(tx, expectedAmount, serviceWallet)) {
    return res.status(402).send({ error: 'Invalid payment' });
  }

  // Only proceed after verification
  res.json({ result: 'data' });
});
```

---

## Nonce and Replay Protection

### The Replay Attack Problem

Without replay protection, a client could:

1. Make a payment once
2. Capture the transaction signature
3. Reuse that signature for unlimited API calls

This would allow unlimited access for a single payment.

### Nonce-Based Protection

X402-UPL uses two-layer replay protection:

**Layer 1: Nonce in Requirements**
```json
{
  "nonce": "a1b2c3d4e5f6",
  "amount": "0.001",
  "timeout": 300000
}
```

**Layer 2: Signature Tracking in Redis**

### Implementation

**File**: `C:\Users\User\x402-upl\packages\facilitator\src\cache\redis.ts`

```typescript
import { Redis } from 'ioredis';

export class SignatureStore {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async hasSignature(signature: string): Promise<boolean> {
    const exists = await this.redis.exists(`sig:${signature}`);
    return exists === 1;
  }

  async storeSignature(
    signature: string,
    ttl: number = 3600
  ): Promise<void> {
    await this.redis.setex(`sig:${signature}`, ttl, '1');
  }

  async getSignatureTimestamp(signature: string): Promise<number | null> {
    const timestamp = await this.redis.get(`sig:${signature}:ts`);
    return timestamp ? parseInt(timestamp) : null;
  }
}
```

### Middleware Integration

```typescript
// Check replay before verification
const signatureStore = new SignatureStore(process.env.REDIS_URL);

app.use('/api', async (req, res, next) => {
  const paymentHeader = req.headers['x-payment'];
  if (!paymentHeader) {
    return res.status(402).send(paymentRequirements);
  }

  const payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());

  // Check if signature was already used
  if (await signatureStore.hasSignature(payment.signature)) {
    return res.status(403).send({
      error: 'Transaction already used (replay attack detected)'
    });
  }

  // Verify payment on-chain
  const verified = await verifyPayment(payment);
  if (!verified) {
    return res.status(402).send({ error: 'Payment verification failed' });
  }

  // Store signature to prevent replay
  await signatureStore.storeSignature(payment.signature, 3600);

  next();
});
```

### TTL Considerations

**Signature TTL** should match **timeout** in requirements:

```typescript
const paymentRequirements = {
  timeout: 300000, // 5 minutes
  nonce: generateNonce(),
};

// Store with same TTL
await signatureStore.storeSignature(
  signature,
  300 // 5 minutes in seconds
);
```

After TTL expires:
- Signature is removed from Redis
- Could theoretically be reused
- But transaction is too old to be valid anyway

### Nonce Generation

```typescript
import crypto from 'crypto';

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Example: "a1b2c3d4e5f6789012345678abcdef12"
```

### Production Redis Setup

**Development**: Local Redis
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Production**: Managed Redis (Upstash)
```typescript
const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  tls: {
    rejectUnauthorized: false
  }
});
```

**Environment Variable**:
```bash
REDIS_URL=rediss://default:password@redis.upstash.io:6379
```

### Memory vs Persistent Storage

**In-Memory (Map)**: Not recommended
- Lost on restart
- Not shared across instances
- Vulnerable to replay after restart

**Redis**: Recommended
- Persistent across restarts
- Shared across multiple service instances
- Built-in TTL expiration
- High performance (microsecond latency)

---

## TAP Authentication (RFC 9421)

### Overview

TAP (Trusted Agent Protocol) implements RFC 9421 HTTP Message Signatures for cryptographic agent authentication. This enables:

- Verifiable agent identity (DID-based)
- Message integrity (tamper-proof requests)
- Non-repudiation (cryptographic proof of authorship)
- Replay protection (nonce + timestamp)

### RFC 9421 Signature Structure

**Signature-Input Header**:
```
Signature-Input: sig2=("@authority" "@path"); created=1700000000;
                 expires=1700000300; keyid="agent-key-123";
                 alg="ed25519"; nonce="abc123"; tag="agent-payer-auth"
```

**Signature Header**:
```
Signature: sig2=:K2qGT5srn2OGbOIDzQ6kYT+ruaycnDAAUpKv+ePFfD0RAxn/1BUe...:
```

### Signature Base

The signature is computed over a "signature base":

```
"@authority": api.example.com
"@path": /service
"@signature-params": ("@authority" "@path"); created=1700000000; expires=1700000300; keyid="agent-key-123"; alg="ed25519"; nonce="abc123"; tag="agent-payer-auth"
```

### Implementation

**File**: `C:\Users\User\x402-upl\packages\sdk\javascript\src\tap\rfc9421.ts`

```typescript
import * as ed25519 from '@noble/ed25519';
import * as crypto from 'crypto';

export type SignatureAlgorithm = 'ed25519' | 'rsa-pss-sha256';

export interface SignatureParams {
  created: number;
  expires: number;
  keyId: string;
  alg: SignatureAlgorithm;
  nonce: string;
  tag: 'agent-browser-auth' | 'agent-payer-auth';
}

export interface SignatureComponents {
  authority: string;
  path: string;
}

export class RFC9421Signature {
  static createSignatureBase(
    components: SignatureComponents,
    params: SignatureParams
  ): string {
    const lines: string[] = [];

    lines.push(`"@authority": ${components.authority}`);
    lines.push(`"@path": ${components.path}`);

    const signatureParamsValue =
      `("@authority" "@path"); ` +
      `created=${params.created}; ` +
      `expires=${params.expires}; ` +
      `keyid="${params.keyId}"; ` +
      `alg="${params.alg}"; ` +
      `nonce="${params.nonce}"; ` +
      `tag="${params.tag}"`;

    lines.push(`"@signature-params": ${signatureParamsValue}`);

    return lines.join('\n');
  }

  static async signEd25519(
    components: SignatureComponents,
    params: SignatureParams,
    privateKey: Uint8Array
  ): Promise<SignatureResult> {
    if (privateKey.length !== 32) {
      throw new Error('Ed25519 private key must be 32 bytes');
    }

    const signatureBase = this.createSignatureBase(components, params);
    const message = new TextEncoder().encode(signatureBase);

    const signature = await ed25519.sign(message, privateKey);
    const signatureB64 = Buffer.from(signature).toString('base64');

    const signatureInput =
      `sig2=("@authority" "@path"); ` +
      `created=${params.created}; ` +
      `expires=${params.expires}; ` +
      `keyid="${params.keyId}"; ` +
      `alg="${params.alg}"; ` +
      `nonce="${params.nonce}"; ` +
      `tag="${params.tag}"`;

    return {
      signatureInput,
      signature: `sig2=:${signatureB64}:`,
    };
  }

  static generateNonce(): string {
    const bytes = crypto.randomBytes(16);
    return bytes.toString('hex');
  }

  static generateEd25519KeyPair(): {
    privateKey: Uint8Array;
    publicKey: Uint8Array
  } {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }
}
```

### TAP Client

**File**: `C:\Users\User\x402-upl\packages\sdk\javascript\src\tap\tap-client.ts`

```typescript
import { RFC9421Signature, SignatureAlgorithm } from './rfc9421.js';

export interface TAPConfig {
  keyId: string;
  privateKey: Uint8Array | string;
  algorithm: SignatureAlgorithm;
  registryUrl: string;
}

export interface AgentIdentity {
  did: string;
  visaTapCert: string;
  walletAddress: string;
  reputationScore?: number;
}

export class TAPClient {
  private config: TAPConfig;
  private identity?: AgentIdentity;

  constructor(config: TAPConfig, identity?: AgentIdentity) {
    this.config = config;
    this.identity = identity;
  }

  async signRequest(url: string, method: string = 'POST'): Promise<Headers> {
    const urlObj = new URL(url);

    const components = {
      authority: urlObj.host,
      path: urlObj.pathname,
    };

    const params = {
      created: Math.floor(Date.now() / 1000),
      expires: Math.floor(Date.now() / 1000) + 300, // 5 min expiry
      keyId: this.config.keyId,
      alg: this.config.algorithm,
      nonce: RFC9421Signature.generateNonce(),
      tag: 'agent-payer-auth' as const,
    };

    const privateKey = typeof this.config.privateKey === 'string'
      ? Buffer.from(this.config.privateKey, 'hex')
      : this.config.privateKey;

    const result = await RFC9421Signature.signEd25519(
      components,
      params,
      privateKey
    );

    const headers = new Headers();
    headers.set('Signature-Input', result.signatureInput);
    headers.set('Signature', result.signature);

    if (this.identity) {
      headers.set('X-Agent-DID', this.identity.did);
      headers.set('X-Agent-Cert', this.identity.visaTapCert);
    }

    return headers;
  }

  async registerAgent(
    walletAddress: string,
    stake?: number
  ): Promise<AgentIdentity> {
    const url = `${this.config.registryUrl}/api/agents/register`;
    const headers = await this.signRequest(url, 'POST');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...Object.fromEntries(headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        did: `did:x402:${walletAddress.substring(0, 8)}`,
        visaTapCert: `cert_${walletAddress.substring(0, 8)}`,
        stake: stake || 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Agent registration failed: ${response.statusText}`);
    }

    this.identity = await response.json();
    return this.identity;
  }

  getAgentIdentity(): AgentIdentity | undefined {
    return this.identity;
  }
}
```

### Usage Example

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
});

// Register as agent
const agentIdentity = await client.registerAgent(1.0);
console.log('Agent DID:', agentIdentity.did);

// Make authenticated request
const services = await client.discover({ category: 'AI & ML' });
```

### Signature Verification (Server-Side)

```typescript
import { verifySignature } from '@noble/ed25519';

async function verifyTAPSignature(
  request: Request,
  publicKey: Uint8Array
): Promise<boolean> {
  const signatureInput = request.headers.get('Signature-Input');
  const signature = request.headers.get('Signature');

  if (!signatureInput || !signature) {
    return false;
  }

  // Parse signature input
  const params = parseSignatureInput(signatureInput);

  // Check expiry
  if (params.expires < Math.floor(Date.now() / 1000)) {
    return false;
  }

  // Reconstruct signature base
  const components = {
    authority: request.headers.get('host'),
    path: new URL(request.url).pathname,
  };

  const signatureBase = RFC9421Signature.createSignatureBase(
    components,
    params
  );

  // Verify signature
  const signatureBytes = Buffer.from(
    signature.match(/:(.+):/)[1],
    'base64'
  );

  return await verifySignature(
    signatureBytes,
    new TextEncoder().encode(signatureBase),
    publicKey
  );
}
```

---

## Service Discovery and Reputation

### Service Registry

The X402-UPL registry enables agents to discover services based on:

- Category (AI & ML, Data Analytics, etc.)
- Price range
- Reputation score
- Accepted tokens
- Uptime percentage
- Average response time

### Service Registration

**API Endpoint**: `POST /api/services`

```typescript
await client.registerService({
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
```

### Service Discovery

**API Endpoint**: `GET /api/services/search`

```typescript
const services = await client.discover({
  category: 'AI & ML',
  maxPrice: 0.01,
  minReputation: 8000,
  acceptedTokens: ['CASH'],
  sortBy: 'value', // price, reputation, value, recent
  limit: 10,
});

for (const service of services) {
  console.log(`${service.name}`);
  console.log(`  Price: ${service.pricePerCall} ${service.acceptedTokens[0]}`);
  console.log(`  Reputation: ${service.reputationScore}/10000`);
  console.log(`  Uptime: ${service.metrics.uptime}%`);
  console.log(`  Success Rate: ${service.metrics.successRate}%`);
}
```

### Reputation System

Reputation score (0-10000) based on:

```typescript
// C:\Users\User\x402-upl\packages\facilitator\src\routes\services.ts
function calculateReputation(service: Service): number {
  let score = 5000; // Base score

  // Transaction success
  const successfulCalls = service.transactions.filter(
    tx => tx.status === 'confirmed'
  ).length;
  score += successfulCalls * 10;

  // Failed transactions penalty
  const failedCalls = service.transactions.filter(
    tx => tx.status === 'failed'
  ).length;
  score -= failedCalls * 50;

  // Success rate bonus/penalty
  const successRate = successfulCalls / service.transactions.length;
  if (successRate < 0.9 && service.transactions.length > 10) {
    score -= (0.9 - successRate) * 1000;
  }

  // User ratings
  const avgRating = service.ratings.reduce((a, b) => a + b, 0) /
                    service.ratings.length;
  score += (avgRating - 3) * 500; // 5-star = +1000, 1-star = -1000

  // Uptime bonus
  if (service.uptime > 99) {
    score += 500;
  }

  // Clamp to 0-10000
  return Math.max(0, Math.min(10000, Math.floor(score)));
}
```

### Service Ratings

```typescript
await client.getTAPClient().rateService(serviceId, {
  rating: 5,
  comment: 'Excellent service, fast and accurate',
  agentId: client.getWallet().publicKey.toBase58(),
});
```

### Trending Services

**API Endpoint**: `GET /api/services/trending`

Based on last 7 days activity:

```typescript
const trending = await fetch(`${registryUrl}/api/services/trending`);
const { services } = await trending.json();

// Sorted by: (call_count * 0.7 + revenue * 0.3)
```

---

## Escrow and Settlements

### Escrow Workflow

Escrow enables safe agent-to-agent transactions:

```
┌─────────┐                 ┌─────────┐                 ┌─────────┐
│  Buyer  │                 │ Escrow  │                 │ Seller  │
└────┬────┘                 └────┬────┘                 └────┬────┘
     │                           │                           │
     │  1. Create Escrow         │                           │
     ├──────────────────────────>│                           │
     │                           │                           │
     │  2. Fund Escrow           │                           │
     ├──────────────────────────>│                           │
     │     (SOL/USDC/CASH)       │                           │
     │                           │                           │
     │                           │  3. Notify Seller         │
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │  4. Deliver Service       │
     │<──────────────────────────┼───────────────────────────┤
     │                           │                           │
     │  5. Confirm Receipt       │                           │
     ├──────────────────────────>│                           │
     │                           │                           │
     │                           │  6. Release Payment       │
     │                           ├──────────────────────────>│
     │                           │                           │
```

### Create Escrow

**API Endpoint**: `POST /escrow/create`

```typescript
const escrow = await fetch('https://facilitator.x402.network/escrow/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    buyer: buyerWallet.toBase58(),
    seller: sellerWallet.toBase58(),
    amount: '1.0',
    asset: 'USDC',
    condition: 'data-delivery',
  }),
});

const { id, status } = await escrow.json();
// { id: 'escrow_1234567890_abc123', status: 'pending' }
```

### Fund Escrow

**API Endpoint**: `POST /escrow/:escrowId/fund`

```typescript
// 1. Create Solana transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: buyer.publicKey,
    toPubkey: escrowWallet, // Facilitator escrow wallet
    lamports: 1_000_000_000, // 1 SOL
  })
);

// 2. Send transaction
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [buyer]
);

// 3. Submit signature to escrow
await fetch(`https://facilitator.x402.network/escrow/${escrowId}/fund`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ signature }),
});
```

### Release Escrow

**API Endpoint**: `POST /escrow/:escrowId/release`

```typescript
// Buyer confirms receipt
await fetch(`https://facilitator.x402.network/escrow/${escrowId}/release`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${buyerApiKey}`,
  },
});

// Facilitator transfers funds to seller
```

### Refund Escrow

**API Endpoint**: `POST /escrow/:escrowId/refund`

```typescript
await fetch(`https://facilitator.x402.network/escrow/${escrowId}/refund`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Service not delivered',
  }),
});
```

### Settlement Process

Merchants withdraw accumulated earnings:

**File**: `C:\Users\User\x402-upl\packages\facilitator\src\routes\settlement.ts`

```typescript
// 1. Merchant requests settlement
POST /api/settlement/request
{
  "merchantWallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "serviceId": "service_123",
  "settlementType": "manual"
}

// 2. Facilitator calculates amount
const totalAmount = unsettledTransactions.reduce(
  (sum, tx) => sum + parseFloat(tx.amount),
  0
);

const platformFeeRate = 0.02; // 2%
const platformFee = totalAmount * platformFeeRate;
const merchantAmount = totalAmount - platformFee;

// 3. Create settlement record
const settlement = await prisma.settlement.create({
  data: {
    merchantWallet,
    serviceId,
    totalAmount: totalAmount.toString(),
    platformFee: platformFee.toString(),
    merchantAmount: merchantAmount.toString(),
    status: 'pending',
  },
});

// 4. Execute transfer (from treasury to merchant)
const transaction = new Transaction().add(
  createTransferInstruction(
    treasuryTokenAccount,
    merchantTokenAccount,
    treasuryKeypair.publicKey,
    Math.floor(merchantAmount * 1_000_000), // USDC base units
    [],
    TOKEN_PROGRAM_ID
  )
);

const signature = await connection.sendTransaction(
  transaction,
  [treasuryKeypair]
);

// 5. Update settlement
await prisma.settlement.update({
  where: { id: settlement.id },
  data: {
    status: 'completed',
    transactionSignature: signature,
  },
});
```

### Platform Fees

Default: **2% platform fee**

```typescript
const PLATFORM_FEE_RATE = parseFloat(
  process.env.PLATFORM_FEE_RATE || '0.02'
);

// Example: $100 in revenue
// Platform fee: $2
// Merchant receives: $98
```

### Settlement Schedule

**Manual**: Merchant triggers settlement
**Scheduled**: Daily/weekly automatic settlement
**Automatic**: Settlement after threshold (e.g., $100)

---

## Multi-Hop Routing

### Overview

Multi-hop routing enables payment paths through intermediary services:

```
Client → Service A → Service B → Service C
  |         |          |           |
  Pay     Forward   Forward    Deliver
```

Use cases:
- AI agent chains (analysis → summarization → translation)
- Data pipelines (fetch → process → store)
- Service composition (auth → compute → delivery)

### Create Multi-Hop Route

**API Endpoint**: `POST /routes/create`

```typescript
const route = await fetch('https://facilitator.x402.network/routes/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceService: 'client-wallet',
    targetService: 'service-c',
    amount: '0.01',
    asset: 'USDC',
    hops: ['service-a', 'service-b'],
  }),
});

const { id, hops } = await route.json();
// {
//   id: 'route_1234567890_abc',
//   hops: ['service-a', 'service-b'],
//   status: 'pending'
// }
```

### Execute Route

**API Endpoint**: `POST /routes/:routeId/execute`

```typescript
// Facilitator orchestrates payment flow
await fetch(`https://facilitator.x402.network/routes/${routeId}/execute`, {
  method: 'POST',
});

// Behind the scenes:
// 1. Client pays 0.01 USDC to Service A
// 2. Service A forwards 0.008 USDC to Service B (keeps 0.002)
// 3. Service B forwards 0.006 USDC to Service C (keeps 0.002)
// 4. Service C delivers final result (keeps 0.006)
```

### Route Pricing

Each hop takes a cut:

```
Total Payment: 0.01 USDC
├─ Service A: 0.002 USDC (20%)
├─ Service B: 0.002 USDC (20%)
└─ Service C: 0.006 USDC (60%)
```

Calculate forwarding amounts:

```typescript
function calculateHopPayments(
  totalAmount: number,
  hops: string[],
  finalService: string
): Record<string, number> {
  const hopCount = hops.length;
  const hopFee = 0.002; // Fixed per hop

  const payments: Record<string, number> = {};
  let remaining = totalAmount;

  for (const hop of hops) {
    payments[hop] = hopFee;
    remaining -= hopFee;
  }

  payments[finalService] = remaining;

  return payments;
}
```

### Complete Route

**API Endpoint**: `POST /routes/:routeId/complete`

```typescript
await fetch(`https://facilitator.x402.network/routes/${routeId}/complete`, {
  method: 'POST',
  body: JSON.stringify({
    signature: finalTransactionSignature,
  }),
});
```

---

## Agent Identity and DID

### Decentralized Identifiers (DID)

X402-UPL uses DIDs for agent identity:

```
did:x402:7xKXtg2C
     │      │
     │      └─ Unique identifier (first 8 chars of wallet)
     └─ Method (x402)
```

Full DID example:
```
did:x402:7xKXtg2C
```

### Agent Registration

```typescript
const agentIdentity = await client.registerAgent(1.0);
// {
//   did: "did:x402:7xKXtg2C",
//   visaTapCert: "cert_7xKXtg2C",
//   walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
//   reputationScore: 5000
// }
```

### Visa TAP Certificate

TAP certificates enable agent verification:

```typescript
interface VisaTAPCertificate {
  id: string;
  subject: string; // DID
  issuer: string;  // X402 Registry
  publicKey: string;
  validFrom: string;
  validUntil: string;
  signature: string;
}
```

### Agent Discovery

```typescript
const agents = await client.discoverAgents({
  minReputation: 9000,
  verified: true,
});

for (const agent of agents) {
  console.log(`DID: ${agent.did}`);
  console.log(`Reputation: ${agent.reputationScore}/10000`);
  console.log(`Wallet: ${agent.walletAddress}`);
}
```

### Agent-to-Agent Communication

```typescript
// Agent A discovers Agent B
const agents = await clientA.discoverAgents({
  category: 'data-analysis',
  minReputation: 8500,
});

const agentB = agents[0];

// Agent A sends authenticated request to Agent B
const tapClient = clientA.getTAPClient();
const headers = await tapClient.signRequest(agentB.serviceUrl);

const response = await fetch(agentB.serviceUrl, {
  method: 'POST',
  headers: {
    ...Object.fromEntries(headers),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ task: 'analyze' }),
});
```

### Credit Lines for High-Reputation Agents

Agents with reputation > 9000 can access credit:

```typescript
if (agent.reputationScore >= 9000) {
  // Allow service calls without upfront payment
  // Track debt, settle later
  const creditLimit = calculateCreditLimit(agent.reputationScore);
  // 9000 reputation = $10 credit
  // 9500 reputation = $50 credit
  // 10000 reputation = $100 credit
}
```

---

## Summary

This guide covered the core concepts of X402-UPL:

1. **HTTP 402 Protocol**: Pay-per-call API access via standard HTTP
2. **Solana Integration**: Fast, cheap micropayments on Solana
3. **SPL Tokens**: USDC, CASH, and SOL support
4. **Payment Verification**: On-chain transaction verification
5. **Replay Protection**: Nonce + Redis signature tracking
6. **TAP Authentication**: RFC 9421 cryptographic signatures
7. **Service Discovery**: Registry with reputation filtering
8. **Escrow**: Safe agent-to-agent transactions
9. **Multi-Hop Routing**: Payment chains through intermediaries
10. **Agent Identity**: DID-based verifiable agent identity

For implementation details, see:
- [Best Practices](./best-practices.md)
- [Facilitator API](../api-reference/facilitator-api.md)
- [JavaScript SDK](../sdks/javascript.md)
- [Troubleshooting](../troubleshooting/common-issues.md)
