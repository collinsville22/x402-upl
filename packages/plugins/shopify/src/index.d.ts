import { Keypair } from '@solana/web3.js';
import { SolanaX402Client } from '@x402-upl/sdk';
import '@shopify/shopify-api/adapters/node';
export interface ShopifyX402Config {
    shopifyApiKey: string;
    shopifyApiSecret: string;
    shopifyScopes: string[];
    shopifyHostName: string;
    solanaNetwork: 'mainnet-beta' | 'devnet' | 'testnet';
    solanaRpcUrl?: string;
    merchantWallet: Keypair;
}
export declare class ShopifyX402Plugin {
    private x402Client;
    private config;
    private shopifyClient;
    constructor(config: ShopifyX402Config);
    createPaymentSession(orderId: string, amount: number, currency: string): Promise<{
        sessionId: string;
        paymentUrl: string;
        payTo: string;
        amount: string;
        asset: string;
    }>;
    verifyPayment(signature: string, expectedAmount: number): Promise<boolean>;
    fulfillOrder(orderId: string, signature: string): Promise<void>;
    refundOrder(orderId: string, amount: number, reason: string): Promise<string>;
    private mapCurrencyToAsset;
    getClient(): SolanaX402Client;
    getMerchantAddress(): string;
}
export * from './server';
export * from './webhooks';
//# sourceMappingURL=index.d.ts.map