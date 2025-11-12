# Production Best Practices

This guide provides comprehensive best practices for deploying and operating X402-UPL services in production environments.

## Table of Contents

1. [Security Considerations](#security-considerations)
2. [Performance Optimization](#performance-optimization)
3. [Error Handling Patterns](#error-handling-patterns)
4. [Monitoring and Logging](#monitoring-and-logging)
5. [Rate Limiting Strategies](#rate-limiting-strategies)
6. [Cost Optimization](#cost-optimization)
7. [Scaling Considerations](#scaling-considerations)
8. [Testing Strategies](#testing-strategies)

---

## Security Considerations

### 1. Private Key Management

**Never commit private keys to version control:**

```bash
# .gitignore
.env
.env.local
.env.production
*.key
wallet.json
treasury-keypair.json
```

**Use environment variables:**

```typescript
// ❌ WRONG: Hardcoded keys
const treasuryKeypair = Keypair.fromSecretKey(
  Buffer.from([1, 2, 3, ...])
);

// ✅ CORRECT: Environment variable
const treasuryKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(process.env.TREASURY_PRIVATE_KEY!))
);
```

**Recommended: Use secret management services:**

- **AWS Secrets Manager**
- **Google Cloud Secret Manager**
- **HashiCorp Vault**
- **Azure Key Vault**

```typescript
// Example: AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getTreasuryKeypair(): Promise<Keypair> {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: 'x402/treasury-keypair',
    })
  );

  const secretKey = JSON.parse(response.SecretString!);
  return Keypair.fromSecretKey(Buffer.from(secretKey));
}
```

### 2. Multi-Signature Wallets

For treasury wallets holding significant funds, use multi-sig:

```typescript
// Use Squads Protocol for Solana multi-sig
// https://squads.so

// 2-of-3 multi-sig: requires 2 signatures out of 3 authorized signers
const squad = await createSquad({
  members: [admin1.publicKey, admin2.publicKey, admin3.publicKey],
  threshold: 2,
  network: 'mainnet-beta',
});
```

**Benefits:**
- No single point of failure
- Requires collusion to steal funds
- Audit trail for all transactions

### 3. API Key Security

**Generate strong API keys:**

```typescript
import crypto from 'crypto';

function generateApiKey(): string {
  // 64 hex characters = 256 bits of entropy
  return crypto.randomBytes(32).toString('hex');
}

function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

// Store only the hash
await prisma.apiKey.create({
  data: {
    keyHash: hashApiKey(apiKey),
    merchantId: merchant.id,
  },
});
```

**Validate API keys in constant time:**

```typescript
function validateApiKey(provided: string, stored: string): boolean {
  const providedHash = hashApiKey(provided);

  // Use crypto.timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedHash),
    Buffer.from(stored)
  );
}
```

### 4. Rate Limiting Per Key

**Implement per-key rate limits:**

```typescript
// C:\Users\User\x402-upl\packages\facilitator\src\middleware\rate-limit.ts
import rateLimit from 'fastify-rate-limit';

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Rate limit by API key or wallet address
    return request.headers['x-api-key'] ||
           request.headers['x-wallet-address'] ||
           request.ip;
  },
  redis: redisClient,
});
```

### 5. Input Validation

**Always validate inputs with Zod:**

```typescript
import { z } from 'zod';

const PaymentSchema = z.object({
  signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  recipient: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  nonce: z.string().min(16).max(64),
});

app.post('/verify', async (req, res) => {
  try {
    const payment = PaymentSchema.parse(req.body);
    // Process payment
  } catch (error) {
    return res.status(400).send({
      error: 'Invalid input',
      details: error.errors,
    });
  }
});
```

### 6. CORS Configuration

**Whitelist specific origins in production:**

```typescript
import cors from 'cors';

// ❌ WRONG: Allow all origins
app.use(cors({ origin: '*' }));

// ✅ CORRECT: Whitelist specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### 7. SQL Injection Prevention

**Use Prisma parameterized queries:**

```typescript
// ❌ WRONG: String interpolation
const userId = req.query.userId;
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE id = ${userId}
`; // Vulnerable to SQL injection

// ✅ CORRECT: Prisma client
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

### 8. Replay Attack Protection

**Implement comprehensive replay protection:**

```typescript
// Use Redis with TTL
class ReplayProtection {
  private redis: Redis;

  async checkAndStore(
    signature: string,
    nonce: string,
    ttl: number = 3600
  ): Promise<boolean> {
    const key = `sig:${signature}:${nonce}`;

    // Check if already used
    const exists = await this.redis.exists(key);
    if (exists) {
      return false; // Replay attack detected
    }

    // Store with TTL
    await this.redis.setex(key, ttl, Date.now().toString());
    return true;
  }
}
```

### 9. Payment Amount Verification

**Always verify exact amounts:**

```typescript
function verifyPaymentAmount(
  actual: number,
  expected: number,
  tolerance: number = 0.000001
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

// ❌ WRONG: Allows underpayment
if (actualAmount >= expectedAmount) {
  // Process
}

// ✅ CORRECT: Exact match with small tolerance for rounding
if (verifyPaymentAmount(actualAmount, expectedAmount)) {
  // Process
}
```

### 10. Webhook Signature Verification

**Verify webhook signatures:**

```typescript
// C:\Users\User\x402-upl\packages\facilitator\src\utils\webhook-signature.ts
import crypto from 'crypto';

export function verifyWebhookSignature(
  payload: object,
  signature: string,
  secret: string
): boolean {
  const payloadString = JSON.stringify(payload);

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET!;

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(403).send({ error: 'Invalid signature' });
  }

  // Process webhook
});
```

---

## Performance Optimization

### 1. Database Indexing

**Add indexes for frequently queried fields:**

```sql
-- C:\Users\User\x402-upl\packages\facilitator\prisma\schema.prisma

model Transaction {
  id               String   @id @default(cuid())
  signature        String   @unique
  serviceId        String?
  status           String
  createdAt        DateTime @default(now())

  @@index([serviceId, status])
  @@index([createdAt])
  @@index([status, createdAt])
}

model Service {
  id               String   @id @default(cuid())
  category         String?
  pricePerCall     String
  averageRating    Float?

  @@index([category])
  @@index([pricePerCall])
  @@index([averageRating])
}
```

### 2. Redis Caching

**Cache frequently accessed data:**

```typescript
class ServiceCache {
  private redis: Redis;
  private ttl: number = 300; // 5 minutes

  async getService(id: string): Promise<Service | null> {
    // Check cache first
    const cached = await this.redis.get(`service:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const service = await prisma.service.findUnique({
      where: { id }
    });

    // Cache result
    if (service) {
      await this.redis.setex(
        `service:${id}`,
        this.ttl,
        JSON.stringify(service)
      );
    }

    return service;
  }

  async invalidate(id: string): Promise<void> {
    await this.redis.del(`service:${id}`);
  }
}
```

### 3. Connection Pooling

**Reuse Solana RPC connections:**

```typescript
// ❌ WRONG: Create new connection per request
app.get('/verify', async (req, res) => {
  const connection = new Connection(rpcUrl); // Expensive!
  const tx = await connection.getTransaction(signature);
});

// ✅ CORRECT: Reuse connection
const connection = new Connection(rpcUrl, 'confirmed');

app.get('/verify', async (req, res) => {
  const tx = await connection.getTransaction(signature);
});
```

### 4. Batch RPC Requests

**Use getMultipleAccounts instead of multiple calls:**

```typescript
// ❌ WRONG: Multiple RPC calls
const accounts = await Promise.all(
  publicKeys.map(pk => connection.getAccountInfo(pk))
);

// ✅ CORRECT: Single batched call
const accounts = await connection.getMultipleAccountsInfo(publicKeys);
```

### 5. Database Query Optimization

**Use select to fetch only needed fields:**

```typescript
// ❌ WRONG: Fetch entire record
const services = await prisma.service.findMany();

// ✅ CORRECT: Select specific fields
const services = await prisma.service.findMany({
  select: {
    id: true,
    name: true,
    pricePerCall: true,
    category: true,
  }
});
```

**Use pagination:**

```typescript
const PAGE_SIZE = 50;

const services = await prisma.service.findMany({
  take: PAGE_SIZE,
  skip: page * PAGE_SIZE,
  orderBy: { createdAt: 'desc' },
});
```

### 6. Compress HTTP Responses

**Enable gzip compression:**

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9)
}));
```

### 7. Use CDN for Static Assets

**Offload static content to CDN:**

```typescript
// Store images, documentation on CDN
const cdnUrl = process.env.CDN_URL || 'https://cdn.x402.network';

const serviceImageUrl = `${cdnUrl}/services/${service.id}/image.png`;
```

### 8. Implement Response Caching

**Cache API responses:**

```typescript
import apicache from 'apicache';

const cache = apicache.middleware;

// Cache for 5 minutes
app.get('/api/services/trending', cache('5 minutes'), async (req, res) => {
  const trending = await getTrendingServices();
  res.json(trending);
});
```

### 9. Use Dedicated RPC Endpoints

**Production RPC recommendations:**

```typescript
// Helius (recommended for best performance)
const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

// QuickNode
const rpcUrl = process.env.QUICKNODE_RPC_URL;

// Configure with custom commitment and retry
const connection = new Connection(rpcUrl, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});
```

### 10. Optimize Bundle Size (Frontend)

**For client-side SDK:**

```typescript
// Use tree-shaking friendly imports
import { X402Client } from '@x402-upl/sdk';

// ❌ WRONG: Import entire library
import * as sdk from '@x402-upl/sdk';

// ✅ CORRECT: Import only what you need
import { X402Client, ServiceDiscovery } from '@x402-upl/sdk';
```

---

## Error Handling Patterns

### 1. Comprehensive Error Types

**Define specific error classes:**

```typescript
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 402
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class VerificationError extends PaymentError {
  constructor(message: string) {
    super(message, 'VERIFICATION_FAILED', 402);
  }
}

export class InsufficientBalanceError extends PaymentError {
  constructor(required: number, actual: number) {
    super(
      `Insufficient balance: required ${required}, actual ${actual}`,
      'INSUFFICIENT_BALANCE',
      402
    );
  }
}

export class ReplayAttackError extends PaymentError {
  constructor(signature: string) {
    super(
      `Transaction already used: ${signature}`,
      'REPLAY_ATTACK',
      403
    );
  }
}
```

### 2. Centralized Error Handler

```typescript
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  // Log error
  app.log.error({
    err: error,
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
    },
  });

  // Payment errors
  if (error instanceof PaymentError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: error.validation,
    });
  }

  // Database errors
  if (error.code === 'P2002') {
    return reply.status(409).send({
      error: 'DUPLICATE_ENTRY',
      message: 'Resource already exists',
    });
  }

  // Default error
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
});
```

### 3. Retry Logic

**Implement exponential backoff for RPC calls:**

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
const tx = await withRetry(
  () => connection.getTransaction(signature),
  3,
  1000
);
```

