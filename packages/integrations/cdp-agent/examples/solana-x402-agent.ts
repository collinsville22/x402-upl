import dotenv from 'dotenv';
import { DemandSideAgent } from '../src/demand-agent.js';
import { ToolMetadata } from '../src/tool-registry.js';

dotenv.config();

async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable required');
  }

  console.log('Initializing demand-side agent with CDP Solana wallets...');

  const agent = new DemandSideAgent({
    openaiApiKey,
    cdpNetwork: 'devnet',
    llmModel: 'gpt-4',
  });

  const address = await agent.initialize();
  console.log(`Agent wallet created: ${address}`);

  const balance = await agent.getBalance();
  console.log(`Initial balance: ${balance / 1e9} SOL\n`);

  const tools: ToolMetadata[] = [
    {
      toolId: 'weather-api',
      name: 'Weather Service',
      description: 'Get current weather data for any location',
      costLamports: 1000,
      paymentAddress: 'WeatherServicePubkey1111111111111111111111',
      parameters: {
        location: {
          type: 'string',
          description: 'City name or coordinates',
          required: true,
        },
      },
      endpoint: 'https://api.x402.example/weather',
      method: 'GET',
    },
    {
      toolId: 'data-analysis',
      name: 'Data Analysis Tool',
      description: 'Analyze and summarize data',
      costLamports: 2500,
      paymentAddress: 'AnalysisServicePubkey1111111111111111111111',
      parameters: {
        data: {
          type: 'object',
          description: 'Data to analyze',
          required: true,
        },
      },
      endpoint: 'https://api.x402.example/analyze',
      method: 'POST',
    },
    {
      toolId: 'translation',
      name: 'Translation Service',
      description: 'Translate text between languages',
      costLamports: 500,
      paymentAddress: 'TranslateServicePubkey111111111111111111111',
      parameters: {
        text: {
          type: 'string',
          description: 'Text to translate',
          required: true,
        },
        targetLang: {
          type: 'string',
          description: 'Target language code',
          required: true,
        },
      },
      endpoint: 'https://api.x402.example/translate',
      method: 'POST',
    },
  ];

  tools.forEach(tool => agent.registerTool(tool));

  console.log(`Registered ${tools.length} x402 tools\n`);

  const discoveredTools = await agent.discoverTools('weather');
  console.log(`Discovered ${discoveredTools.length} tools matching 'weather'\n`);

  const task = {
    taskId: 'complex-task-001',
    description: 'Get weather for San Francisco, analyze the data, and translate the summary to Spanish',
    maxBudgetLamports: 50000,
  };

  console.log('Executing complex task:');
  console.log(`Task: ${task.description}`);
  console.log(`Budget: ${task.maxBudgetLamports / 1e9} SOL\n`);

  const report = await agent.executeTask(task);

  console.log('\n=== EXECUTION REPORT ===\n');
  console.log(`Success: ${report.execution.success}`);
  console.log(`Total cost: ${report.execution.totalCost / 1e9} SOL`);
  console.log(`Payments made: ${report.execution.paymentsExecuted}`);
  console.log(`Total time: ${report.execution.totalTimeMs}ms`);

  if (report.execution.error) {
    console.log(`Error: ${report.execution.error}`);
  }

  console.log('\n=== EXECUTION STEPS ===\n');
  report.execution.steps.forEach(step => {
    console.log(`Step ${step.stepNumber}: ${step.toolName}`);
    console.log(`  Status: ${step.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Cost: ${step.costLamports / 1e9} SOL`);
    console.log(`  Time: ${step.executionTimeMs}ms`);

    if (step.paymentTxSignature) {
      console.log(`  Payment TX: ${step.paymentTxSignature}`);
    }

    if (step.error) {
      console.log(`  Error: ${step.error}`);
    }

    console.log('');
  });

  console.log('\n=== TOOL CHAIN PLAN ===\n');
  console.log(`Total steps: ${report.plan.steps.length}`);
  console.log(`Estimated cost: ${report.plan.totalCostLamports / 1e9} SOL`);
  console.log(`Tools used: ${report.plan.steps.map(s => s.toolName).join(' -> ')}\n`);

  console.log('\n=== AGENT ANALYSIS ===\n');
  console.log(report.analysis);

  const finalBalance = await agent.getBalance();
  const spent = (balance - finalBalance) / 1e9;

  console.log('\n=== FINAL STATUS ===\n');
  console.log(`Starting balance: ${balance / 1e9} SOL`);
  console.log(`Final balance: ${finalBalance / 1e9} SOL`);
  console.log(`Total spent: ${spent} SOL`);
  console.log(`Budget utilization: ${((spent / (task.maxBudgetLamports / 1e9)) * 100).toFixed(2)}%`);

  await agent.close();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
