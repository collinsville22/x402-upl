import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ProxyConfig, RPCRequest, RPCResponse, PaymentRequirement, PaymentProof } from '../types.js';
import { PricingEngine } from '../pricing.js';
import { PaymentVerifier } from '../payment-verifier.js';
import { TAPVerifier } from '../tap-verifier.js';
import { X402RegistryClient } from '../x402-registry-client.js';
import axios from 'axios';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';

export class OldFaithfulProxy {
  private server: FastifyInstance;
  private config: ProxyConfig;
  private pricing: PricingEngine;
  private paymentVerifier: PaymentVerifier;
  private tapVerifier: TAPVerifier;
  private registryClient: X402RegistryClient;
  private redis?: Redis;
  private metrics = {
    totalRequests: 0,
    paidRequests: 0,
    revenue: 0,
    cacheHits: 0,
    errors: 0,
  };

  constructor(config: ProxyConfig) {
    this.config = config;
    this.server = Fastify({
      logger: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      },
    });

    this.pricing = new PricingEngine();
    this.paymentVerifier = new PaymentVerifier(
      config.solanaRpcUrl,
      config.paymentRecipient,
      config.redisUrl
    );
    this.tapVerifier = new TAPVerifier(config.tapRegistryUrl, config.redisUrl);
    this.registryClient = new X402RegistryClient(config.x402RegistryUrl);

    if (config.redisUrl) {
      this.redis = new Redis(config.redisUrl);
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.startSlotUpdater();
  }

