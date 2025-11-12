import { TAPCDPAgent } from '../src/tap-cdp-agent.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const agent = new TAPCDPAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    cdpNetwork: 'devnet',
    llmModel: 'gpt-4',
    tap: {
      registryUrl: process.env.TAP_REGISTRY_URL || 'http://localhost:8001',
      name: 'CDP Demand Agent',
      domain: 'cdp-demand.x402.local',
      description: 'Autonomous CDP-based demand-side agent with TAP authentication',
      contactEmail: 'agent@cdp-demand.x402.local',
      algorithm: 'ed25519',
    },
    x402: {
      registryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:3001',
    },
    ownerDID: 'did:x402:cdp-demand-agent',
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  });

  const address = await agent.initialize();
  console.log(`CDP Account: ${address}`);

  const tapIdentity = agent.getTAPIdentity();
  if (tapIdentity) {
    console.log(`TAP Key ID: ${tapIdentity.keyId}`);
    console.log(`Algorithm: ${tapIdentity.algorithm}`);
  }

  try {
    const services = await agent.discoverX402Services({
      category: 'ai-inference',
      maxPrice: 1.0,
      limit: 5,
    });

    console.log(`Discovered ${services.length} services`);
    services.forEach((service: any, index: number) => {
      console.log(`${index + 1}. ${service.name} - ${service.pricePerCall} SOL/call`);
      console.log(`   ${service.description}`);
      console.log(`   Reputation: ${service.reputation}/10000`);
    });
  } catch (error) {
    console.log('Registry unavailable, using local tools');
  }

  const tools = agent.listAvailableTools();
  console.log(`Available tools: ${tools.length}`);

  const task = {
    taskId: 'tap-market-analysis-001',
    description: 'Get current SOL price and analyze market sentiment',
    maxBudgetLamports: 50_000_000,
  };

  try {
    const report = await agent.executeTaskWithTAP(task);

    console.log('Task completed');
    console.log(`Steps: ${report.execution.steps.length}`);
    console.log(`Cost: ${report.execution.totalCost / 1_000_000_000} SOL`);
    console.log(`Time: ${report.execution.totalTime}ms`);
    console.log(`Success: ${report.execution.successfulSteps}/${report.execution.steps.length}`);
    console.log('\nAnalysis:');
    console.log(report.analysis);

    const payments = agent.getPaymentHistory();
    console.log('\nPayments:');
    payments.forEach((payment: any) => {
      console.log(`${payment.description}: ${payment.amountLamports / 1_000_000_000} SOL`);
      console.log(`Signature: ${payment.signature.slice(0, 20)}...`);
    });
  } catch (error) {
    console.error('Task failed:', error);
  }

  try {
    const result = await agent.callServiceWithTAP(
      'http://localhost:3000/api/price-oracle',
      {
        method: 'POST',
        data: { symbol: 'SOL', currency: 'USD' },
        tag: 'agent-payer-auth',
      }
    );

    console.log('Service call successful');
    console.log('Response:', result);
  } catch (error) {
    console.log('Service unavailable');
  }
}

main().catch(console.error);
