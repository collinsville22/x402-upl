import { Keypair } from '@solana/web3.js';
import { X402ParallaxAgent } from '../src/index.js';
import * as fs from 'fs';

async function main() {
  const walletPath = process.env.X402_WALLET_PATH || './wallet.json';
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  const agent = new X402ParallaxAgent({
    parallax: {
      schedulerUrl: process.env.PARALLAX_SCHEDULER_URL || 'http://localhost:3001',
      model: 'Qwen/Qwen3-0.6B',
      nodes: [
        {
          nodeId: 'node-0',
          host: 'localhost',
          port: 3000,
        },
        {
          nodeId: 'node-1',
          host: 'localhost',
          port: 3001,
        },
      ],
      isLocalNetwork: true,
    },
    solana: {
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      wallet,
      usdcMint: process.env.USDC_MINT,
    },
    x402: {
      registryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:4000',
      spendingLimitPerHour: 200,
      reserveMinimum: 100,
    },
    agent: {
      name: 'economic-research-agent',
      systemPrompt: `You are an autonomous economic research agent with access to distributed AI inference and the x402 payment network.

Your capabilities:
- Use Parallax for distributed LLM inference
- Discover and purchase AI services from x402 network
- Make payments via Solana blockchain
- Optimize for cost-effective service selection
- Track spending and earnings

Always compare at least 3 services before making purchases. Optimize for value (reputation/price). Stay within spending limits.`,
      tools: [],
      maxIterations: 15,
      budget: 50,
      spendingLimitPerHour: 200,
    },
  });

  agent.on('cluster:operational', () => {
    console.log('Parallax cluster operational');
  });

  agent.on('task:started', (data) => {
    console.log('Task started:', data.task);
  });

  agent.on('iteration:start', (data) => {
    console.log(`Iteration ${data.iteration} started`);
  });

  agent.on('tool:executing', (data) => {
    console.log(`Executing tool: ${data.toolName}`);
  });

  agent.on('tool:executed', (data) => {
    console.log(`Tool ${data.toolName} completed:`, {
      success: data.success,
      cost: data.cost,
      latencyMs: data.latencyMs,
    });
  });

  agent.on('payment:success', (data) => {
    console.log('Payment successful:', {
      amount: data.amount,
      currency: data.currency,
      signature: data.signature,
    });
  });

  agent.on('discovery:success', (data) => {
    console.log(`Discovered ${data.count} services`);
  });

  agent.on('task:completed', (data) => {
    console.log('Task completed:', {
      answer: data.answer,
      totalCost: data.totalCost,
      iterations: data.iterations,
    });
  });

  console.log('Initializing agent...');
  await agent.initialize();

  console.log('Agent initialized successfully');

  const task = `Research the current state of decentralized AI inference networks.
  Find and compare at least 3 AI inference services from the x402 network.
  Analyze their pricing, reputation, and capabilities.
  Provide a summary of the best value options for distributed LLM inference.`;

  console.log('Executing task...');
  const result = await agent.run(task);

  if (result.success) {
    console.log('\n=== TASK RESULT ===');
    console.log('Answer:', result.answer);
    console.log('Total Cost:', result.totalCost, 'USDC');
    console.log('Iterations:', result.iterations);
  } else {
    console.error('Task failed:', result.error);
  }

  const balances = await agent.getWalletBalance();
  console.log('\n=== WALLET BALANCES ===');
  console.log('SOL:', balances.SOL);
  console.log('USDC:', balances.USDC);

  const economics = agent.getEconomicMetrics();
  console.log('\n=== ECONOMIC METRICS ===');
  console.log('Total Spent:', economics.totalSpent, 'USDC');
  console.log('Total Earned:', economics.totalEarned, 'USDC');
  console.log('Net Profit:', economics.netProfit, 'USDC');
  console.log('Transactions:', economics.transactionCount);
  console.log('Avg Cost/Inference:', economics.averageCostPerInference, 'USDC');

  await agent.shutdown();
  console.log('Agent shutdown complete');
}

main().catch(console.error);
