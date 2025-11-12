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
  });

  const address = await agent.initialize();
  console.log(`Agent initialized at: ${address}`);

  const balance = await agent.getBalance();
  console.log(`Balance: ${balance / 1e9} SOL`);

  const mockTool: ToolMetadata = {
    toolId: 'echo-service',
    name: 'Echo Service',
    description: 'Simple echo service for testing',
    costLamports: 500,
    paymentAddress: 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo',
    parameters: {
      message: {
        type: 'string',
        description: 'Message to echo',
        required: true,
      },
    },
    endpoint: 'https://httpbin.org/post',
    method: 'POST',
  };

  agent.registerTool(mockTool);

  const task = {
    taskId: 'simple-001',
    description: 'Echo a test message using the echo service',
    maxBudgetLamports: 10000,
  };

  const report = await agent.executeTask(task);

  console.log('\nExecution Report:');
  console.log(`Success: ${report.execution.success}`);
  console.log(`Total Cost: ${report.execution.totalCost / 1e9} SOL`);
  console.log(`Steps: ${report.execution.steps.length}`);

  await agent.close();
}

main().catch(console.error);
