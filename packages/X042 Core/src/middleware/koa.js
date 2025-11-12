"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createX402KoaMiddleware = createX402KoaMiddleware;
exports.withX402 = withX402;
const web3_js_1 = require("@solana/web3.js");
const verifier_js_1 = require("../payment/verifier.js");
const signature_store_js_1 = require("../storage/signature-store.js");
function createX402KoaMiddleware(config) {
    const rpcUrl = config.rpcUrl ||
        (config.network === 'mainnet-beta'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com');
    const fullConfig = {
        ...config,
        rpcUrl,
        timeout: config.timeout || 120000,
    };
    let signatureStore;
    if (config.redisUrl) {
        signatureStore = new signature_store_js_1.RedisSignatureStore(config.redisUrl);
    }
    else {
        signatureStore = new signature_store_js_1.InMemorySignatureStore();
        if (config.network === 'mainnet-beta') {
            throw new Error('Redis configuration required for mainnet-beta');
        }
    }
    const verifier = new verifier_js_1.PaymentVerifier(fullConfig, signatureStore);
    return async function middleware(ctx, next) {
        if (ctx.method === 'OPTIONS') {
            await next();
            return;
        }
        const paymentHeader = ctx.get('x-payment');
        if (!paymentHeader) {
            const requirements = {
                scheme: 'exact',
                network: getNetworkString(config.network),
                asset: 'SOL',
                payTo: config.treasuryWallet.toBase58(),
                amount: '0.01',
                timeout: fullConfig.timeout,
                nonce: generateNonce(),
            };
            ctx.status = 402;
            ctx.set('Content-Type', 'application/json');
            ctx.set('X-Payment-Required', 'true');
            ctx.body = requirements;
            return;
        }
        try {
            const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
            const result = await verifier.verifyPayment(paymentPayload, 0.01, new web3_js_1.PublicKey(config.treasuryWallet));
            if (!result.valid) {
                if (config.onPaymentFailed) {
                    await config.onPaymentFailed(result.reason || 'Payment verification failed', ctx);
                }
                ctx.status = 402;
                ctx.body = {
                    error: result.reason || 'Payment verification failed',
                };
                return;
            }
            if (config.onPaymentVerified) {
                await config.onPaymentVerified({
                    ...paymentPayload,
                    resource: ctx.path,
                }, ctx);
            }
            ctx.set('X-Payment-Verified', 'true');
            ctx.set('X-Payment-Signature', paymentPayload.signature);
            ctx.state.x402 = {
                verified: true,
                signature: paymentPayload.signature,
                from: paymentPayload.from,
                to: paymentPayload.to,
                amount: paymentPayload.amount,
                asset: paymentPayload.asset,
            };
            await next();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment processing error';
            if (config.onPaymentFailed) {
                await config.onPaymentFailed(errorMessage, ctx);
            }
            ctx.status = 500;
            ctx.body = {
                error: errorMessage,
            };
        }
    };
}
function withX402(routeConfig, globalConfig) {
    const rpcUrl = globalConfig.rpcUrl ||
        (globalConfig.network === 'mainnet-beta'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com');
    const fullConfig = {
        ...globalConfig,
        rpcUrl,
        timeout: globalConfig.timeout || 120000,
    };
    let signatureStore;
    if (globalConfig.redisUrl) {
        signatureStore = new signature_store_js_1.RedisSignatureStore(globalConfig.redisUrl);
    }
    else {
        signatureStore = new signature_store_js_1.InMemorySignatureStore();
        if (globalConfig.network === 'mainnet-beta') {
            throw new Error('Redis configuration required for mainnet-beta');
        }
    }
    const verifier = new verifier_js_1.PaymentVerifier(fullConfig, signatureStore);
    return async function middleware(ctx, next) {
        if (ctx.method === 'OPTIONS') {
            await next();
            return;
        }
        const paymentHeader = ctx.get('x-payment');
        if (!paymentHeader) {
            const requirements = {
                scheme: 'exact',
                network: getNetworkString(globalConfig.network),
                asset: routeConfig.asset || 'SOL',
                payTo: globalConfig.treasuryWallet.toBase58(),
                amount: routeConfig.price.toString(),
                timeout: fullConfig.timeout,
                nonce: generateNonce(),
            };
            ctx.status = 402;
            ctx.set('Content-Type', 'application/json');
            ctx.set('X-Payment-Required', 'true');
            ctx.body = requirements;
            return;
        }
        try {
            const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
            const result = await verifier.verifyPayment(paymentPayload, routeConfig.price, new web3_js_1.PublicKey(globalConfig.treasuryWallet));
            if (!result.valid) {
                if (globalConfig.onPaymentFailed) {
                    await globalConfig.onPaymentFailed(result.reason || 'Payment verification failed', ctx);
                }
                ctx.status = 402;
                ctx.body = {
                    error: result.reason || 'Payment verification failed',
                };
                return;
            }
            if (globalConfig.onPaymentVerified) {
                await globalConfig.onPaymentVerified({
                    ...paymentPayload,
                    resource: ctx.path,
                }, ctx);
            }
            ctx.set('X-Payment-Verified', 'true');
            ctx.set('X-Payment-Signature', paymentPayload.signature);
            ctx.state.x402 = {
                verified: true,
                signature: paymentPayload.signature,
                from: paymentPayload.from,
                to: paymentPayload.to,
                amount: paymentPayload.amount,
                asset: paymentPayload.asset,
            };
            await next();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment processing error';
            if (globalConfig.onPaymentFailed) {
                await globalConfig.onPaymentFailed(errorMessage, ctx);
            }
            ctx.status = 500;
            ctx.body = {
                error: errorMessage,
            };
        }
    };
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
//# sourceMappingURL=koa.js.map