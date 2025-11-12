import { Plugin } from '@ai16z/eliza';
import { advertiseServiceAction } from './actions/advertise-service.js';
import { discoverServicesAction } from './actions/discover-services.js';
import { makeOfferAction } from './actions/make-offer.js';
import { acceptOfferAction } from './actions/accept-offer.js';
import { executeContractAction } from './actions/execute-contract.js';

export const x402Plugin: Plugin = {
  name: 'x402',
  description: 'x402 autonomous agent marketplace with on-chain reputation and escrow',
  actions: [
    advertiseServiceAction,
    discoverServicesAction,
    makeOfferAction,
    acceptOfferAction,
    executeContractAction,
  ],
  evaluators: [],
  providers: [],
};

export default x402Plugin;

export * from './types.js';
export * from './actions/advertise-service.js';
export * from './actions/discover-services.js';
export * from './actions/make-offer.js';
export * from './actions/accept-offer.js';
export * from './actions/execute-contract.js';
