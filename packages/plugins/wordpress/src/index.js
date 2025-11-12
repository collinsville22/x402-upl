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
exports.WordPressX402Plugin = void 0;
const sdk_1 = require("@x402-upl/sdk");
class WordPressX402Plugin {
    x402Client;
    config;
    apiBase;
    constructor(config) {
        this.config = config;
        this.apiBase = `${config.wordpressUrl}/wp-json/wp/v2`;
        const x402Config = {
            network: config.solanaNetwork,
            rpcUrl: config.solanaRpcUrl,
            wallet: config.merchantWallet,
        };
        this.x402Client = new sdk_1.SolanaX402Client(x402Config);
    }
    async createPaymentPost(orderId, amount, currency) {
        const sessionId = `wp_${orderId}_${Date.now()}`;
        const merchantAddress = this.x402Client.getWalletAddress();
        const post = await this.createPost({
            title: `Payment for Order ${orderId}`,
            content: `Payment session: ${sessionId}`,
            status: 'private',
            meta: {
                x402_session_id: sessionId,
                x402_order_id: orderId,
                x402_amount: amount.toString(),
                x402_currency: currency,
                x402_merchant: merchantAddress,
                x402_status: 'pending',
            },
        });
        return {
            postId: post.id,
            sessionId,
            paymentUrl: `/pay/${sessionId}`,
            payTo: merchantAddress,
            amount: amount.toString(),
            asset: this.mapCurrencyToAsset(currency),
        };
    }
    async createPost(postData) {
        const auth = Buffer.from(`${this.config.wordpressUser}:${this.config.wordpressPassword}`).toString('base64');
        const response = await fetch(`${this.apiBase}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
            },
            body: JSON.stringify(postData),
        });
        if (!response.ok) {
            throw new Error(`Failed to create post: ${response.statusText}`);
        }
        return response.json();
    }
    async getPost(postId) {
        const auth = Buffer.from(`${this.config.wordpressUser}:${this.config.wordpressPassword}`).toString('base64');
        const response = await fetch(`${this.apiBase}/posts/${postId}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get post: ${response.statusText}`);
        }
        return response.json();
    }
    async updatePost(postId, updates) {
        const auth = Buffer.from(`${this.config.wordpressUser}:${this.config.wordpressPassword}`).toString('base64');
        const response = await fetch(`${this.apiBase}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
            },
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            throw new Error(`Failed to update post: ${response.statusText}`);
        }
        return response.json();
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
    async completePayment(postId, signature) {
        await this.updatePost(postId, {
            meta: {
                x402_status: 'completed',
                x402_signature: signature,
                x402_completed_at: new Date().toISOString(),
            },
        });
    }
    async createUser(userData) {
        const auth = Buffer.from(`${this.config.wordpressUser}:${this.config.wordpressPassword}`).toString('base64');
        const response = await fetch(`${this.apiBase}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
            },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            throw new Error(`Failed to create user: ${response.statusText}`);
        }
        return response.json();
    }
    async listPosts(filters) {
        const auth = Buffer.from(`${this.config.wordpressUser}:${this.config.wordpressPassword}`).toString('base64');
        const params = new URLSearchParams();
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.perPage)
            params.append('per_page', filters.perPage.toString());
        const response = await fetch(`${this.apiBase}/posts?${params}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to list posts: ${response.statusText}`);
        }
        return response.json();
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
exports.WordPressX402Plugin = WordPressX402Plugin;
__exportStar(require("./server"), exports);
//# sourceMappingURL=index.js.map