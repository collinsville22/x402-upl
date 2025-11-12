"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyX402Server = void 0;
const express_1 = __importDefault(require("express"));
class ShopifyX402Server {
    app;
    plugin;
    port;
    constructor(plugin, port = 3000) {
        this.plugin = plugin;
        this.port = port;
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
    }
    setupRoutes() {
        this.app.post('/api/create-payment', async (req, res) => {
            try {
                const { orderId, amount, currency } = req.body;
                if (!orderId || !amount || !currency) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                const paymentSession = await this.plugin.createPaymentSession(orderId, parseFloat(amount), currency);
                res.json(paymentSession);
            }
            catch (error) {
                console.error('Payment creation error:', error);
                res.status(500).json({ error: 'Failed to create payment session' });
            }
        });
        this.app.post('/api/verify-payment', async (req, res) => {
            try {
                const { signature, amount } = req.body;
                if (!signature || !amount) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                const verified = await this.plugin.verifyPayment(signature, parseFloat(amount));
                res.json({ verified });
            }
            catch (error) {
                console.error('Payment verification error:', error);
                res.status(500).json({ error: 'Failed to verify payment' });
            }
        });
        this.app.post('/api/fulfill-order', async (req, res) => {
            try {
                const { orderId, signature } = req.body;
                if (!orderId || !signature) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                await this.plugin.fulfillOrder(orderId, signature);
                res.json({ success: true });
            }
            catch (error) {
                console.error('Order fulfillment error:', error);
                res.status(500).json({ error: 'Failed to fulfill order' });
            }
        });
        this.app.post('/api/refund-order', async (req, res) => {
            try {
                const { orderId, amount, reason } = req.body;
                if (!orderId || !amount) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                const refundId = await this.plugin.refundOrder(orderId, parseFloat(amount), reason || 'Customer requested refund');
                res.json({ refundId });
            }
            catch (error) {
                console.error('Refund error:', error);
                res.status(500).json({ error: 'Failed to process refund' });
            }
        });
        this.app.get('/api/merchant-address', (req, res) => {
            res.json({ address: this.plugin.getMerchantAddress() });
        });
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }
    start() {
        this.app.listen(this.port, () => {
            console.log(`Shopify x402 server running on port ${this.port}`);
        });
    }
    getApp() {
        return this.app;
    }
}
exports.ShopifyX402Server = ShopifyX402Server;
//# sourceMappingURL=server.js.map