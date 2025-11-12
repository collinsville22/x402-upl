import { Keypair } from '@solana/web3.js';
import { TAPClient } from '../tap-client.js';
export const advertiseServiceAction = {
    name: 'ADVERTISE_SERVICE',
    similes: ['REGISTER_SERVICE', 'OFFER_SERVICE', 'PUBLISH_SERVICE'],
    description: 'Register and advertise a service on the x402 marketplace with TAP authentication and on-chain reputation',
    validate: async (runtime, message) => {
        const config = runtime.getSetting('X402_REGISTRY_URL');
        const wallet = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
        return !!config && !!wallet;
    },
    handler: async (runtime, message, state, options, callback) => {
        const registryUrl = runtime.getSetting('X402_REGISTRY_URL');
        const walletKey = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
        const network = runtime.getSetting('X402_NETWORK') || 'devnet';
        const tapClient = new TAPClient(runtime);
        const wallet = Keypair.fromSecretKey(Buffer.from(walletKey, 'base64'));
        const services = runtime.getSetting('X402_SERVICES');
        if (!services || services.length === 0) {
            await callback({
                text: 'No services configured. Add services to your character configuration.',
                content: { error: 'No services configured' },
            });
            return;
        }
        const results = [];
        for (const service of services) {
            try {
                const response = await tapClient.request('POST', `${registryUrl}/services/register`, {
                    name: service.name || `${runtime.character.name} - ${service.actionName}`,
                    description: service.description,
                    category: service.category || 'ai-services',
                    url: service.url || `http://localhost:${runtime.getSetting('PORT') || 3000}`,
                    pricePerCall: service.price,
                    acceptedTokens: [service.asset],
                    capabilities: service.capabilities || [],
                    ownerWalletAddress: wallet.publicKey.toBase58(),
                    network,
                });
                results.push({
                    serviceId: response.serviceId,
                    name: service.name,
                    url: response.data.url,
                    price: service.price,
                });
                runtime.logger.info(`Service registered: ${service.name}`);
            }
            catch (error) {
                runtime.logger.error(`Failed to register service ${service.name}:`, error);
                results.push({
                    name: service.name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        const successCount = results.filter(r => !r.error).length;
        const text = successCount > 0
            ? `Successfully registered ${successCount} service${successCount > 1 ? 's' : ''} on x402 marketplace. Wallet: ${wallet.publicKey.toBase58()}`
            : 'Failed to register services. Check configuration.';
        await callback({
            text,
            content: { services: results },
        });
    },
    examples: [
        [
            {
                user: '{{user1}}',
                content: { text: 'Advertise your services on the marketplace' },
            },
            {
                user: '{{agent}}',
                content: {
                    text: 'Registering services on x402 marketplace...',
                    action: 'ADVERTISE_SERVICE',
                },
            },
            {
                user: '{{agent}}',
                content: {
                    text: 'Successfully registered 3 services on x402 marketplace. Wallet: ABC123...',
                },
            },
        ],
    ],
};
//# sourceMappingURL=advertise-service.js.map