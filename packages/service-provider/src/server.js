import express from 'express';
import cors from 'cors';
import { PublicKey } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const TREASURY_WALLET = process.env.TREASURY_WALLET;
const NETWORK = process.env.NETWORK || 'devnet';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.x402.network';
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || TREASURY_WALLET;
if (!TREASURY_WALLET) {
    console.error('TREASURY_WALLET environment variable required (Solana public key)');
    process.exit(1);
}
const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const middleware = createX402Middleware({
    config: {
        network: NETWORK,
        rpcUrl: RPC_URL,
        treasuryWallet: new PublicKey(TREASURY_WALLET),
        acceptedTokens: [NETWORK === 'mainnet-beta' ? USDC_MAINNET : USDC_DEVNET],
        timeout: 300000,
    },
    pricing: {
        '/weather': {
            pricePerCall: 0.001,
            currency: 'USDC',
        },
        '/sentiment': {
            pricePerCall: 0.002,
            currency: 'USDC',
        },
        '/price': {
            pricePerCall: 0.0015,
            currency: 'USDC',
        },
        '/analyze': {
            pricePerCall: 0.003,
            currency: 'USDC',
        },
    },
    onPaymentVerified: async (receipt) => {
        console.log('Payment verified:', receipt.signature);
        try {
            await fetch(`${FACILITATOR_URL}/api/transactions/record`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signature: receipt.signature,
                    amount: receipt.amount,
                    token: receipt.token,
                    senderAddress: receipt.sender,
                    recipientAddress: RECIPIENT_ADDRESS,
                    serviceId: process.env.SERVICE_ID,
                    status: 'confirmed',
                    timestamp: new Date().toISOString(),
                }),
            });
        }
        catch (error) {
            console.error('Failed to record transaction:', error);
        }
    },
    onPaymentFailed: async (reason) => {
        console.error('Payment failed:', reason);
    },
});
app.use(middleware);
app.get('/weather', (req, res) => {
    const location = req.query.location || 'New York';
    const weatherData = {
        location,
        temperature: 72,
        condition: 'sunny',
        humidity: 65,
        windSpeed: 8,
        timestamp: new Date().toISOString(),
    };
    res.json(weatherData);
});
app.post('/sentiment', (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text required' });
    }
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointing'];
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    let sentiment;
    let score;
    if (positiveCount > negativeCount) {
        sentiment = 'positive';
        score = Math.min(positiveCount * 0.3, 1);
    }
    else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        score = -Math.min(negativeCount * 0.3, 1);
    }
    else {
        sentiment = 'neutral';
        score = 0;
    }
    res.json({
        sentiment,
        score,
        confidence: Math.abs(score),
        analyzedText: text.substring(0, 100),
    });
});
app.get('/price', async (req, res) => {
    const symbol = req.query.symbol?.toUpperCase() || 'BTC';
    const prices = {
        'BTC': 43250.50,
        'ETH': 2280.75,
        'SOL': 105.32,
        'USDC': 1.00,
        'USDT': 1.00,
    };
    const price = prices[symbol] || 0;
    const change24h = (Math.random() - 0.5) * 10;
    res.json({
        symbol,
        price,
        change24h,
        volume24h: Math.random() * 1000000000,
        timestamp: new Date().toISOString(),
    });
});
app.post('/analyze', (req, res) => {
    const { data, analysisType } = req.body;
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Data array required' });
    }
    if (!analysisType) {
        return res.status(400).json({ error: 'Analysis type required' });
    }
    let result;
    let insights = [];
    switch (analysisType) {
        case 'trend':
            const trend = data.length > 1 && data[data.length - 1] > data[0] ? 'upward' : 'downward';
            result = { trend, magnitude: Math.abs(data[data.length - 1] - data[0]) };
            insights.push(`Data shows ${trend} trend`);
            break;
        case 'correlation':
            result = { correlation: 0.75 };
            insights.push('Strong positive correlation detected');
            break;
        case 'prediction':
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            result = { predicted: avg * 1.05, confidence: 0.82 };
            insights.push('Based on historical patterns');
            break;
        default:
            return res.status(400).json({ error: 'Invalid analysis type' });
    }
    res.json({
        result,
        insights,
        confidence: 0.85,
        dataPoints: data.length,
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        services: ['weather', 'sentiment', 'price', 'analyze'],
        network: NETWORK,
        facilitator: FACILITATOR_URL,
    });
});
const PORT = process.env.PORT || 4021;
app.listen(PORT, () => {
    console.log(`x402 Service Provider running on port ${PORT}`);
    console.log(`Recipient: ${RECIPIENT_ADDRESS}`);
    console.log(`Network: ${NETWORK}`);
    console.log(`Facilitator: ${FACILITATOR_URL}`);
    console.log('\nAvailable services:');
    console.log('  GET  /weather  - $0.001');
    console.log('  POST /sentiment - $0.002');
    console.log('  GET  /price    - $0.0015');
    console.log('  POST /analyze  - $0.003');
    console.log('\nAll services discoverable via Bazaar');
});
//# sourceMappingURL=server.js.map