import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { WorkflowManager } from '../core/workflow-manager.js';
import {
  CreateWorkflowRequestSchema,
  WorkflowEvent,
} from '../types/workflow.js';
import { Keypair, PublicKey } from '@solana/web3.js';
import pino from 'pino';

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: pino({
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    }),
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(websocket);

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable required');
  }

  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable required');
  }

  if (!process.env.ESCROW_KEYPAIR) {
    throw new Error('ESCROW_KEYPAIR environment variable required');
  }

  const escrowKeypair = Keypair.fromSecretKey(
    Buffer.from(process.env.ESCROW_KEYPAIR, 'base64')
  );

  const workflowManager = new WorkflowManager({
    redisUrl: process.env.REDIS_URL,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    registryUrl: process.env.REGISTRY_URL || 'http://localhost:3001',
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    network: (process.env.NETWORK as any) || 'devnet',
    escrowKeypair,
  });

  fastify.decorate('workflowManager', workflowManager);

  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    };
  });

  fastify.post('/workflows/create', async (request, reply) => {
    try {
      const data = CreateWorkflowRequestSchema.parse(request.body);

      const workflow = await workflowManager.createWorkflow(data);

      return reply.code(201).send({
        success: true,
        workflow: {
          id: workflow.id,
          status: workflow.status,
          createdAt: workflow.createdAt,
        },
      });
    } catch (error) {
      fastify.log.error(error);

      if (error instanceof Error && 'issues' in error) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error,
        });
      }

      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/workflows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const workflow = await workflowManager.getWorkflow(id);

    if (!workflow) {
      return reply.code(404).send({
        success: false,
        error: 'Workflow not found',
      });
    }

    return {
      success: true,
      workflow,
    };
  });

  fastify.post('/workflows/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await workflowManager.approveWorkflow(id);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.message,
        });
      }

      return {
        success: true,
        message: 'Workflow approved and execution started',
      };
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/workflows/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };

    const success = await workflowManager.cancelWorkflow(id);

    if (!success) {
      return reply.code(400).send({
        success: false,
        error: 'Cannot cancel workflow',
      });
    }

    return {
      success: true,
      message: 'Workflow cancelled',
    };
  });

  fastify.get('/workflows/:id/steps', async (request, reply) => {
    const { id } = request.params as { id: string };

    const workflow = await workflowManager.getWorkflow(id);

    if (!workflow) {
      return reply.code(404).send({
        success: false,
        error: 'Workflow not found',
      });
    }

    return {
      success: true,
      steps: workflow.executionPlan?.steps || [],
      stepResults: workflow.stepResults || {},
    };
  });

  fastify.get('/users/:userId/workflows', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { limit } = request.query as { limit?: string };

    const workflows = await workflowManager.getUserWorkflows(
      userId,
      limit ? parseInt(limit) : 50
    );

    return {
      success: true,
      workflows,
      total: workflows.length,
    };
  });

  fastify.get('/escrow/address', async (request, reply) => {
    const escrowManager = workflowManager.getEscrowManager();
    const address = escrowManager.getEscrowPublicKey().toBase58();

    return {
      success: true,
      address,
      network: process.env.NETWORK || 'devnet',
    };
  });

  fastify.post('/escrow/:userId/create', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { userWallet } = request.body as { userWallet: string };

    if (!userWallet) {
      return reply.code(400).send({
        success: false,
        error: 'userWallet required',
      });
    }

    try {
      const escrowManager = workflowManager.getEscrowManager();
      const escrow = await escrowManager.createUserEscrow(userId, userWallet);

      return {
        success: true,
        escrow,
      };
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/escrow/:userId/deposit', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { amount, signature } = request.body as { amount: number; signature: string };

    if (!amount || !signature) {
      return reply.code(400).send({
        success: false,
        error: 'amount and signature required',
      });
    }

    try {
      const escrowManager = workflowManager.getEscrowManager();
      const escrow = await escrowManager.depositFunds(userId, amount, signature);

      return {
        success: true,
        escrow,
        message: 'Deposit confirmed',
      };
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/escrow/:userId/balance', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    try {
      const escrowManager = workflowManager.getEscrowManager();
      const balance = await escrowManager.getBalance(userId);

      return {
        success: true,
        balance,
      };
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/escrow/:userId/history', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { limit } = request.query as { limit?: string };

    try {
      const escrowManager = workflowManager.getEscrowManager();
      const history = await escrowManager.getUserHistory(
        userId,
        limit ? parseInt(limit) : 50
      );

      return {
        success: true,
        history,
        total: history.length,
      };
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/escrow/:userId/withdraw', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { amount, destination } = request.body as { amount: number; destination: string };

    if (!amount || !destination) {
      return reply.code(400).send({
        success: false,
        error: 'amount and destination required',
      });
    }

    try {
      const escrowManager = workflowManager.getEscrowManager();
      const signature = await escrowManager.withdrawFunds(
        userId,
        amount,
        new PublicKey(destination)
      );

      return {
        success: true,
        signature,
        message: 'Withdrawal successful',
      };
    } catch (error) {
      fastify.log.error(error);

      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/workflows/:id/stream', { websocket: true }, async (connection, req) => {
    const { id } = req.params as { id: string };

    const workflow = await workflowManager.getWorkflow(id);

    if (!workflow) {
      connection.socket.send(
        JSON.stringify({
          error: 'Workflow not found',
        })
      );
      connection.socket.close();
      return;
    }

    connection.socket.send(
      JSON.stringify({
        type: 'connected',
        workflowId: id,
      })
    );

    await workflowManager.subscribeToWorkflow(id, (event: WorkflowEvent) => {
      try {
        connection.socket.send(JSON.stringify(event));
      } catch (error) {
        fastify.log.error('Failed to send event to WebSocket:', error);
      }
    });

    connection.socket.on('close', () => {
      fastify.log.info(`WebSocket closed for workflow ${id}`);
    });
  });

  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);

    return reply.status(500).send({
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  });

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();

    await fastify.listen({ port: PORT, host: HOST });

    fastify.log.info(`Server running on http://${HOST}:${PORT}`);
    fastify.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    fastify.log.info(`Network: ${process.env.NETWORK || 'devnet'}`);

    process.on('SIGTERM', async () => {
      await fastify.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await fastify.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

declare module 'fastify' {
  interface FastifyInstance {
    workflowManager: WorkflowManager;
  }
}
