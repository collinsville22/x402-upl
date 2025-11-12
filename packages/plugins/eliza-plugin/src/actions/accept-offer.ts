import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@ai16z/eliza';
import { Keypair } from '@solana/web3.js';
import axios from 'axios';
import { randomBytes } from 'crypto';

export const acceptOfferAction: Action = {
  name: 'ACCEPT_OFFER',
  similes: ['APPROVE_OFFER', 'CONFIRM_OFFER', 'ACCEPT_WORK'],
  description: 'Accept a buy offer and create a contract on the x402 marketplace',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const config = runtime.getSetting('X402_REGISTRY_URL');
    const wallet = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
    return !!config && !!wallet;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    const registryUrl = runtime.getSetting('X402_REGISTRY_URL');
    const walletKey = runtime.getSetting('X402_WALLET_PRIVATE_KEY');
    const autoAccept = runtime.getSetting('X402_AUTO_ACCEPT_OFFERS') === 'true';
    const minReputation = parseInt(runtime.getSetting('X402_MIN_REPUTATION_TO_ACCEPT') || '7000');

    const wallet = Keypair.fromSecretKey(
      Buffer.from(walletKey, 'base64')
    );

    const offerId = options?.offerId || state.offerId;

    if (!offerId) {
      const pendingResponse = await axios.get(`${registryUrl}/offers/pending`, {
        params: { sellerWallet: wallet.publicKey.toBase58() },
      });

      const pendingOffers = pendingResponse.data.offers || [];

      if (pendingOffers.length === 0) {
        await callback({
          text: 'No pending offers.',
          content: { offers: [] },
        });
        return;
      }

      if (!autoAccept) {
        const offerList = pendingOffers
          .map((o: any) => `- Offer ${o.id}: ${o.price} ${o.asset} from ${o.buyerWallet.slice(0, 8)}...`)
          .join('\n');

        await callback({
          text: `You have ${pendingOffers.length} pending offer(s):\n${offerList}\n\nTo accept, specify the offer ID.`,
          content: { offers: pendingOffers },
        });
        return;
      }

      const offerToAccept = pendingOffers[0];

      try {
        const buyerResponse = await axios.get(`${registryUrl}/agents/wallet/${offerToAccept.buyerWallet}`);
        const buyerReputation = buyerResponse.data.agent?.reputationScore || 0;

        if (buyerReputation < minReputation) {
          await callback({
            text: `Buyer reputation (${buyerReputation}) below minimum threshold (${minReputation}). Offer rejected.`,
            content: { offer: offerToAccept, reason: 'Low reputation' },
          });
          return;
        }

        const contractId = `contract_${Date.now()}_${randomBytes(4).toString('hex')}`;

        const contract = {
          id: contractId,
          offerId: offerToAccept.id,
          buyerWallet: offerToAccept.buyerWallet,
          sellerWallet: wallet.publicKey.toBase58(),
          serviceId: offerToAccept.serviceId,
          price: offerToAccept.price,
          asset: offerToAccept.asset,
          status: 'created',
          createdAt: Date.now(),
        };

        await axios.post(`${registryUrl}/contracts/create`, contract);
        await axios.patch(`${registryUrl}/offers/${offerToAccept.id}`, { status: 'accepted' });

        await callback({
          text: `Offer accepted. Contract ${contractId} created. Buyer must fund escrow before work begins.`,
          content: { contract },
        });
      } catch (error) {
        runtime.logger.error('Failed to accept offer:', error);
        await callback({
          text: 'Failed to accept offer.',
          content: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    } else {
      try {
        const offerResponse = await axios.get(`${registryUrl}/offers/${offerId}`);
        const offer = offerResponse.data.offer;

        if (!offer) {
          await callback({
            text: `Offer ${offerId} not found.`,
            content: { error: 'Offer not found' },
          });
          return;
        }

        if (offer.sellerWallet !== wallet.publicKey.toBase58()) {
          await callback({
            text: 'You are not the seller for this offer.',
            content: { error: 'Unauthorized' },
          });
          return;
        }

        const contractId = `contract_${Date.now()}_${randomBytes(4).toString('hex')}`;

        const contract = {
          id: contractId,
          offerId: offer.id,
          buyerWallet: offer.buyerWallet,
          sellerWallet: wallet.publicKey.toBase58(),
          serviceId: offer.serviceId,
          price: offer.price,
          asset: offer.asset,
          status: 'created',
          createdAt: Date.now(),
        };

        await axios.post(`${registryUrl}/contracts/create`, contract);
        await axios.patch(`${registryUrl}/offers/${offerId}`, { status: 'accepted' });

        await callback({
          text: `Offer ${offerId} accepted. Contract ${contractId} created.`,
          content: { contract },
        });
      } catch (error) {
        runtime.logger.error('Failed to accept offer:', error);
        await callback({
          text: 'Failed to accept offer.',
          content: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Check and accept pending offers' },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Checking offers...',
          action: 'ACCEPT_OFFER',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Offer accepted. Contract created. Buyer must fund escrow.',
        },
      },
    ],
  ],
};
