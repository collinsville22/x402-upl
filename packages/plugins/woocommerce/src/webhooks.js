"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WooCommerceWebhookHandler = void 0;
const crypto_1 = __importDefault(require("crypto"));
class WooCommerceWebhookHandler {
    secret;
    handlers;
    constructor(secret, handlers) {
        this.secret = secret;
        this.handlers = handlers;
    }
    verifyWebhook(req, res, next) {
        const signature = req.get('X-WC-Webhook-Signature');
        if (!signature) {
            res.status(401).json({ error: 'Missing webhook signature' });
            return;
        }
        const body = JSON.stringify(req.body);
        const hash = crypto_1.default
            .createHmac('sha256', this.secret)
            .update(body)
            .digest('base64');
        if (hash !== signature) {
            res.status(401).json({ error: 'Invalid webhook signature' });
            return;
        }
        next();
    }
    async handleWebhook(req, res) {
        const topic = req.get('X-WC-Webhook-Topic');
        try {
            switch (topic) {
                case 'order.created':
                    if (this.handlers.onOrderCreated) {
                        await this.handlers.onOrderCreated(req.body);
                    }
                    break;
                case 'order.updated':
                    if (this.handlers.onOrderUpdated) {
                        await this.handlers.onOrderUpdated(req.body);
                    }
                    break;
                case 'order.deleted':
                    if (this.handlers.onOrderDeleted) {
                        await this.handlers.onOrderDeleted(req.body);
                    }
                    break;
                case 'order.restored':
                    if (this.handlers.onOrderRestored) {
                        await this.handlers.onOrderRestored(req.body);
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
exports.WooCommerceWebhookHandler = WooCommerceWebhookHandler;
//# sourceMappingURL=webhooks.js.map