import { OldFaithfulProxy } from '../src/index.js';
import dotenv from 'dotenv';
dotenv.config();
async function main() {
    const config = {
        port: 3002,
        host: '0.0.0.0',
        oldFaithfulUrl: process.env.OLD_FAITHFUL_URL || 'http://localhost:8899',
        paymentRecipient: process.env.PAYMENT_RECIPIENT,
        tapRegistryUrl: process.env.TAP_REGISTRY_URL || 'http://localhost:8001',
        x402RegistryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:3001',
        solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        rateLimitPerMinute: 100,
        cacheTTL: 60000,
    };
    const proxy = new OldFaithfulProxy(config);
    await proxy.start();
    console.log('Old Faithful x402 Proxy initialized');
    console.log(`Listening on http://${config.host}:${config.port}`);
    console.log(`Payment recipient: ${config.paymentRecipient}`);
    console.log(`Upstream Old Faithful: ${config.oldFaithfulUrl}`);
    process.on('SIGINT', async () => {
        console.log('Shutting down...');
        await proxy.stop();
        process.exit(0);
    });
}
main().catch(console.error);
//# sourceMappingURL=basic-usage.js.map