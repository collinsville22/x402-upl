"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyX402Plugin = void 0;
const sdk_1 = require("@x402-upl/sdk");
const shopify_api_1 = require("@shopify/shopify-api");
require("@shopify/shopify-api/adapters/node");
class ShopifyX402Plugin {
    x402Client;
    config;
    shopifyClient;
    constructor(config) {
        this.config = config;
        const x402Config = {
            network: config.solanaNetwork,
            rpcUrl: config.solanaRpcUrl,
            wallet: config.merchantWallet,
        };
        this.x402Client = new sdk_1.SolanaX402Client(x402Config);
        this.shopifyClient = shopify_api_1.shopify.config({
            apiKey: config.shopifyApiKey,
            apiSecretKey: config.shopifyApiSecret,
            scopes: config.shopifyScopes,
            hostName: config.shopifyHostName,
            apiVersion: '2024-01',
            isEmbeddedApp: false,
        });
    }
    async createPaymentSession(orderId, amount, currency) {
        const sessionId = `shopify_${orderId}_${Date.now()}`;
        const merchantAddress = this.x402Client.getWalletAddress();
        return {
            sessionId,
            paymentUrl: `/pay/${sessionId}`,
            payTo: merchantAddress,
            amount: amount.toString(),
            asset: this.mapCurrencyToAsset(currency),
        };
    }
    async verifyPayment(signature, expectedAmount) {
        try {
            const tx = await this.x402Client['rpcClient'].getTransaction(signature, {
                commitment: 'confirmed',
            });
            if (!tx || !tx.meta) {
                return false;
            }
            const lamports = tx.meta.postBalances[1] - tx.meta.preBalances[1];
            const receivedAmount = lamports / 1_000_000_000;
            return Math.abs(receivedAmount - expectedAmount) < 0.000001;
        }
        catch (error) {
            console.error('Payment verification failed:', error);
            return false;
        }
    }
    async fulfillOrder(orderId, signature) {
        const session = await this.shopifyClient.session.getCurrent();
        if (!session) {
            throw new Error('No active Shopify session');
        }
        const client = new this.shopifyClient.clients.Rest({ session });
        await client.post({
            path: `orders/${orderId}/fulfillments`,
            data: {
                fulfillment: {
                    tracking_number: signature,
                    notify_customer: true,
                },
            },
        });
    }
    async refundOrder(orderId, amount, reason) {
        const session = await this.shopifyClient.session.getCurrent();
        if (!session) {
            throw new Error('No active Shopify session');
        }
        const client = new this.shopifyClient.clients.Rest({ session });
        const response = await client.post({
            path: `orders/${orderId}/refunds`,
            data: {
                refund: {
                    currency: 'USD',
                    amount: amount,
                    note: reason,
                },
            },
        });
        return response.body.refund.id;
    }
    mapCurrencyToAsset(currency) {
        const mapping = {
            'USD': 'USDC',
            'SOL': 'SOL',
            'CASH': 'CASH',
        };
        return mapping[currency] || 'SOL';
    }
    getClient() {
        return this.x402Client;
    }
    getMerchantAddress() {
        return this.x402Client.getWalletAddress();
    }
}
exports.ShopifyX402Plugin = ShopifyX402Plugin;
__exportStar(require("./server"), exports);
__exportStar(require("./webhooks"), exports);
//# sourceMappingURL=index.js.map