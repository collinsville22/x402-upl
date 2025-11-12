"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordPressX402Server = void 0;
const express_1 = __importDefault(require("express"));
class WordPressX402Server {
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
                const payment = await this.plugin.createPaymentPost(orderId, parseFloat(amount), currency);
                res.json(payment);
            }
            catch (error) {
                console.error('Payment creation error:', error);
                res.status(500).json({ error: 'Failed to create payment' });
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
        this.app.post('/api/complete-payment', async (req, res) => {
            try {
                const { postId, signature } = req.body;
                if (!postId || !signature) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                await this.plugin.completePayment(parseInt(postId), signature);
                res.json({ success: true });
            }
            catch (error) {
                console.error('Payment completion error:', error);
                res.status(500).json({ error: 'Failed to complete payment' });
            }
        });
        this.app.get('/api/post/:id', async (req, res) => {
            try {
                const postId = parseInt(req.params.id);
                if (isNaN(postId)) {
                    return res.status(400).json({ error: 'Invalid post ID' });
                }
                const post = await this.plugin.getPost(postId);
                res.json({ post });
            }
            catch (error) {
                console.error('Get post error:', error);
                res.status(500).json({ error: 'Failed to get post' });
            }
        });
        this.app.get('/api/posts', async (req, res) => {
            try {
                const filters = {
                    status: req.query.status,
                    page: req.query.page ? parseInt(req.query.page) : undefined,
                    perPage: req.query.per_page ? parseInt(req.query.per_page) : undefined,
                };
                const posts = await this.plugin.listPosts(filters);
                res.json({ posts });
            }
            catch (error) {
                console.error('List posts error:', error);
                res.status(500).json({ error: 'Failed to list posts' });
            }
        });
        this.app.post('/api/posts', async (req, res) => {
            try {
                const { title, content, status, meta } = req.body;
                if (!title || !content) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                const post = await this.plugin.createPost({
                    title,
                    content,
                    status: status || 'draft',
                    meta,
                });
                res.json({ post });
            }
            catch (error) {
                console.error('Create post error:', error);
                res.status(500).json({ error: 'Failed to create post' });
            }
        });
        this.app.put('/api/posts/:id', async (req, res) => {
            try {
                const postId = parseInt(req.params.id);
                if (isNaN(postId)) {
                    return res.status(400).json({ error: 'Invalid post ID' });
                }
                const { title, content, status, meta } = req.body;
                const post = await this.plugin.updatePost(postId, {
                    title,
                    content,
                    status,
                    meta,
                });
                res.json({ post });
            }
            catch (error) {
                console.error('Update post error:', error);
                res.status(500).json({ error: 'Failed to update post' });
            }
        });
        this.app.post('/api/users', async (req, res) => {
            try {
                const { username, email, password, roles } = req.body;
                if (!username || !email || !password) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                const user = await this.plugin.createUser({
                    username,
                    email,
                    password,
                    roles,
                });
                res.json({ user });
            }
            catch (error) {
                console.error('Create user error:', error);
                res.status(500).json({ error: 'Failed to create user' });
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
            console.log(`WordPress x402 server running on port ${this.port}`);
        });
    }
    getApp() {
        return this.app;
    }
}
exports.WordPressX402Server = WordPressX402Server;
//# sourceMappingURL=server.js.map