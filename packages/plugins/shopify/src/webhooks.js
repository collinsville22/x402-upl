"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyWebhookHandler = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ShopifyWebhookHandler {
    secret;
    handlers;
    constructor(secret, handlers) {
        this.secret = secret;
        this.handlers = handlers;
    }
    verifyWebhook(req, res, next) {
        const hmac = req.get('X-Shopify-Hmac-Sha256');
        if (!hmac) {
            res.status(401).json({ error: 'Missing HMAC signature' });
            return;
        }
        const body = JSON.stringify(req.body);
        const hash = crypto_1.default
            .createHmac('sha256', this.secret)
            .update(body, 'utf8')
            .digest('base64');
        if (hash !== hmac) {
            res.status(401).json({ error: 'Invalid HMAC signature' });
            return;
        }
        next();
    }
    async handleWebhook(req, res) {
        const topic = req.get('X-Shopify-Topic');
        try {
            switch (topic) {
                case 'orders/create':
                    if (this.handlers.onOrderCreated) {
                        await this.handlers.onOrderCreated(req.body);
                    }
                    break;
                case 'orders/paid':
                    if (this.handlers.onOrderPaid) {
                        await this.handlers.onOrderPaid(req.body);
                    }
                    break;
                case 'orders/cancelled':
                    if (this.handlers.onOrderCancelled) {
                        await this.handlers.onOrderCancelled(req.body);
                    }
                    break;
                case 'refunds/create':
                    if (this.handlers.onOrderRefunded) {
                        await this.handlers.onOrderRefunded(req.body);
                    }
                    break;
                default:
                    console.log(`Unhandled webhook topic: ${topic}`);
            }
            res.status(200).send('OK');
        }
        catch (error) {
            console.error('Webhook handling error:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }
}
exports.ShopifyWebhookHandler = ShopifyWebhookHandler;
//# sourceMappingURL=webhooks.js.map