import { Keypair } from '@solana/web3.js';
import { SolanaX402Client } from '@x402-upl/sdk';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
export interface WooCommerceX402Config {
    woocommerceUrl: string;
    woocommerceKey: string;
    woocommerceSecret: string;
    solanaNetwork: 'mainnet-beta' | 'devnet' | 'testnet';
    solanaRpcUrl?: string;
    merchantWallet: Keypair;
}
export declare class WooCommerceX402Plugin {
    private x402Client;
    private wooClient;
    private config;
    constructor(config: WooCommerceX402Config);
    createPaymentSession(orderId: number, amount: number, currency: string): Promise<{
        sessionId: string;
        paymentUrl: string;
        payTo: string;
        amount: string;
        asset: string;
    }>;
    getOrder(orderId: number): Promise<any>;
    updateOrderStatus(orderId: number, status: string, note?: string): Promise<void>;
    addOrderNote(orderId: number, note: string): Promise<void>;
    verifyPayment(signature: string, expectedAmount: number): Promise<boolean>;
    completeOrder(orderId: number, signature: string): Promise<void>;
    refundOrder(orderId: number, amount: number, reason: string): Promise<any>;
    createProduct(product: {
        name: string;
        price: string;
        description: string;
        acceptsCrypto: boolean;
    }): Promise<any>;
    listOrders(status?: string, page?: number, perPage?: number): Promise<any[]>;
    private mapCurrencyToAsset;
    getClient(): SolanaX402Client;
    getMerchantAddress(): string;
    getWooClient(): WooCommerceRestApi;
}
export * from './server';
export * from './webhooks';
//# sourceMappingURL=index.d.ts.map