  private setupMiddleware(): void {
    this.server.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Signature', 'X-Payment', 'X-Payment-Proof'],
    });

    if (this.config.rateLimitPerMinute) {
      this.server.register(rateLimit, {
        max: this.config.rateLimitPerMinute,
        timeWindow: '1 minute',
      });
    }

    this.server.addHook('onRequest', async (request, reply) => {
      this.metrics.totalRequests++;
    });
  }

  private setupRoutes(): void {
    this.server.post('/', async (request, reply) => {
      return this.handleRPCRequest(request, reply);
    });

    this.server.get('/health', async (request, reply) => {
      return {
        status: 'healthy',
        uptime: process.uptime(),
        metrics: this.metrics,
      };
    });

    this.server.get('/pricing', async (request, reply) => {
      return {
        tiers: this.pricing.getAllPricingTiers(),
        currency: 'CASH',
        paymentRecipient: this.config.paymentRecipient,
      };
    });

    this.server.get('/metrics', async (request, reply) => {
      return this.metrics;
    });
  }

  private async handleRPCRequest(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const rpcRequest = request.body as RPCRequest;

    if (!rpcRequest || !rpcRequest.method) {
      reply.code(400).send({
        jsonrpc: '2.0',
        id: rpcRequest?.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      });
      return;
    }

    const tapResult = await this.tapVerifier.verifySignature(
      request.method,
      request.url,
      request.headers as Record<string, string>,
      JSON.stringify(request.body)
    );

    if (!tapResult.valid) {
      reply.code(401).send({
        jsonrpc: '2.0',
        id: rpcRequest.id,
        error: {
          code: -32001,
          message: 'TAP authentication failed',
          data: tapResult.error,
        },
      });
      return;
    }

    const dataVolume = this.pricing.estimateDataVolume(rpcRequest.method, rpcRequest.params);
    const cost = this.pricing.calculateCost(rpcRequest, dataVolume);

    if (cost.totalCost > 0) {
      const paymentProofHeader = request.headers['x-payment-proof'] as string;

      if (!paymentProofHeader) {
        const requirement = this.createPaymentRequirement(cost.totalCost, rpcRequest);

        if (this.redis) {
          await this.redis.setex(
            `payment:${requirement.requestId}`,
            300,
            JSON.stringify(requirement)
          );
        }

        reply.code(402).send({
          jsonrpc: '2.0',
          id: rpcRequest.id,
          error: {
            code: 402,
            message: 'Payment Required',
            data: {
              amount: requirement.amount,
              currency: requirement.currency,
              recipient: requirement.recipient,
              mint: requirement.mint,
              requestId: requirement.requestId,
              expiresAt: requirement.expiresAt,
              breakdown: cost.breakdown,
            },
          },
        });
        return;
      }

      const proof: PaymentProof = JSON.parse(paymentProofHeader);
      let requirement: PaymentRequirement | null = null;

      if (this.redis) {
        const stored = await this.redis.get(`payment:${proof.requestId}`);
        if (!stored) {
          reply.code(400).send({
            jsonrpc: '2.0',
            id: rpcRequest.id,
            error: {
              code: -32002,
              message: 'Invalid or expired payment request',
            },
          });
          return;
        }
        requirement = JSON.parse(stored);
      }

      if (!requirement) {
        reply.code(400).send({
          jsonrpc: '2.0',
          id: rpcRequest.id,
          error: {
            code: -32002,
            message: 'Invalid or expired payment request',
          },
        });
        return;
      }

      const paymentValid = await this.paymentVerifier.verifyPayment(proof, requirement);

      if (!paymentValid) {
        reply.code(403).send({
          jsonrpc: '2.0',
          id: rpcRequest.id,
          error: {
            code: -32003,
            message: 'Payment verification failed',
          },
        });
        return;
      }

      if (this.redis) {
        await this.redis.del(`payment:${proof.requestId}`);
      }
      this.metrics.paidRequests++;
      this.metrics.revenue += cost.totalCost;
    }

    try {
      const response = await axios.post(this.config.oldFaithfulUrl, rpcRequest, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const rpcResponse: RPCResponse = response.data;

      reply.code(200).send(rpcResponse);
    } catch (error: any) {
      this.metrics.errors++;

      const errorResponse: RPCResponse = {
        jsonrpc: '2.0',
        id: rpcRequest.id,
        error: {
          code: -32000,
          message: 'Upstream RPC error',
          data: error.message,
        },
      };

      reply.code(500).send(errorResponse);
    }
  }

  private createPaymentRequirement(amount: number, rpcRequest: RPCRequest): PaymentRequirement {
    return {
      amount,
      recipient: this.config.paymentRecipient,
      currency: 'CASH',
      mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
      expiresAt: Date.now() + 300000,
      requestId: randomBytes(16).toString('hex'),
    };
  }

  private async startSlotUpdater(): Promise<void> {
    const updateSlot = async () => {
      try {
        const response = await axios.post(this.config.oldFaithfulUrl, {
          jsonrpc: '2.0',
          id: 1,
          method: 'getSlot',
        });

        if (response.data.result) {
          this.pricing.updateCurrentSlot(response.data.result);
        }
      } catch (error) {
        this.server.log.error('Failed to update current slot');
      }
    };

    await updateSlot();

    setInterval(updateSlot, 30000);
  }

  async registerServices(): Promise<void> {
    const tiers = this.pricing.getAllPricingTiers();

    for (const tier of tiers) {
      try {
        await this.registryClient.registerService({
          name: `Old Faithful ${tier.method}`,
          description: `Access historical Solana ${tier.method} data via Old Faithful`,
          category: 'historical-data',
          url: `http://${this.config.host}:${this.config.port}`,
          pricePerCall: tier.basePrice,
          ownerWalletAddress: this.config.paymentRecipient,
          acceptedTokens: ['CASH', 'USDC', 'SOL'],
          capabilities: ['historical-blocks', 'transaction-data', 'tap-auth'],
          metadata: {
            method: tier.method,
            volumeMultiplier: tier.volumeMultiplier,
            ageMultiplier: tier.ageMultiplier,
          },
        });

        this.server.log.info(`Registered ${tier.method} in x402 Registry`);
      } catch (error) {
        this.server.log.error(`Failed to register ${tier.method}: ${error}`);
      }
    }
  }

  async start(): Promise<void> {
    try {
      await this.server.listen({
        port: this.config.port,
        host: this.config.host,
      });

      this.server.log.info(`Old Faithful x402 Proxy running on ${this.config.host}:${this.config.port}`);

      await this.registerServices();
    } catch (error) {
      this.server.log.error(error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}

async function main() {
  const config: ProxyConfig = {
    port: parseInt(process.env.PORT || '3002', 10),
    host: process.env.HOST || '0.0.0.0',
    oldFaithfulUrl: process.env.OLD_FAITHFUL_URL || 'http://localhost:8899',
    paymentRecipient: process.env.PAYMENT_RECIPIENT || '',
    tapRegistryUrl: process.env.TAP_REGISTRY_URL || 'http://localhost:8001',
    x402RegistryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:3001',
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    rateLimitPerMinute: 100,
  };

  if (!config.paymentRecipient) {
    console.error('PAYMENT_RECIPIENT environment variable is required');
    process.exit(1);
  }

  const proxy = new OldFaithfulProxy(config);
  await proxy.start();

  process.on('SIGINT', async () => {
    await proxy.stop();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { OldFaithfulProxy };
