"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createX402Middleware = createX402Middleware;
const web3_js_1 = require("@solana/web3.js");
const verifier_js_1 = require("../payment/verifier.js");
function createX402Middleware(options) {
    const verifier = new verifier_js_1.PaymentVerifier(options.config);
    return async (req, res, next) => {
        const paymentHeader = req.headers['x-payment'];
        if (!paymentHeader) {
            const pricing = getPricingForRoute(req.path, options.pricing);
            if (!pricing) {
                return res.status(500).json({
                    error: 'Pricing not configured for this endpoint',
                });
            }
            const requirements = generatePaymentRequirements(pricing, options.config);
            return res.status(402).json(requirements);
        }
        try {
            const payload = decodePaymentPayload(paymentHeader);
            const pricing = getPricingForRoute(req.path, options.pricing);
            if (!pricing) {
                return res.status(500).json({
                    error: 'Pricing not configured for this endpoint',
                });
            }
            const amountInSmallestUnit = Math.floor(pricing.pricePerCall * Math.pow(10, 6));
            const verificationResult = await verifier.verifyPayment(payload, amountInSmallestUnit, options.config.treasuryWallet);
            if (!verificationResult.valid) {
                if (options.onPaymentFailed) {
                    await options.onPaymentFailed(verificationResult.reason || 'Unknown error');
                }
                return res.status(400).json({
                    error: 'Payment verification failed',
                    reason: verificationResult.reason,
                });
            }
            if (options.onPaymentVerified && verificationResult.receipt) {
                await options.onPaymentVerified(verificationResult.receipt);
            }
            res.setHeader('X-Payment-Response', encodePaymentResponse(verificationResult.receipt));
            next();
        }
        catch (error) {
            return res.status(400).json({
                error: 'Invalid payment payload',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };
}
function getPricingForRoute(route, pricing) {
    if ('pricePerCall' in pricing) {
        return pricing;
    }
    return pricing[route] || null;
}
function generatePaymentRequirements(pricing, config) {
    const tokenMint = getTokenMintForCurrency(pricing.currency, config);
    return {
        scheme: 'exact',
        network: getNetworkString(config.network),
        asset: tokenMint.toBase58(),
        payTo: config.treasuryWallet.toBase58(),
        amount: pricing.pricePerCall.toString(),
        timeout: config.timeout,
        nonce: generateNonce(),
    };
}
function getTokenMintForCurrency(currency, config) {
    const usdcDevnet = new web3_js_1.PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
    const usdcMainnet = new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    if (currency === 'USDC') {
        return config.network === 'mainnet-beta' ? usdcMainnet : usdcDevnet;
    }
    if (config.acceptedTokens.length > 0) {
        return config.acceptedTokens[0];
    }
    return config.network === 'mainnet-beta' ? usdcMainnet : usdcDevnet;
}
function getNetworkString(network) {
    if (network === 'mainnet-beta')
        return 'solana-mainnet';
    if (network === 'testnet')
        return 'solana-testnet';
    return 'solana-devnet';
}
function generateNonce() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
function decodePaymentPayload(encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
}
function encodePaymentResponse(receipt) {
    return Buffer.from(JSON.stringify(receipt)).toString('base64');
}
//# sourceMappingURL=express.js.map