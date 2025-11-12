"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const index_js_1 = require("../src/index.js");
async function main() {
    const wallet = web3_js_1.Keypair.generate();
    const agent = new index_js_1.TAPEnabledGradientAgent({
        parallax: {
            schedulerUrl: 'http://localhost:8080',
            model: 'llama-3-70b',
            minNodes: 3,
            maxWaitTime: 30000,
        },
        solana: {
            rpcUrl: 'https://api.devnet.solana.com',
            wallet,
            network: 'devnet',
        },
        x402: {
            registryUrl: 'http://localhost:3001',
            facilitatorUrl: 'http://localhost:4001',
            spendingLimitPerHour: 100,
        },
        agent: {
            name: 'Gradient AI Agent',
            systemPrompt: 'You are an autonomous AI agent powered by distributed Gradient Parallax inference.',
            maxIterations: 10,
            temperature: 0.7,
        },
        tap: {
            registryUrl: 'http://localhost:8001',
            name: 'Gradient AI Agent',
            domain: 'gradient-agent.x402.network',
            description: 'Distributed AI inference agent with Visa TAP authentication',
            contactEmail: 'admin@x402.network',
            algorithm: 'ed25519',
        },
        ownerDID: 'did:x402:owner:john-doe',
    });
    await agent.initialize();
    const tapIdentity = agent.getTAPIdentity();
    agent.on('tap:registered', (data) => {
        console.log('TAP Registration successful:');
        console.log('  Key ID:', data.keyId);
        console.log('  Algorithm:', data.algorithm);
        console.log('  Agent:', data.agentInfo?.name);
    });
    agent.on('tap:request:success', (data) => {
        console.log(`TAP request successful: ${data.url}`);
    });
    agent.on('tap:task:completed', (data) => {
        console.log(`Task completed with TAP: ${data.task}`);
    });
    const result = await agent.executeTaskWithTAP('Find the best AI model API for natural language processing and purchase 1000 credits');
    const privateKey = agent.exportTAPPrivateKey();
    console.log('\nSave this private key to reload agent later:');
    console.log(privateKey);
}
main().catch(console.error);
//# sourceMappingURL=tap-enabled-agent.js.map