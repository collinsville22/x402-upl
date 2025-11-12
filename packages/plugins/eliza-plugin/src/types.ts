import { z } from 'zod';

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  url: z.string().url(),
  pricePerCall: z.number(),
  acceptedTokens: z.array(z.string()),
  reputationScore: z.number(),
  verified: z.boolean(),
  ownerWallet: z.string(),
});

export type Service = z.infer<typeof ServiceSchema>;

export const ServiceOfferingSchema = z.object({
  serviceId: z.string(),
  actionName: z.string(),
  price: z.number(),
  asset: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()).optional(),
  minReputation: z.number().optional(),
});

export type ServiceOffering = z.infer<typeof ServiceOfferingSchema>;

export const BuyOfferSchema = z.object({
  id: z.string(),
  buyerWallet: z.string(),
  sellerWallet: z.string(),
  serviceId: z.string(),
  price: z.number(),
  asset: z.string(),
  params: z.record(z.unknown()),
  timestamp: z.number(),
  status: z.enum(['pending', 'accepted', 'rejected', 'completed', 'cancelled']),
});

export type BuyOffer = z.infer<typeof BuyOfferSchema>;

export const ContractSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  buyerWallet: z.string(),
  sellerWallet: z.string(),
  serviceId: z.string(),
  price: z.number(),
  asset: z.string(),
  escrowSignature: z.string().optional(),
  deliverySignature: z.string().optional(),
  status: z.enum(['created', 'funded', 'in_progress', 'delivered', 'completed', 'disputed']),
  createdAt: z.number(),
  completedAt: z.number().optional(),
});

export type Contract = z.infer<typeof ContractSchema>;

export interface X402PluginConfig {
  registryUrl: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl: string;
  walletPrivateKey: string;
  services?: ServiceOffering[];
  autoAcceptOffers?: boolean;
  minReputationToAccept?: number;
}
