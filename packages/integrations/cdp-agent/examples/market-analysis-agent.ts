import dotenv from 'dotenv';
import { DemandSideAgent } from '../src/demand-agent.js';
import { ToolMetadata } from '../src/tool-registry.js';

dotenv.config();

async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable required');
  }

  const agent = new DemandSideAgent({
    openaiApiKey,
    cdpNetwork: 'devnet',
    llmModel: 'gpt-4',
  });

  console.log('Initializing agent...');
  const address = await agent.initialize();
  console.log(`Agent address: ${address}`);

  const balance = await agent.getBalance();
  console.log(`Agent balance: ${balance / 1e9} SOL`);

  const priceOracle: ToolMetadata = {
    toolId: 'price-oracle',
    name: 'Price Oracle',
    description: 'Get current cryptocurrency prices from CoinGecko',
    costLamports: 1000,
    paymentAddress: 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo',
    parameters: {
      ids: {
        type: 'string',
        description: 'Cryptocurrency IDs',
        required: true,
      },
      vs_currencies: {
        type: 'string',
        description: 'Fiat currencies',
        required: true,
      },
    },
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    method: 'GET',
  };

  const sentimentAnalysis: ToolMetadata = {
    toolId: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze market sentiment for cryptocurrencies',
    costLamports: 2000,
    paymentAddress: 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo',
    parameters: {
      symbol: {
        type: 'string',
        description: 'Cryptocurrency symbol',
        required: true,
      },
    },
    endpoint: 'https://api.coingecko.com/api/v3/coins/markets',
    method: 'GET',
  };

  const technicalIndicators: ToolMetadata = {
    toolId: 'technical-indicators',
    name: 'Technical Indicators',
    description: 'Calculate technical indicators for trading',
    costLamports: 1500,
    paymentAddress: 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo',
    parameters: {
      symbol: {
        type: 'string',
        description: 'Trading pair symbol',
        required: true,
      },
      indicators: {
        type: 'string',
        description: 'Comma-separated list of indicators',
        required: true,
      },
    },
    endpoint: 'https://api.coingecko.com/api/v3/coins/solana/market_chart',
    method: 'GET',
  };

  console.log('\nRegistering tools...');
  agent.registerTool(priceOracle);
  agent.registerTool(sentimentAnalysis);
  agent.registerTool(technicalIndicators);

  console.log(`Registered ${agent.listAvailableTools().length} tools`);

  const task = {
    taskId: 'market-analysis-001',
    description: `Perform comprehensive market analysis for Solana:
    1. Get current SOL price
    2. Analyze market sentiment
    3. Calculate technical indicators
    4. Provide trading recommendation`,
    maxBudgetLamports: 50000,
  };

  console.log('\nExecuting task...');
  console.log(`Task: ${task.description}`);
  console.log(`Max budget: ${task.maxBudgetLamports / 1e9} SOL`);

  const report = await agent.executeTask(task);

  console.log('\n=== EXECUTION REPORT ===');
  console.log(`Task ID: ${report.task.taskId}`);
  console.log(`\nPlan:`);
  console.log(`  Steps: ${report.plan.steps.length}`);
  console.log(`  Estimated cost: ${report.plan.estimatedCost / 1e9} SOL`);
  console.log(`  Reasoning: ${report.plan.reasoning}`);

  console.log(`\nExecution:`);
  console.log(`  Success: ${report.execution.success}`);
  console.log(`  Total cost: ${report.execution.totalCost / 1e9} SOL`);
  console.log(`  Total time: ${report.execution.totalTime}ms`);

  console.log(`\nSteps executed:`);
  for (const step of report.execution.steps) {
    console.log(`  Step ${step.stepNumber}: ${step.toolId}`);
    console.log(`    Success: ${step.toolResult.success}`);
    console.log(`    Cost: ${step.cost / 1e9} SOL`);
    console.log(`    Time: ${step.toolResult.executionTime}ms`);
    if (step.payment) {
      console.log(`    Payment signature: ${step.payment.signature}`);
    }
  }

  console.log(`\nAnalysis:`);
  console.log(report.analysis);

  const finalBalance = await agent.getBalance();
  console.log(`\nFinal balance: ${finalBalance / 1e9} SOL`);
  console.log(`Spent: ${(balance - finalBalance) / 1e9} SOL`);

  await agent.close();
}

main().catch(console.error);
