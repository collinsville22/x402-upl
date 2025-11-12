import { z } from 'zod';
export declare const ServiceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    url: z.ZodString;
    pricePerCall: z.ZodNumber;
    acceptedTokens: z.ZodArray<z.ZodString, "many">;
    reputationScore: z.ZodNumber;
    verified: z.ZodBoolean;
    ownerWallet: z.ZodString;
}, "strip", z.ZodTypeAny, {
    pricePerCall: number;
    acceptedTokens: string[];
    description: string;
    name: string;
    category: string;
    id: string;
    url: string;
    verified: boolean;
    reputationScore: number;
    ownerWallet: string;
}, {
    pricePerCall: number;
    acceptedTokens: string[];
    description: string;
    name: string;
    category: string;
    id: string;
    url: string;
    verified: boolean;
    reputationScore: number;
    ownerWallet: string;
}>;
export type Service = z.infer<typeof ServiceSchema>;
export declare const ServiceOfferingSchema: z.ZodObject<{
    serviceId: z.ZodString;
    actionName: z.ZodString;
    price: z.ZodNumber;
    asset: z.ZodString;
    description: z.ZodString;
    capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    minReputation: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    asset: string;
    description: string;
    price: number;
    serviceId: string;
    actionName: string;
    capabilities?: string[] | undefined;
    minReputation?: number | undefined;
}, {
    asset: string;
    description: string;
    price: number;
    serviceId: string;
    actionName: string;
    capabilities?: string[] | undefined;
    minReputation?: number | undefined;
}>;
export type ServiceOffering = z.infer<typeof ServiceOfferingSchema>;
export declare const BuyOfferSchema: z.ZodObject<{
    id: z.ZodString;
    buyerWallet: z.ZodString;
    sellerWallet: z.ZodString;
    serviceId: z.ZodString;
    price: z.ZodNumber;
    asset: z.ZodString;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    timestamp: z.ZodNumber;
    status: z.ZodEnum<["pending", "accepted", "rejected", "completed", "cancelled"]>;
}, "strip", z.ZodTypeAny, {
    asset: string;
    price: number;
    status: "pending" | "completed" | "cancelled" | "accepted" | "rejected";
    id: string;
    serviceId: string;
    timestamp: number;
    params: Record<string, unknown>;
    buyerWallet: string;
    sellerWallet: string;
}, {
    asset: string;
    price: number;
    status: "pending" | "completed" | "cancelled" | "accepted" | "rejected";
    id: string;
    serviceId: string;
    timestamp: number;
    params: Record<string, unknown>;
    buyerWallet: string;
    sellerWallet: string;
}>;
export type BuyOffer = z.infer<typeof BuyOfferSchema>;
export declare const ContractSchema: z.ZodObject<{
    id: z.ZodString;
    offerId: z.ZodString;
    buyerWallet: z.ZodString;
    sellerWallet: z.ZodString;
    serviceId: z.ZodString;
    price: z.ZodNumber;
    asset: z.ZodString;
    escrowSignature: z.ZodOptional<z.ZodString>;
    deliverySignature: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["created", "funded", "in_progress", "delivered", "completed", "disputed"]>;
    createdAt: z.ZodNumber;
    completedAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    asset: string;
    price: number;
    status: "completed" | "funded" | "created" | "in_progress" | "delivered" | "disputed";
    id: string;
    serviceId: string;
    createdAt: number;
    buyerWallet: string;
    sellerWallet: string;
    offerId: string;
    completedAt?: number | undefined;
    escrowSignature?: string | undefined;
    deliverySignature?: string | undefined;
}, {
    asset: string;
    price: number;
    status: "completed" | "funded" | "created" | "in_progress" | "delivered" | "disputed";
    id: string;
    serviceId: string;
    createdAt: number;
    buyerWallet: string;
    sellerWallet: string;
    offerId: string;
    completedAt?: number | undefined;
    escrowSignature?: string | undefined;
    deliverySignature?: string | undefined;
}>;
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
//# sourceMappingURL=types.d.ts.map