### 4. Graceful Degradation

```typescript
async function getServiceWithFallback(serviceId: string): Promise<Service> {
  try {
    // Try cache first
    const cached = await redis.get(`service:${serviceId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    app.log.warn('Redis unavailable, falling back to database');
  }

  // Fall back to database
  return await prisma.service.findUnique({
    where: { id: serviceId }
  });
}
```

### 5. Circuit Breaker Pattern

**Prevent cascading failures:**

```typescript
class CircuitBreaker {
  private failures: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt: number = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;

    if (this.failures >= 5) {
      this.state = 'open';
      this.nextAttempt = Date.now() + 60000; // 1 minute
    }
  }
}
```

---

## Monitoring and Logging

### 1. Structured Logging

**Use Pino for structured logging:**

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Log payment verification
logger.info({
  event: 'payment_verified',
  signature: signature,
  amount: amount,
  from: from,
  to: to,
  duration: Date.now() - startTime,
});

// Log errors with context
logger.error({
  event: 'payment_verification_failed',
  signature: signature,
  error: error.message,
  stack: error.stack,
});
```

### 2. Metrics Collection

**Track key metrics:**

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

const metrics = {
  paymentsTotal: new Counter({
    name: 'x402_payments_total',
    help: 'Total number of payments processed',
    labelNames: ['status', 'token'],
  }),

  paymentDuration: new Histogram({
    name: 'x402_payment_duration_seconds',
    help: 'Payment verification duration',
    buckets: [0.1, 0.5, 1, 2, 5],
  }),

  activeConnections: new Gauge({
    name: 'x402_active_connections',
    help: 'Number of active connections',
  }),
};

