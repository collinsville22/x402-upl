import { Keypair } from '@solana/web3.js';
import axios from 'axios';
import { randomBytes } from 'crypto';
export const makeOfferAction = {
    name: 'MAKE_OFFER',
    similes: ['CREATE_OFFER', 'BUY_SERVICE', 'HIRE_AGENT'],
    description: 'Create a buy offer for a service on the x402 marketplace',
    validate: async (runtime, message) => {
        const config = runtime.getSetting('X402_REGISTRY_URL');
        const wallet = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
        return !!config && !!wallet;
    },
    handler: async (runtime, message, state, options, callback) => {
        const registryUrl = runtime.getSetting('X402_REGISTRY_URL');
        const walletKey = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
        const wallet = Keypair.fromSecretKey(Buffer.from(walletKey, 'base64'));
        const serviceId = options?.serviceId || state.serviceId;
        const params = options?.params || state.params || {};
        if (!serviceId) {
            await callback({
                text: 'Service ID required. First discover services using DISCOVER_SERVICES.',
                content: { error: 'Missing serviceId' },
            });
            return;
        }
        try {
            const serviceResponse = await axios.get(`${registryUrl}/services/${serviceId}`);
            const service = serviceResponse.data.service;
            if (!service) {
                await callback({
                    text: `Service ${serviceId} not found.`,
                    content: { error: 'Service not found' },
                });
                return;
            }
            const offerId = `offer_${Date.now()}_${randomBytes(4).toString('hex')}`;
            const offer = {
                id: offerId,
                buyerWallet: wallet.publicKey.toBase58(),
                sellerWallet: service.ownerWalletAddress,
                serviceId: service.id,
                price: service.pricePerCall,
                asset: service.acceptedTokens[0] || 'SOL',
                params,
                timestamp: Date.now(),
                status: 'pending',
            };
            const response = await axios.post(`${registryUrl}/offers/create`, offer);
            await callback({
                text: `Offer created for ${service.name}. Price: ${service.pricePerCall} ${offer.asset}. Offer ID: ${offerId}. Waiting for seller acceptance.`,
                content: {
                    offer: response.data.offer,
                    service: {
                        id: service.id,
                        name: service.name,
                        seller: service.ownerWalletAddress,
                    },
                },
            });
        }
        catch (error) {
            runtime.logger.error('Failed to create offer:', error);
            await callback({
                text: 'Failed to create offer. Check service availability.',
                content: { error: error instanceof Error ? error.message : 'Unknown error' },
            });
        }
    },
    examples: [
        [
            {
                user: '{{user1}}',
                content: { text: 'Make an offer to hire the data analysis agent' },
            },
            {
                user: '{{agent}}',
                content: {
                    text: 'Creating offer...',
                    action: 'MAKE_OFFER',
                },
            },
            {
                user: '{{agent}}',
                content: {
                    text: 'Offer created for Data Analysis Agent. Price: 0.5 SOL. Waiting for acceptance.',
                },
            },
        ],
    ],
};
//# sourceMappingURL=make-offer.js.map