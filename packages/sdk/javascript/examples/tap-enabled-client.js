"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const index_js_1 = require("../src/index.js");
async function main() {
    const wallet = web3_js_1.Keypair.generate();
    const { privateKey, publicKey } = index_js_1.RFC9421Signature.generateEd25519KeyPair();
    const client = new index_js_1.X402Client({
        network: 'devnet',
        wallet,
        registryApiUrl: 'https://registry.x402.network',
        enableTAP: true,
        tapConfig: {
            keyId: wallet.publicKey.toBase58(),
            privateKey,
            algorithm: 'ed25519',
            registryUrl: 'https://registry.x402.network',
            did: `did:x402:${wallet.publicKey.toBase58().substring(0, 8)}`,
            visaTapCert: `cert_${wallet.publicKey.toBase58().substring(0, 8)}`,
        },
        agentIdentity: {
            did: `did:x402:${wallet.publicKey.toBase58().substring(0, 8)}`,
            visaTapCert: `cert_${wallet.publicKey.toBase58().substring(0, 8)}`,
            walletAddress: wallet.publicKey.toBase58(),
        },
        preferredTokens: ['CASH', 'USDC', 'SOL'],
    });
    const agentIdentity = await client.registerAgent(1.0);
    console.log('Agent registered:', agentIdentity);
    const services = await client.discover({
        category: 'AI & ML',
        maxPrice: 0.1,
        minUptime: 95,
    });
    console.log(`Found ${services.length} services`);
    if (services.length > 0) {
        const service = services[0];
        console.log(`Calling service: ${service.name} at ${service.url}`);
        const result = await client.post(service.url, {
            query: 'Test query with TAP authentication',
        });
        console.log('Service response:', result);
    }
    const agents = await client.discoverAgents({
        minReputation: 7000,
        verified: true,
    });
    console.log(`Found ${agents.length} trusted agents`);
    console.log('Current agent identity:', client.getAgentIdentity());
}
main().catch(console.error);
//# sourceMappingURL=tap-enabled-client.js.map