// Track payment
const end = metrics.paymentDuration.startTimer();
try {
  await verifyPayment(signature);
  metrics.paymentsTotal.inc({ status: 'success', token: 'USDC' });
} catch (error) {
  metrics.paymentsTotal.inc({ status: 'failed', token: 'USDC' });
} finally {
  end();
}
```

### 3. Health Checks

**Implement comprehensive health checks:**

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      solana: await checkSolanaRPC(),
    },
  };

  const healthy = Object.values(checks.checks).every(c => c.status === 'healthy');

  res.status(healthy ? 200 : 503).send(checks);
});

async function checkDatabase(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
    };
  }
}
```

### 4. Application Performance Monitoring (APM)

**Integrate with APM tools:**

```typescript
// Datadog APM
import tracer from 'dd-trace';

tracer.init({
  service: 'x402-facilitator',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
});

// New Relic
import newrelic from 'newrelic';

// Sentry
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 5. Alerting

**Set up alerts for critical events:**

```typescript
async function sendAlert(
  severity: 'critical' | 'warning' | 'info',
  message: string
): Promise<void> {
  if (severity === 'critical') {
    // Send to PagerDuty
    await pagerduty.trigger({
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      payload: {
        summary: message,
        severity: 'critical',
        source: 'x402-facilitator',
      },
    });
  }

  // Log to monitoring system
  logger.error({
    alert: true,
    severity,
    message,
  });
}

