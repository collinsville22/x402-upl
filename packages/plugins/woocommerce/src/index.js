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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WooCommerceX402Plugin = void 0;
const sdk_1 = require("@x402-upl/sdk");
const woocommerce_rest_api_1 = __importDefault(require("@woocommerce/woocommerce-rest-api"));
class WooCommerceX402Plugin {
    x402Client;
    wooClient;
    config;
    constructor(config) {
        this.config = config;
        const x402Config = {
            network: config.solanaNetwork,
            rpcUrl: config.solanaRpcUrl,
            wallet: config.merchantWallet,
        };
        this.x402Client = new sdk_1.SolanaX402Client(x402Config);
        this.wooClient = new woocommerce_rest_api_1.default({
            url: config.woocommerceUrl,
            consumerKey: config.woocommerceKey,
            consumerSecret: config.woocommerceSecret,
            version: 'wc/v3',
        });
    }
    async createPaymentSession(orderId, amount, currency) {
        const sessionId = `wc_${orderId}_${Date.now()}`;
        const merchantAddress = this.x402Client.getWalletAddress();
        return {
            sessionId,
            paymentUrl: `/pay/${sessionId}`,
            payTo: merchantAddress,
            amount: amount.toString(),
            asset: this.mapCurrencyToAsset(currency),
        };
    }
    async getOrder(orderId) {
        const response = await this.wooClient.get(`orders/${orderId}`);
        return response.data;
    }
    async updateOrderStatus(orderId, status, note) {
        const updateData = { status };
        if (note) {
            updateData.customer_note = note;
        }
        await this.wooClient.put(`orders/${orderId}`, updateData);
    }
    async addOrderNote(orderId, note) {
        await this.wooClient.post(`orders/${orderId}/notes`, {
            note,
            customer_note: true,
        });
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
    async completeOrder(orderId, signature) {
        await this.updateOrderStatus(orderId, 'completed');
        await this.addOrderNote(orderId, `Payment completed on Solana. Transaction: ${signature}`);
    }
    async refundOrder(orderId, amount, reason) {
        const response = await this.wooClient.post(`orders/${orderId}/refunds`, {
            amount: amount.toString(),
            reason,
        });
        return response.data;
    }
    async createProduct(product) {
        const productData = {
            name: product.name,
            regular_price: product.price,
            description: product.description,
            status: 'publish',
        };
        if (product.acceptsCrypto) {
            productData.meta_data = [
                {
                    key: '_x402_enabled',
                    value: 'yes',
                },
            ];
        }
        const response = await this.wooClient.post('products', productData);
        return response.data;
    }
    async listOrders(status, page = 1, perPage = 10) {
        const params = {
            page,
            per_page: perPage,
        };
        if (status) {
            params.status = status;
        }
        const response = await this.wooClient.get('orders', params);
        return response.data;
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
    getWooClient() {
        return this.wooClient;
    }
}
exports.WooCommerceX402Plugin = WooCommerceX402Plugin;
__exportStar(require("./server"), exports);
__exportStar(require("./webhooks"), exports);
//# sourceMappingURL=index.js.map