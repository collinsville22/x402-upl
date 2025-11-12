"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WooCommerceX402Server = void 0;
const express_1 = __importDefault(require("express"));
class WooCommerceX402Server {
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
                const paymentSession = await this.plugin.createPaymentSession(parseInt(orderId), parseFloat(amount), currency);
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
        this.app.post('/api/complete-order', async (req, res) => {
            try {
                const { orderId, signature } = req.body;
                if (!orderId || !signature) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                await this.plugin.completeOrder(parseInt(orderId), signature);
                res.json({ success: true });
            }
            catch (error) {
                console.error('Order completion error:', error);
                res.status(500).json({ error: 'Failed to complete order' });
            }
        });
        this.app.post('/api/refund-order', async (req, res) => {
            try {
                const { orderId, amount, reason } = req.body;
                if (!orderId || !amount) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                const refund = await this.plugin.refundOrder(parseInt(orderId), parseFloat(amount), reason || 'Customer requested refund');
                res.json({ refund });
            }
            catch (error) {
                console.error('Refund error:', error);
                res.status(500).json({ error: 'Failed to process refund' });
            }
        });
        this.app.get('/api/order/:id', async (req, res) => {
            try {
                const orderId = parseInt(req.params.id);
                if (isNaN(orderId)) {
                    return res.status(400).json({ error: 'Invalid order ID' });
                }
                const order = await this.plugin.getOrder(orderId);
                res.json({ order });
            }
            catch (error) {
                console.error('Get order error:', error);
                res.status(500).json({ error: 'Failed to get order' });
            }
        });
        this.app.get('/api/orders', async (req, res) => {
            try {
                const status = req.query.status;
                const page = parseInt(req.query.page) || 1;
                const perPage = parseInt(req.query.per_page) || 10;
                const orders = await this.plugin.listOrders(status, page, perPage);
                res.json({ orders });
            }
            catch (error) {
                console.error('List orders error:', error);
                res.status(500).json({ error: 'Failed to list orders' });
            }
        });
        this.app.post('/api/products', async (req, res) => {
            try {
                const { name, price, description, acceptsCrypto } = req.body;
                if (!name || !price) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                const product = await this.plugin.createProduct({
                    name,
                    price,
                    description: description || '',
                    acceptsCrypto: acceptsCrypto || false,
                });
                res.json({ product });
            }
            catch (error) {
                console.error('Create product error:', error);
                res.status(500).json({ error: 'Failed to create product' });
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
            console.log(`WooCommerce x402 server running on port ${this.port}`);
        });
    }
    getApp() {
        return this.app;
    }
}
exports.WooCommerceX402Server = WooCommerceX402Server;
//# sourceMappingURL=server.js.map