// Example: Alert on payment verification failures
if (verificationFailureRate > 0.1) {
  await sendAlert(
    'critical',
    `Payment verification failure rate: ${verificationFailureRate * 100}%`
  );
}
```

---

## Rate Limiting Strategies

### 1. Per-Endpoint Rate Limits

```typescript
const rateLimits = {
  '/api/services/search': {
    max: 100,
    window: '1m',
  },
  '/api/payments/verify': {
    max: 10,
    window: '1m',
  },
  '/api/settlement/request': {
    max: 5,
    window: '1h',
  },
};

app.register(rateLimit, {
  max: (req) => {
    const limit = rateLimits[req.url];
    return limit?.max || 50;
  },
  timeWindow: (req) => {
    const limit = rateLimits[req.url];
    return limit?.window || '1m';
  },
  redis: redisClient,
});
```

### 2. Token Bucket Algorithm

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

### 3. Distributed Rate Limiting

**Use Redis for multi-instance rate limiting:**

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if exceeded
});

app.use(async (req, res, next) => {
  const key = req.headers['x-api-key'] || req.ip;

  try {
    await rateLimiter.consume(key);
    next();
  } catch (error) {
    res.status(429).send({
      error: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded',
      retryAfter: error.msBeforeNext / 1000,
    });
  }
});
```

### 4. Adaptive Rate Limiting

**Adjust limits based on load:**

```typescript
class AdaptiveRateLimiter {
  private baseLimit: number = 100;
  private currentLimit: number = 100;

  async adjustLimit(): Promise<void> {
    const cpuUsage = await getCPUUsage();
    const memoryUsage = await getMemoryUsage();

    if (cpuUsage > 80 || memoryUsage > 80) {
      this.currentLimit = Math.floor(this.baseLimit * 0.5);
    } else if (cpuUsage < 50 && memoryUsage < 50) {
      this.currentLimit = Math.floor(this.baseLimit * 1.5);
    }
  }
}
```

---

## Cost Optimization

### 1. RPC Cost Management

**Use rate-limited public RPC for non-critical calls:**

```typescript
const publicRpc = new Connection('https://api.mainnet-beta.solana.com');
const premiumRpc = new Connection(process.env.HELIUS_RPC_URL);

// Use premium RPC for payments (critical)
async function verifyPayment(signature: string): Promise<boolean> {
  const tx = await premiumRpc.getTransaction(signature);
  return verifyTransaction(tx);
}

// Use public RPC for service discovery (non-critical)
async function getServiceInfo(serviceId: string): Promise<Service> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId }
  });

  // Verify on-chain data with public RPC (can tolerate rate limits)
  try {
    const onChainData = await publicRpc.getAccountInfo(
      new PublicKey(service.walletAddress)
    );
  } catch (error) {
    // Fall back to database
  }

  return service;
}
```

### 2. Database Query Optimization

**Use database indexes and materialized views:**

```sql
-- Create materialized view for trending services
CREATE MATERIALIZED VIEW trending_services AS
SELECT
  s.id,
  s.name,
  COUNT(t.id) as call_count,
  SUM(CAST(t.amount AS NUMERIC)) as revenue
FROM services s
LEFT JOIN transactions t ON t.service_id = s.id
WHERE t.created_at > NOW() - INTERVAL '7 days'
GROUP BY s.id, s.name
ORDER BY call_count DESC
LIMIT 100;

-- Refresh periodically
REFRESH MATERIALIZED VIEW trending_services;
```

### 3. Caching Strategy

**Implement multi-tier caching:**

```typescript
class MultiTierCache {
  private memoryCache: Map<string, any> = new Map();
  private redis: Redis;

  async get(key: string): Promise<any> {
    // L1: Memory cache (fastest)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // L2: Redis cache
    const cached = await this.redis.get(key);
    if (cached) {
      const value = JSON.parse(cached);
      this.memoryCache.set(key, value);
      return value;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    this.memoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

### 4. Serverless Computing

**Use serverless for background jobs:**

```typescript
// AWS Lambda for settlement processing
export const handler = async (event: any) => {
  const pendingSettlements = await prisma.settlement.findMany({
    where: { status: 'pending' },
  });

  for (const settlement of pendingSettlements) {
    await processSettlement(settlement);
  }
};

