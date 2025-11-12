import express from 'express';
import { Connection } from '@solana/web3.js';
import cors from 'cors';
export class MockX402Service {
    app;
    config;
    connection;
    processedPayments = new Set();
    constructor(config) {
        this.config = config;
        this.app = express();
        const rpcUrl = config.rpcUrl ||
            (config.network === 'mainnet-beta'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com');
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });
    }
    setupRoutes() {
        this.app.get('/api/price', this.handlePriceRequest.bind(this));
        this.app.post('/api/analyze', this.handleAnalysisRequest.bind(this));
        this.app.get('/api/market-data', this.handleMarketDataRequest.bind(this));
        this.app.get('/health', this.handleHealthCheck.bind(this));
    }
    async handlePriceRequest(req, res) {
        const paymentHeader = req.headers['x-payment'];
        if (!paymentHeader) {
            return this.requirePayment(res, 0.01, 'CASH', 'Price oracle API call');
        }
        const paymentValid = await this.verifyPayment(paymentHeader, 0.01);
        if (!paymentValid) {
            return res.status(402).json({
                error: 'Invalid or insufficient payment',
                code: 'PAYMENT_VERIFICATION_FAILED',
            });
        }
        const { symbol = 'SOL' } = req.query;
        const mockPrices = {
            SOL: 150.32 + (Math.random() - 0.5) * 5,
            BTC: 65432.10 + (Math.random() - 0.5) * 1000,
            ETH: 3234.56 + (Math.random() - 0.5) * 100,
        };
        res.json({
            symbol,
            price: mockPrices[symbol] || 0,
            timestamp: Date.now(),
            source: 'mock-x402-oracle',
        });
    }
    async handleAnalysisRequest(req, res) {
        const paymentHeader = req.headers['x-payment'];
        if (!paymentHeader) {
            return this.requirePayment(res, 0.02, 'CASH', 'Sentiment analysis API call');
        }
        const paymentValid = await this.verifyPayment(paymentHeader, 0.02);
        if (!paymentValid) {
            return res.status(402).json({
                error: 'Invalid or insufficient payment',
                code: 'PAYMENT_VERIFICATION_FAILED',
            });
        }
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({
                error: 'Missing required field: text',
            });
        }
        const sentimentScore = Math.random() * 2 - 1;
        res.json({
            text,
            sentiment: sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral',
            score: sentimentScore,
            confidence: 0.75 + Math.random() * 0.2,
            timestamp: Date.now(),
        });
    }
    async handleMarketDataRequest(req, res) {
        const paymentHeader = req.headers['x-payment'];
        if (!paymentHeader) {
            return this.requirePayment(res, 0.015, 'CASH', 'Market data API call');
        }
        const paymentValid = await this.verifyPayment(paymentHeader, 0.015);
        if (!paymentValid) {
            return res.status(402).json({
                error: 'Invalid or insufficient payment',
                code: 'PAYMENT_VERIFICATION_FAILED',
            });
        }
        const { days = 7 } = req.query;
        const data = [];
        for (let i = 0; i < Number(days); i++) {
            data.push({
                timestamp: Date.now() - i * 86400000,
                price: 150 + Math.random() * 20,
                volume: 1000000 + Math.random() * 500000,
            });
        }
        res.json({
            symbol: 'SOL',
            days: Number(days),
            data,
            timestamp: Date.now(),
        });
    }
    handleHealthCheck(req, res) {
        res.json({
            status: 'healthy',
            service: 'mock-x402-service',
            timestamp: Date.now(),
            paymentAddress: this.config.paymentAddress,
            network: this.config.network,
        });
    }
    requirePayment(res, amount, asset, description) {
        res.status(402).json({
            scheme: 'solana',
            network: this.config.network,
            asset,
            payTo: this.config.paymentAddress,
            amount: amount.toString(),
            timeout: 60,
            description,
            nonce: this.generateNonce(),
        });
    }
    async verifyPayment(paymentHeader, expectedAmount) {
        try {
            const payloadJson = Buffer.from(paymentHeader, 'base64').toString('utf-8');
            const payload = JSON.parse(payloadJson);
            if (this.processedPayments.has(payload.signature)) {
                console.log(`[PAYMENT] Duplicate payment detected: ${payload.signature}`);
                return false;
            }
            if (payload.to !== this.config.paymentAddress) {
                console.log(`[PAYMENT] Wrong recipient: ${payload.to} != ${this.config.paymentAddress}`);
                return false;
            }
            const paidAmount = parseFloat(payload.amount);
            if (paidAmount < expectedAmount * 0.99) {
                console.log(`[PAYMENT] Insufficient amount: ${paidAmount} < ${expectedAmount}`);
                return false;
            }
            const ageMs = Date.now() - payload.timestamp;
            if (ageMs > 300000) {
                console.log(`[PAYMENT] Payment too old: ${ageMs}ms`);
                return false;
            }
            try {
                const tx = await this.connection.getTransaction(payload.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });
                if (!tx || tx.meta?.err) {
                    console.log(`[PAYMENT] Transaction not found or failed: ${payload.signature}`);
                    return false;
                }
                console.log(`[PAYMENT] Verified: ${payload.signature} (${paidAmount} ${payload.asset})`);
                this.processedPayments.add(payload.signature);
                setTimeout(() => {
                    this.processedPayments.delete(payload.signature);
                }, 3600000);
                return true;
            }
            catch (error) {
                console.error(`[PAYMENT] Verification error: ${error.message}`);
                return false;
            }
        }
        catch (error) {
            console.error(`[PAYMENT] Parse error: ${error.message}`);
            return false;
        }
    }
    generateNonce() {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    start() {
        this.app.listen(this.config.port, () => {
            console.log(`\nMock x402 Service Started`);
            console.log(`Port: ${this.config.port}`);
            console.log(`Payment Address: ${this.config.paymentAddress}`);
            console.log(`Network: ${this.config.network}`);
            console.log(`\nEndpoints:`);
            console.log(`GET  http://localhost:${this.config.port}/api/price?symbol=SOL (0.01 CASH)`);
            console.log(`POST http://localhost:${this.config.port}/api/analyze (0.02 CASH)`);
            console.log(`GET  http://localhost:${this.config.port}/api/market-data?days=7 (0.015 CASH)`);
            console.log(`GET  http://localhost:${this.config.port}/health (free)`);
        });
    }
}
if (require.main === module) {
    const config = {
        port: 3402,
        paymentAddress: process.env.PAYMENT_ADDRESS || 'REPLACE_WITH_YOUR_WALLET_ADDRESS',
        network: process.env.NETWORK || 'devnet',
        rpcUrl: process.env.RPC_URL,
    };
    const service = new MockX402Service(config);
    service.start();
}
export default MockX402Service;
//# sourceMappingURL=mock-x402-service.js.map