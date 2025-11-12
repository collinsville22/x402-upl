import { Keypair } from '@solana/web3.js';
import { TAPPhantomAgent } from '../src/index.js';
async function main() {
    const wallet = Keypair.generate();
    const agent = new TAPPhantomAgent({
        wallet,
        openaiApiKey: process.env.OPENAI_API_KEY || 'your-api-key',
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        spendingLimitPerHour: 100,
        llmModel: 'gpt-4',
        tap: {
            registryUrl: 'http://localhost:8001',
            name: 'Phantom CASH Shopping Agent',
            domain: 'phantom-agent.x402.network',
            description: 'Autonomous AI shopping agent with Phantom CASH payments and Visa TAP authentication',
            contactEmail: 'admin@x402.network',
            algorithm: 'ed25519',
        },
        ownerDID: 'did:x402:owner:alice',
    });
    await agent.initialize();
    const tapIdentity = agent.getTAPIdentity();
    const result = await agent.executeTaskWithTAP('Find the best AI API service for natural language processing, compare prices, and purchase 1000 API credits');
    const privateKey = agent.exportTAPPrivateKey();
}
main().catch(console.error);
//# sourceMappingURL=tap-enabled-agent.js.map