// Invoke periodically via EventBridge
```

---

## Scaling Considerations

### 1. Horizontal Scaling

**Design for stateless services:**

```typescript
// ❌ WRONG: In-memory state
const activeConnections = new Map<string, WebSocket>();

// ✅ CORRECT: Redis for shared state
async function trackConnection(userId: string, connectionId: string) {
  await redis.sadd(`user:${userId}:connections`, connectionId);
}
```

### 2. Load Balancing

**Use sticky sessions for WebSocket:**

```nginx
upstream facilitator_servers {
    ip_hash; # Sticky sessions
    server facilitator1:4001;
    server facilitator2:4001;
    server facilitator3:4001;
}

server {
    listen 80;

    location / {
        proxy_pass http://facilitator_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Database Sharding

**Shard by merchant wallet:**

```typescript
function getShardForMerchant(merchantWallet: string): string {
  const hash = crypto.createHash('md5').update(merchantWallet).digest('hex');
  const shardId = parseInt(hash.substring(0, 8), 16) % SHARD_COUNT;
  return `shard_${shardId}`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env[`DATABASE_URL_${getShardForMerchant(merchantWallet)}`],
    },
  },
});
```

### 4. Read Replicas

**Use read replicas for queries:**

```typescript
const masterDb = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const replicaDb = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_REPLICA_URL } },
});

// Writes go to master
await masterDb.transaction.create({ data: txData });

// Reads from replica
const services = await replicaDb.service.findMany();
```

---

## Testing Strategies

### 1. Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('PaymentVerifier', () => {
  let verifier: PaymentVerifier;

  beforeEach(() => {
    verifier = new PaymentVerifier(testConfig);
  });

  it('should verify valid SOL payment', async () => {
    const result = await verifier.verify(validSignature, validPayment);
    expect(result).toBe(true);
  });

  it('should reject insufficient payment', async () => {
    await expect(
      verifier.verify(signature, insufficientPayment)
    ).rejects.toThrow('Insufficient payment amount');
  });

  it('should detect replay attacks', async () => {
    await verifier.verify(signature, payment);
    await expect(
      verifier.verify(signature, payment)
    ).rejects.toThrow('Transaction already used');
  });
});
```

### 2. Integration Tests

```typescript
describe('Payment API Integration', () => {
  it('should complete payment flow end-to-end', async () => {
    // 1. Make request without payment
    const response1 = await fetch('http://localhost:4001/api/service');
    expect(response1.status).toBe(402);

    const requirements = await response1.json();

    // 2. Create and sign payment
    const signature = await createPayment(requirements);

    // 3. Retry with payment
    const response2 = await fetch('http://localhost:4001/api/service', {
      headers: {
        'X-Payment': encodePayment({ signature, ...requirements }),
      },
    });

    expect(response2.status).toBe(200);
  });
});
```

### 3. Load Testing

```typescript
import autocannon from 'autocannon';

async function loadTest() {
  const result = await autocannon({
    url: 'http://localhost:4001',
    connections: 100,
    duration: 60,
    requests: [
      {
        method: 'GET',
        path: '/api/services/search?category=AI',
      },
    ],
  });

  console.log(`Requests per second: ${result.requests.average}`);
  console.log(`Latency p99: ${result.latency.p99}ms`);
}
```

### 4. Security Testing

```bash
# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://facilitator.x402.network

# SQL injection testing
sqlmap -u "https://facilitator.x402.network/api/services?id=1" \
  --batch --risk=3 --level=5
```

---

## Summary

This guide covered production best practices for X402-UPL:

1. **Security**: Key management, multi-sig, validation, CORS, replay protection
2. **Performance**: Caching, indexing, batching, CDN, dedicated RPC
3. **Error Handling**: Typed errors, retry logic, circuit breakers, graceful degradation
4. **Monitoring**: Structured logging, metrics, health checks, APM, alerting
5. **Rate Limiting**: Per-endpoint limits, token bucket, distributed limiting, adaptive
6. **Cost Optimization**: RPC management, query optimization, caching, serverless
7. **Scaling**: Horizontal scaling, load balancing, sharding, read replicas
8. **Testing**: Unit tests, integration tests, load testing, security testing

For implementation examples, see:
- [Facilitator API](../components/facilitator.md)
- [JavaScript SDK](../sdks/javascript.md)
- [Troubleshooting](../troubleshooting/common-issues.md)
