import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Connection, Keypair } from '@solana/web3.js';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

interface MCPConfig {
  privateKey: Uint8Array;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  facilitatorUrl: string;
  registryUrl: string;
  serviceRefreshInterval: number;
}

interface X402Service {
  id: string;
  name: string;
  description: string;
  resource: string;
  method?: string;
  pricing?: {
    amount: string;
    asset: string;
    network: string;
  };
}

export class SolanaMCPServer {
  private server: Server;
  private httpClient: AxiosInstance;
  private wallet: Keypair;
  private connection: Connection;
  private services: Map<string, X402Service>;
  private config: MCPConfig;
  private paymentHistory: Array<{
    timestamp: number;
    service: string;
    amount: string;
    asset: string;
    signature: string;
    status: string;
  }>;
  private logger: pino.Logger;
  private metrics: {
    toolCalls: number;
    totalSpent: number;
    successfulPayments: number;
    failedPayments: number;
    averageLatency: number;
    latencies: number[];
  };

  constructor(config: MCPConfig) {
    this.config = config;
    this.wallet = Keypair.fromSecretKey(config.privateKey);

    const rpcUrl = config.network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.httpClient = axios.create();
    this.services = new Map();
    this.paymentHistory = [];

    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true },
      } : undefined,
    });

    this.metrics = {
      toolCalls: 0,
      totalSpent: 0,
      successfulPayments: 0,
      failedPayments: 0,
      averageLatency: 0,
      latencies: [],
    };

    this.server = new Server({
      name: 'x402-solana-mcp-server',
      version: '2.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    });

    this.setupHandlers();
    this.startServiceRefresh();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.services.values()).map(service => ({
        name: this.sanitizeToolName(service.resource),
        description: `${service.description}\nCost: ${service.pricing?.amount || 'Free'}\nNetwork: ${service.pricing?.network || 'N/A'}`,
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: true,
        },
      }));

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const toolName = request.params.name;

      this.metrics.toolCalls++;

      this.logger.info({
        event: 'tool_call_start',
        tool: toolName,
        args: request.params.arguments,
      });

      const service = Array.from(this.services.values()).find(
        s => this.sanitizeToolName(s.resource) === toolName
      );

      if (!service) {
        this.logger.error({ event: 'service_not_found', tool: toolName });
        throw new Error(`Service not found: ${toolName}`);
      }

      try {
        const response = await this.makePaymentRequest(
          service.resource,
          service.method || 'GET',
          request.params.arguments
        );

        const latency = Date.now() - startTime;
        this.recordLatency(latency);

        this.logger.info({
          event: 'tool_call_success',
          tool: toolName,
          latency,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      } catch (error) {
        const latency = Date.now() - startTime;

        this.logger.error({
          event: 'tool_call_error',
          tool: toolName,
          error: error instanceof Error ? error.message : 'Unknown error',
          latency,
        });

        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'x402://services/catalog',
            name: 'Service Catalog',
            description: 'Browse available x402 services',
            mimeType: 'application/json',
          },
          {
            uri: 'x402://payments/history',
            name: 'Payment History',
            description: 'View past x402 payments',
            mimeType: 'application/json',
          },
          {
            uri: 'x402://wallet/status',
            name: 'Wallet Status',
            description: 'Check wallet balance and address',
            mimeType: 'application/json',
          },
          {
            uri: 'x402://metrics/performance',
            name: 'Performance Metrics',
            description: 'View server performance and usage metrics',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      if (uri === 'x402://services/catalog') {
        const catalog = Array.from(this.services.values()).map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          endpoint: service.resource,
          pricing: service.pricing,
        }));

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(catalog, null, 2),
          }],
        };
      }

      if (uri === 'x402://payments/history') {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(this.paymentHistory, null, 2),
          }],
        };
      }

      if (uri === 'x402://wallet/status') {
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        const status = {
          address: this.wallet.publicKey.toBase58(),
          balance: balance / 1_000_000_000,
          network: this.config.network,
        };

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
          }],
        };
      }

      if (uri === 'x402://metrics/performance') {
        const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
        const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
        const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
        const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

        const metricsData = {
          usage: {
            toolCalls: this.metrics.toolCalls,
            successfulPayments: this.metrics.successfulPayments,
            failedPayments: this.metrics.failedPayments,
            successRate: this.metrics.toolCalls > 0
              ? ((this.metrics.successfulPayments / this.metrics.toolCalls) * 100).toFixed(2) + '%'
              : 'N/A',
          },
          financial: {
            totalSpent: this.metrics.totalSpent.toFixed(6),
            currency: 'SOL',
            averagePerCall: this.metrics.toolCalls > 0
              ? (this.metrics.totalSpent / this.metrics.toolCalls).toFixed(6)
              : '0',
          },
          performance: {
            averageLatency: this.metrics.averageLatency.toFixed(2) + 'ms',
            p50Latency: p50.toFixed(2) + 'ms',
            p95Latency: p95.toFixed(2) + 'ms',
            p99Latency: p99.toFixed(2) + 'ms',
            totalRequests: this.metrics.latencies.length,
          },
        };

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(metricsData, null, 2),
          }],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'cost-optimized-query',
            description: 'Find the most cost-effective service for a specific query',
            arguments: [
              {
                name: 'query',
                description: 'The search query or task description',
                required: true,
              },
              {
                name: 'maxBudget',
                description: 'Maximum budget in USD',
                required: false,
              },
            ],
          },
          {
            name: 'multi-service-workflow',
            description: 'Execute a workflow across multiple x402 services',
            arguments: [
              {
                name: 'workflow',
                description: 'Description of the workflow to execute',
                required: true,
              },
              {
                name: 'totalBudget',
                description: 'Total budget for all services',
                required: false,
              },
            ],
          },
          {
            name: 'budget-research',
            description: 'Research a topic using available budget across multiple services',
            arguments: [
              {
                name: 'topic',
                description: 'Research topic',
                required: true,
              },
              {
                name: 'budget',
                description: 'Research budget in USD',
                required: true,
              },
            ],
          },
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const name = request.params.name;
      const args = request.params.arguments || {};

      if (name === 'cost-optimized-query') {
        const query = args.query;
        const maxBudget = args.maxBudget ? parseFloat(args.maxBudget) : Infinity;

        const services = Array.from(this.services.values())
          .filter(s => s.pricing && parseFloat(s.pricing.amount) <= maxBudget)
          .sort((a, b) => parseFloat(a.pricing!.amount) - parseFloat(b.pricing!.amount));

        const message = `I need to ${query}. Here are the available services sorted by cost:\n\n${services.map((s, i) =>
          `${i + 1}. ${s.name} - ${s.pricing!.amount} ${s.pricing!.asset}\n   ${s.description}`
        ).join('\n\n')}\n\nWhich service should I use for the best value?`;

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: message,
              },
            },
          ],
        };
      }

      if (name === 'multi-service-workflow') {
        const workflow = args.workflow;
        const totalBudget = args.totalBudget ? parseFloat(args.totalBudget) : Infinity;

        const catalogText = Array.from(this.services.values())
          .map(s => `- ${s.name}: ${s.description} (${s.pricing?.amount || 'Free'} ${s.pricing?.asset || ''})`)
          .join('\n');

        const message = `I need to execute this workflow: ${workflow}\n\nAvailable services:\n${catalogText}\n\nTotal budget: ${totalBudget} USD\n\nPlease break this down into steps using the available services while staying within budget.`;

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: message,
              },
            },
          ],
        };
      }

      if (name === 'budget-research') {
        const topic = args.topic;
        const budget = parseFloat(args.budget);

        const balance = await this.connection.getBalance(this.wallet.publicKey);
        const balanceUSD = balance / 1_000_000_000;

        const message = `I want to research "${topic}" with a budget of ${budget} USD.\n\nMy wallet has ${balanceUSD.toFixed(4)} SOL available.\n\nAvailable services:\n${Array.from(this.services.values())
          .map(s => `- ${s.name}: ${s.pricing?.amount || 'Free'} ${s.pricing?.asset || ''}`)
          .join('\n')}\n\nWhat's the best research strategy to maximize insights within my budget?`;

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: message,
              },
            },
          ],
        };
      }

      throw new Error(`Unknown prompt: ${name}`);
    });
  }

  private async makePaymentRequest(
    url: string,
    method: string,
    args: any
  ): Promise<any> {
    try {
      const response = await this.httpClient.request({
        method,
        url,
        data: method === 'POST' ? args : undefined,
        params: method === 'GET' ? args : undefined,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        const requirements = error.response.data;

        this.logger.info({
          event: 'payment_required',
          service: url,
          amount: requirements.amount,
          asset: requirements.asset,
        });

        try {
          const paymentResult = await this.createPayment(requirements, url);

          const paidResponse = await this.httpClient.request({
            method,
            url,
            data: method === 'POST' ? args : undefined,
            params: method === 'GET' ? args : undefined,
            headers: {
              'X-Payment': paymentResult.header,
            },
          });

          this.metrics.successfulPayments++;
          this.metrics.totalSpent += parseFloat(requirements.amount);

          this.paymentHistory.push({
            timestamp: Date.now(),
            service: url,
            amount: requirements.amount,
            asset: requirements.asset,
            signature: paymentResult.signature,
            status: 'completed',
          });

          this.logger.info({
            event: 'payment_success',
            service: url,
            amount: requirements.amount,
            signature: paymentResult.signature,
          });

          return paidResponse.data;
        } catch (paymentError) {
          this.metrics.failedPayments++;

          this.logger.error({
            event: 'payment_failed',
            service: url,
            error: paymentError instanceof Error ? paymentError.message : 'Unknown error',
          });

          throw paymentError;
        }
      }
      throw error;
    }
  }

  private async createPayment(requirements: any, serviceUrl: string): Promise<{ header: string; signature: string }> {
    const { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } = await import('@solana/web3.js');
    const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } = await import('@solana/spl-token');

    const recipientPubkey = new PublicKey(requirements.payTo);
    const assetPubkey = new PublicKey(requirements.asset);
    const amount = parseFloat(requirements.amount);

    let signature: string;

    if (requirements.asset === 'SOL' || assetPubkey.equals(SystemProgram.programId)) {
      const lamports = Math.floor(amount * 1_000_000_000);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        { commitment: 'confirmed' }
      );
    } else {
      const fromTokenAccount = await getAssociatedTokenAddress(
        assetPubkey,
        this.wallet.publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        assetPubkey,
        recipientPubkey
      );

      const transaction = new Transaction();

      try {
        await getAccount(this.connection, toTokenAccount);
      } catch {
        const createATAIx = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,
          toTokenAccount,
          recipientPubkey,
          assetPubkey
        );
        transaction.add(createATAIx);
      }

      const decimals = 6;
      const transferAmount = Math.floor(amount * Math.pow(10, decimals));

      const transferIx = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        this.wallet.publicKey,
        transferAmount
      );

      transaction.add(transferIx);

      signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        { commitment: 'confirmed' }
      );
    }

    const payload = {
      network: requirements.network,
      asset: requirements.asset,
      from: this.wallet.publicKey.toBase58(),
      to: requirements.payTo,
      amount: requirements.amount,
      signature,
      timestamp: Date.now(),
      nonce: requirements.nonce || this.generateNonce(),
      memo: requirements.memo,
    };

    return {
      header: Buffer.from(JSON.stringify(payload)).toString('base64'),
      signature,
    };
  }

  private async refreshServices(): Promise<void> {
    try {
      const response = await axios.get(this.config.registryUrl);
      const services = response.data;

      this.services.clear();
      for (const service of services) {
        this.services.set(service.id || service.resource, service);
      }

      this.logger.info({
        event: 'services_refreshed',
        count: this.services.size,
      });
    } catch (error) {
      this.logger.error({
        event: 'service_refresh_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private recordLatency(latency: number): void {
    this.metrics.latencies.push(latency);
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies.shift();
    }
    const sum = this.metrics.latencies.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / this.metrics.latencies.length;
  }

  private startServiceRefresh(): void {
    this.refreshServices();
    setInterval(() => this.refreshServices(), this.config.serviceRefreshInterval);
  }

  private sanitizeToolName(resource: string): string {
    return resource
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase();
  }

  private generateNonce(): string {
    const crypto = globalThis.crypto || require('crypto').webcrypto;
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('hex');
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info({
      event: 'server_started',
      wallet: this.wallet.publicKey.toBase58(),
      network: this.config.network,
      facilitator: this.config.facilitatorUrl,
    });
  }
}

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('PRIVATE_KEY environment variable required');
  process.exit(1);
}

const config: MCPConfig = {
  privateKey: Buffer.from(privateKey.replace('0x', ''), 'hex'),
  network: (process.env.NETWORK as any) || 'devnet',
  facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.payai.network',
  registryUrl: process.env.REGISTRY_URL || 'http://localhost:3001/services/discover',
  serviceRefreshInterval: 60000,
};

const server = new SolanaMCPServer(config);
server.run().catch(console.error);
