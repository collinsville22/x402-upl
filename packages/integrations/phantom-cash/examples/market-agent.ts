import dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';
import { PhantomAgent } from '../src/phantom-agent.js';
import { X402Service } from '../src/service-registry.js';
import fs from 'fs';

dotenv.config();

async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const walletPath = process.env.WALLET_PATH || './wallet.json';

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable required');
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  const agent = new PhantomAgent({
    wallet,
    openaiApiKey,
    network: 'mainnet-beta',
    llmModel: 'gpt-4',
  });

  console.log('Market Analysis Agent initialized');
  console.log(`Wallet: ${await agent.getWalletAddress()}`);
  console.log(`CASH Balance: ${await agent.getCashBalance()}`);

  const agentWallet = await agent.getWalletAddress();

  const priceOracle: X402Service = {
    serviceId: 'price-oracle',
    name: 'Price Oracle',
    description: 'Get real-time cryptocurrency prices',
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    method: 'GET',
    costCash: 0.01,
    paymentAddress: agentWallet,
    parameters: {
      ids: {
        type: 'string',
        description: 'Cryptocurrency IDs (comma-separated)',
        required: true,
      },
      vs_currencies: {
        type: 'string',
        description: 'Fiat currencies (comma-separated)',
        required: true,
      },
    },
    category: ['price', 'data', 'market'],
  };

  const sentimentAnalysis: X402Service = {
    serviceId: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze cryptocurrency market sentiment',
    endpoint: 'https://api.coingecko.com/api/v3/coins/markets',
    method: 'GET',
    costCash: 0.02,
    paymentAddress: agentWallet,
    parameters: {
      vs_currency: {
        type: 'string',
        description: 'Fiat currency',
        required: true,
      },
      ids: {
        type: 'string',
        description: 'Cryptocurrency IDs',
        required: true,
      },
    },
    category: ['sentiment', 'analysis', 'market'],
  };

  const technicalIndicators: X402Service = {
    serviceId: 'technical-indicators',
    name: 'Technical Indicators',
    description: 'Calculate technical indicators for crypto',
    endpoint: 'https://api.coingecko.com/api/v3/coins/solana/market_chart',
    method: 'GET',
    costCash: 0.015,
    paymentAddress: agentWallet,
    parameters: {
      vs_currency: {
        type: 'string',
        description: 'Fiat currency',
        required: true,
      },
      days: {
        type: 'number',
        description: 'Number of days',
        required: true,
      },
    },
    category: ['technical', 'indicators', 'market'],
  };

  agent.registerService(priceOracle);
  agent.registerService(sentimentAnalysis);
  agent.registerService(technicalIndicators);

  console.log(`\nRegistered ${agent.listServices().length} services`);

  const task = {
    taskId: 'market-analysis-001',
    description: `Perform comprehensive market analysis for Solana:
    1. Get current SOL price
    2. Analyze market sentiment
    3. Calculate technical indicators
    4. Provide trading recommendation`,
    maxBudget: 0.10,
  };

  console.log('\nExecuting market analysis task...');
  console.log(`Max budget: ${task.maxBudget} CASH`);

  const report = await agent.executeTask(task);

  console.log('\n=== MARKET ANALYSIS REPORT ===');
  console.log(`Task ID: ${report.task.taskId}`);

  console.log(`\nBalance Summary:`);
  console.log(`  Initial: ${report.initialBalance.toFixed(6)} CASH`);
  console.log(`  Final: ${report.finalBalance.toFixed(6)} CASH`);
  console.log(`  Spent: ${(report.initialBalance - report.finalBalance).toFixed(6)} CASH`);

  console.log(`\nExecution Plan:`);
  console.log(`  Total steps: ${report.plan.steps.length}`);
  console.log(`  Estimated cost: ${report.plan.estimatedCost.toFixed(6)} CASH`);
  console.log(`  Reasoning: ${report.plan.reasoning}`);

  console.log(`\nSteps Executed:`);
  report.execution.steps.forEach(step => {
    console.log(`\n  Step ${step.stepNumber}: ${step.serviceId}`);
    console.log(`    Success: ${step.success}`);
    console.log(`    Cost: ${step.cost.toFixed(6)} CASH`);
    console.log(`    Time: ${step.executionTime}ms`);
    if (step.data) {
      console.log(`    Data: ${JSON.stringify(step.data).substring(0, 100)}...`);
    }
  });

  console.log(`\nExecution Summary:`);
  console.log(`  Success: ${report.execution.success}`);
  console.log(`  Actual cost: ${report.execution.totalCost.toFixed(6)} CASH`);
  console.log(`  Total time: ${report.execution.totalTime}ms`);
  console.log(`  Cost efficiency: ${((report.plan.estimatedCost / report.execution.totalCost) * 100).toFixed(1)}%`);

  console.log(`\nAgent Analysis:`);
  console.log(report.analysis);

  console.log(`\nPayment History:`);
  const history = agent.getPaymentHistory();
  console.log(`  Total payments: ${history.length}`);
  console.log(`  Total spent: ${agent.getTotalSpent().toFixed(6)} CASH`);

  history.forEach(payment => {
    console.log(`\n  Payment ${payment.signature.substring(0, 20)}...`);
    console.log(`    Amount: ${payment.amount.toFixed(6)} ${payment.currency}`);
    console.log(`    Time: ${new Date(payment.timestamp).toISOString()}`);
  });
}

main().catch(console.error);
