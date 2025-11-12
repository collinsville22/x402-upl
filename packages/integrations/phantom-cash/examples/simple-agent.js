import dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';
import { PhantomAgent } from '../src/phantom-agent.js';
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
    });
    console.log('Phantom Agent initialized');
    console.log(`Wallet: ${await agent.getWalletAddress()}`);
    console.log(`SOL Balance: ${await agent.getSolBalance()}`);
    console.log(`CASH Balance: ${await agent.getCashBalance()}`);
    const mockService = {
        serviceId: 'echo-service',
        name: 'Echo Service',
        description: 'Simple echo service for testing x402 payments',
        endpoint: 'https://httpbin.org/post',
        method: 'POST',
        costCash: 0.01,
        paymentAddress: await agent.getWalletAddress(),
        parameters: {
            message: {
                type: 'string',
                description: 'Message to echo',
                required: true,
            },
        },
        category: ['testing', 'demo'],
    };
    agent.registerService(mockService);
    console.log('\nRegistered services:');
    agent.listServices().forEach(service => {
        console.log(`  - ${service.name} (${service.costCash} CASH)`);
    });
    const task = {
        taskId: 'simple-001',
        description: 'Echo a test message using the echo service',
        maxBudget: 0.05,
    };
    console.log('\nExecuting task...');
    console.log(`Task: ${task.description}`);
    console.log(`Max budget: ${task.maxBudget} CASH`);
    const report = await agent.executeTask(task);
    console.log('\n=== EXECUTION REPORT ===');
    console.log(`Task ID: ${report.task.taskId}`);
    console.log(`Wallet: ${report.walletAddress}`);
    console.log(`\nBalance Change:`);
    console.log(`  Initial: ${report.initialBalance} CASH`);
    console.log(`  Final: ${report.finalBalance} CASH`);
    console.log(`  Spent: ${report.initialBalance - report.finalBalance} CASH`);
    console.log(`\nPlan:`);
    console.log(`  Steps: ${report.plan.steps.length}`);
    console.log(`  Estimated cost: ${report.plan.estimatedCost} CASH`);
    console.log(`\nExecution:`);
    console.log(`  Success: ${report.execution.success}`);
    console.log(`  Total cost: ${report.execution.totalCost} CASH`);
    console.log(`  Total time: ${report.execution.totalTime}ms`);
    console.log(`\nSteps:`);
    report.execution.steps.forEach(step => {
        console.log(`  Step ${step.stepNumber}: ${step.serviceId}`);
        console.log(`    Success: ${step.success}`);
        console.log(`    Cost: ${step.cost} CASH`);
        console.log(`    Time: ${step.executionTime}ms`);
    });
    console.log(`\nAnalysis:`);
    console.log(report.analysis);
    console.log(`\nPayment History:`);
    agent.getPaymentHistory().forEach(payment => {
        console.log(`  ${payment.signature}`);
        console.log(`    Amount: ${payment.amount} ${payment.currency}`);
        console.log(`    Time: ${new Date(payment.timestamp).toISOString()}`);
    });
}
main().catch(console.error);
//# sourceMappingURL=simple-agent.js.map