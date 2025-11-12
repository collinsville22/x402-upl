# Troubleshooting Common Issues

This guide helps you diagnose and resolve common issues when working with X402-UPL.

---

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Payment Failures](#payment-failures)
3. [Authentication Errors](#authentication-errors)
4. [Network Problems](#network-problems)
5. [Configuration Issues](#configuration-issues)
6. [Debugging Tips](#debugging-tips)

---

## Connection Issues

### Issue: Cannot connect to RPC endpoint

**Symptoms**:
```
Error: fetch failed
Error: connect ETIMEDOUT
```

**Causes**:
- Public RPC rate limiting
- Network connectivity issues
- Incorrect RPC URL

**Solutions**:

1. **Use a dedicated RPC provider**:
```typescript
// Instead of public RPC
const connection = new Connection('https://api.devnet.solana.com');

// Use Helius/QuickNode
const connection = new Connection(process.env.HELIUS_RPC_URL);
```

2. **Check RPC URL format**:
```typescript
// ✅ Correct
const rpcUrl = 'https://api.devnet.solana.com';

// ❌ Wrong
const rpcUrl = 'api.devnet.solana.com'; // Missing https://
```

3. **Test RPC connectivity**:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' https://api.devnet.solana.com
```

4. **Implement retry logic**:
```typescript
async function getTransactionWithRetry(
  connection: Connection,
  signature: string,
  maxRetries: number = 3
): Promise<Transaction> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tx = await connection.getTransaction(signature);
      if (tx) return tx;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

### Issue: WebSocket connection failures

**Symptoms**:
```
WebSocket connection to 'wss://...' failed
Error: WebSocket is already in CLOSING or CLOSED state
```

**Causes**:
- Network interruptions
- Server-side disconnections
- Rate limiting

**Solutions**:

1. **Implement reconnection logic**:
```typescript
class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.on('error', () => {
      this.reconnect(url);
    });

    this.ws.on('close', () => {
      this.reconnect(url);
    });
  }

  private reconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(url);
    }, delay);
  }
}
```

2. **Use polling as fallback**:
```typescript
async function pollForTransaction(
  connection: Connection,
  signature: string,
  timeout: number = 30000
): Promise<Transaction> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const tx = await connection.getTransaction(signature);
    if (tx) return tx;

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Transaction not found within timeout');
}
```

---

## Payment Failures

### Issue: "Transaction not found"

**Symptoms**:
```json
{
  "verified": false,
  "error": "Transaction not found"
}
```

**Causes**:
- Transaction not yet confirmed
- Transaction dropped
- Wrong network
- RPC lag

**Solutions**:

1. **Wait for confirmation**:
```typescript
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [wallet],
  {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  }
);

// Wait additional time for RPC propagation
await new Promise(resolve => setTimeout(resolve, 2000));

// Now verify
const result = await verifyPayment(signature);
```

2. **Check transaction status**:
```typescript
async function getTransactionStatus(
  connection: Connection,
  signature: string
): Promise<string> {
  const statuses = await connection.getSignatureStatuses([signature]);
  const status = statuses.value[0];

  if (!status) return 'not_found';
  if (status.err) return 'failed';
  if (status.confirmationStatus === 'finalized') return 'finalized';
  if (status.confirmationStatus === 'confirmed') return 'confirmed';
  return 'processed';
}

// Usage
const status = await getTransactionStatus(connection, signature);
console.log(`Transaction status: ${status}`);
```

3. **Verify network matches**:
```typescript
// Ensure client and service use same network
const client = new X402Client({
  network: 'devnet', // Must match service network
  wallet,
});
```

---

### Issue: "Payment amount mismatch"

**Symptoms**:
```json
{
  "verified": false,
  "error": "Payment amount mismatch: expected 0.001, got 0.0009"
}
```

**Causes**:
- Rounding errors
- Incorrect decimal handling
- Transaction fees deducted from amount

**Solutions**:

1. **Use exact amounts**:
```typescript
// ❌ Wrong: Floating point errors
const lamports = 0.001 * 1_000_000_000; // May not be exact

// ✅ Correct: Integer arithmetic
const lamports = Math.floor(0.001 * 1_000_000_000);
```

2. **Account for transaction fees**:
```typescript
// For SOL transfers, fee is separate
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient.publicKey,
    lamports: 1_000_000, // Amount transferred (not including fee)
  })
);

// Fee is deducted from sender's balance separately
```

3. **Use SPL tokens for exact amounts**:
```typescript
// SPL token transfers don't have variable fees
const transaction = new Transaction().add(
  createTransferInstruction(
    senderTokenAccount,
    recipientTokenAccount,
    sender.publicKey,
    1000, // Exact amount in base units
    [],
    TOKEN_PROGRAM_ID
  )
);
```

---

### Issue: "Insufficient balance"

**Symptoms**:
```
Error: Attempt to debit an account but found no record of a prior credit.
InsufficientFundsForRent
```

**Causes**:
- Wallet balance too low
- Need rent-exempt reserve
- Token account doesn't exist

**Solutions**:

1. **Check balance before payment**:
```typescript
const balance = await connection.getBalance(wallet.publicKey);
const requiredAmount = paymentAmount + rentExempt + fee;

if (balance < requiredAmount) {
  throw new Error(`Insufficient balance: have ${balance}, need ${requiredAmount}`);
}
```

2. **Ensure token account exists**:
```typescript
import { getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

async function ensureTokenAccount(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: Keypair
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(mint, owner);

  try {
    await getAccount(connection, ata);
    return ata;
  } catch (error) {
    // Account doesn't exist, create it
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        owner,
        mint
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
    return ata;
  }
}
```

3. **Request devnet SOL**:
```bash
# Get free devnet SOL
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

---

### Issue: "Replay attack detected"

**Symptoms**:
```json
{
  "error": "REPLAY_ATTACK",
  "message": "Transaction already used"
}
```

**Causes**:
- Reusing same transaction signature
- Signature already processed
- Redis cache hit

**Solutions**:

1. **Create new transaction for each request**:
```typescript
// ❌ Wrong: Reusing signature
const signature = await makePayment();
await callService(signature); // First call
await callService(signature); // FAILS - replay attack

// ✅ Correct: New transaction each time
const signature1 = await makePayment();
await callService(signature1);

const signature2 = await makePayment();
await callService(signature2);
```

2. **Check if transaction was already used**:
```typescript
async function isTransactionUsed(
  redis: Redis,
  signature: string
): Promise<boolean> {
  return await redis.exists(`sig:${signature}`) === 1;
}

// Usage
if (await isTransactionUsed(redis, signature)) {
  throw new Error('Transaction already used - create new payment');
}
```

---

## Authentication Errors

### Issue: "Invalid signature"

**Symptoms**:
```json
{
  "error": "INVALID_SIGNATURE",
  "message": "Wallet signature invalid"
}
```

**Causes**:
- Wrong private key used
- Incorrect message signed
- Signature encoding issues

**Solutions**:

1. **Verify signing message**:
```typescript
// Server expects this exact message
const message = 'x402-auth-request';

// ❌ Wrong: Different message
await sign(new TextEncoder().encode('different message'), privateKey);

// ✅ Correct: Exact message
await sign(new TextEncoder().encode('x402-auth-request'), privateKey);
```

2. **Check key format**:
```typescript
import { sign } from '@noble/ed25519';

// ❌ Wrong: Using full keypair
const signature = await sign(message, wallet.secretKey);

// ✅ Correct: First 32 bytes only
const signature = await sign(message, wallet.secretKey.slice(0, 32));
```

3. **Verify signature encoding**:
```typescript
// Encode signature as base64
const signatureB64 = Buffer.from(signature).toString('base64');

// Send in header
headers['X-Wallet-Signature'] = signatureB64;
```

---

### Issue: "API key invalid or expired"

**Symptoms**:
```json
{
  "error": "INVALID_API_KEY",
  "message": "API key invalid or expired"
}
```

**Causes**:
- API key expired
- API key revoked
- Wrong API key format

**Solutions**:

1. **Check API key format**:
```typescript
// API keys start with 'x402_'
const apiKey = process.env.X402_API_KEY;

if (!apiKey.startsWith('x402_')) {
  throw new Error('Invalid API key format');
}
```

2. **Generate new API key**:
```typescript
const response = await fetch('https://facilitator.x402.network/api/keys/create', {
  method: 'POST',
  headers: {
    'X-Wallet-Address': wallet.publicKey.toBase58(),
    'X-Wallet-Signature': signature,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Production Key',
    expiresIn: 31536000, // 1 year
  }),
});

const { apiKey } = await response.json();
console.log('New API key:', apiKey.key);
```

3. **Validate API key**:
```typescript
const response = await fetch('https://facilitator.x402.network/api/keys/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey }),
});

const { valid, expiresAt } = await response.json();
console.log(`Valid: ${valid}, Expires: ${expiresAt}`);
```

---

## Network Problems

### Issue: "Network request failed"

**Symptoms**:
```
TypeError: fetch failed
Error: ECONNREFUSED
```

**Causes**:
- Service down
- Network firewall
- DNS issues
- Wrong URL

**Solutions**:

1. **Check service availability**:
```bash
# Test endpoint
curl -I https://facilitator.x402.network/health

# Expected response
HTTP/2 200
```

2. **Verify DNS resolution**:
```bash
nslookup facilitator.x402.network
```

3. **Test connectivity**:
```typescript
async function testConnectivity(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Usage
const isReachable = await testConnectivity('https://facilitator.x402.network');
console.log(`Service reachable: ${isReachable}`);
```

4. **Use alternative endpoints**:
```typescript
const endpoints = [
  'https://facilitator.x402.network',
  'https://facilitator-backup.x402.network',
  'https://facilitator-eu.x402.network',
];

async function fetchWithFallback(path: string, options: any): Promise<Response> {
  for (const endpoint of endpoints) {
    try {
      return await fetch(`${endpoint}${path}`, options);
    } catch (error) {
      console.warn(`Endpoint ${endpoint} failed, trying next...`);
    }
  }
  throw new Error('All endpoints failed');
}
```

---

### Issue: "Rate limit exceeded"

**Symptoms**:
```json
{
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded",
  "retryAfter": 45
}
```

**Causes**:
- Too many requests in time window
- Shared IP rate limiting
- API key rate limiting

**Solutions**:

1. **Implement exponential backoff**:
```typescript
async function fetchWithBackoff(
  url: string,
  options: any,
  maxRetries: number = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

2. **Use API key for higher limits**:
```typescript
// Anonymous requests: 50/min
const response1 = await fetch(url);

// With API key: 100/min
const response2 = await fetch(url, {
  headers: { 'X-API-Key': apiKey },
});
```

3. **Implement request queuing**:
```typescript
class RateLimitedQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 50;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
      await new Promise(resolve =>
        setTimeout(resolve, 60000 / this.requestsPerMinute)
      );
    }

    this.processing = false;
  }
}
```

---

## Configuration Issues

### Issue: "Environment variables not loaded"

**Symptoms**:
```
TypeError: Cannot read property 'RPC_URL' of undefined
```

**Causes**:
- `.env` file not found
- Wrong working directory
- Environment variables not exported

**Solutions**:

1. **Use dotenv**:
```typescript
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Access variables
const rpcUrl = process.env.SOLANA_RPC_URL;
```

2. **Check file location**:
```bash
# .env should be in project root
ls -la .env

# If not found
cp .env.example .env
```

3. **Verify environment variables**:
```typescript
function validateEnv() {
  const required = [
    'SOLANA_RPC_URL',
    'TREASURY_PRIVATE_KEY',
    'DATABASE_URL',
    'REDIS_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

// Run before starting app
validateEnv();
```

---

### Issue: "Database connection failed"

**Symptoms**:
```
Error: Can't reach database server at `localhost:5432`
```

**Causes**:
- Database not running
- Wrong connection string
- Firewall blocking connection

**Solutions**:

1. **Test database connection**:
```bash
# PostgreSQL
psql postgresql://user:pass@localhost:5432/dbname

# Check if Prisma can connect
npx prisma db push
```

2. **Verify connection string**:
```bash
# Format
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA

# Example
DATABASE_URL=postgresql://postgres:password@localhost:5432/x402?schema=public
```

3. **Use connection pooling**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// Test connection
await prisma.$connect();
console.log('Database connected');
```

---

## Debugging Tips

### Enable Debug Logging

```typescript
// Environment variable
DEBUG=x402:* npm start

// In code
import debug from 'debug';

const log = debug('x402:client');

log('Making payment: %o', { amount, recipient });
```

---

### Inspect HTTP Requests

```typescript
import axios from 'axios';

// Add request/response interceptors
axios.interceptors.request.use(request => {
  console.log('Request:', {
    url: request.url,
    method: request.method,
    headers: request.headers,
    data: request.data,
  });
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  error => {
    console.error('Error:', {
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
);
```

---

### Monitor Solana Transactions

```typescript
async function monitorTransaction(
  connection: Connection,
  signature: string
): Promise<void> {
  console.log(`Monitoring transaction: ${signature}`);

  const subscription = connection.onSignature(
    signature,
    (result, context) => {
      console.log('Transaction confirmed:', {
        slot: context.slot,
        error: result.err,
      });
    },
    'confirmed'
  );

  // Cleanup after 30 seconds
  setTimeout(() => {
    connection.removeSignatureListener(subscription);
  }, 30000);
}
```

---

### Check Transaction Logs

```typescript
const tx = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});

console.log('Transaction logs:');
tx.meta.logMessages?.forEach(log => console.log(log));
```

---

### Verify Payment Requirements

```typescript
function validatePaymentRequirements(requirements: any): void {
  const required = ['payTo', 'amount', 'asset', 'nonce'];

  for (const field of required) {
    if (!requirements[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate address
  try {
    new PublicKey(requirements.payTo);
  } catch (error) {
    throw new Error(`Invalid payTo address: ${requirements.payTo}`);
  }

  // Validate amount
  const amount = parseFloat(requirements.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${requirements.amount}`);
  }
}
```

---

### Test Payment Flow End-to-End

```typescript
async function testPaymentFlow() {
  console.log('1. Creating payment requirements...');
  const requirements = {
    payTo: serviceWallet.toBase58(),
    amount: '0.001',
    asset: 'SOL',
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  console.log('2. Creating transaction...');
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: clientWallet.publicKey,
      toPubkey: new PublicKey(requirements.payTo),
      lamports: parseFloat(requirements.amount) * 1_000_000_000,
    })
  );

  console.log('3. Sending transaction...');
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [clientWallet]
  );

  console.log('4. Verifying payment...');
  const verified = await verifyPayment(signature, requirements);

  console.log('5. Payment flow complete:', { signature, verified });
}
```

---

## Getting Help

If you're still experiencing issues:

1. **Check GitHub Issues**: https://github.com/x402-upl/x402-upl/issues
2. **Join Discord**: https://discord.gg/x402-upl
3. **Review Documentation**:
   - [Core Concepts](../guides/concepts.md)
   - [Best Practices](../guides/best-practices.md)
   - [API Reference](../api-reference/facilitator-api.md)
   - [SDK Guide](../sdks/javascript.md)

When reporting issues, include:
- Error message and stack trace
- Network (mainnet-beta/devnet/testnet)
- SDK version
- Code snippet (minimal reproducible example)
- Transaction signature (if applicable)
