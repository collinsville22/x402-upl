"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createX402Middleware = createX402Middleware;
exports.withX402 = withX402;
const server_1 = require("next/server");
const web3_js_1 = require("@solana/web3.js");
const verifier_js_1 = require("../payment/verifier.js");
const signature_store_js_1 = require("../storage/signature-store.js");
function createX402Middleware(config) {
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
    return async function middleware(request) {
        if (request.method === 'OPTIONS') {
            return new server_1.NextResponse(null, { status: 204 });
        }
        const paymentHeader = request.headers.get('x-payment');
        if (!paymentHeader) {
            const requirements = {
                network: config.network,
                asset: 'SOL',
                payTo: config.treasuryWallet,
                amount: '0.01',
                timeout: fullConfig.timeout,
                nonce: generateNonce(),
            };
            return server_1.NextResponse.json(requirements, {
                status: 402,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Payment-Required': 'true',
                },
            });
        }
        try {
            const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
            const result = await verifier.verifyPayment(paymentPayload, 0.01, new web3_js_1.PublicKey(config.treasuryWallet));
            if (!result.valid) {
                if (config.onPaymentFailed) {
                    await config.onPaymentFailed(result.reason || 'Payment verification failed', request);
                }
                return server_1.NextResponse.json({ error: result.reason || 'Payment verification failed' }, { status: 402 });
            }
            if (config.onPaymentVerified) {
                await config.onPaymentVerified({
                    ...paymentPayload,
                    resource: request.nextUrl.pathname,
                });
            }
            const response = server_1.NextResponse.next();
            response.headers.set('X-Payment-Verified', 'true');
            response.headers.set('X-Payment-Signature', paymentPayload.signature);
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment processing error';
            if (config.onPaymentFailed) {
                await config.onPaymentFailed(errorMessage, request);
            }
            return server_1.NextResponse.json({ error: errorMessage }, { status: 500 });
        }
    };
}
function withX402(handler, routeConfig, globalConfig) {
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
    return async (request) => {
        if (request.method === 'OPTIONS') {
            return new server_1.NextResponse(null, { status: 204 });
        }
        const paymentHeader = request.headers.get('x-payment');
        if (!paymentHeader) {
            const requirements = {
                network: globalConfig.network,
                asset: routeConfig.asset || 'SOL',
                payTo: globalConfig.treasuryWallet,
                amount: routeConfig.price.toString(),
                timeout: fullConfig.timeout,
                nonce: generateNonce(),
            };
            return server_1.NextResponse.json(requirements, {
                status: 402,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Payment-Required': 'true',
                },
            });
        }
        try {
            const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
            const result = await verifier.verifyPayment(paymentPayload, routeConfig.price, new web3_js_1.PublicKey(globalConfig.treasuryWallet));
            if (!result.valid) {
                if (globalConfig.onPaymentFailed) {
                    await globalConfig.onPaymentFailed(result.reason || 'Payment verification failed', request);
                }
                return server_1.NextResponse.json({ error: result.reason || 'Payment verification failed' }, { status: 402 });
            }
            if (globalConfig.onPaymentVerified) {
                await globalConfig.onPaymentVerified({
                    ...paymentPayload,
                    resource: request.nextUrl.pathname,
                });
            }
            const response = await handler(request);
            response.headers.set('X-Payment-Verified', 'true');
            response.headers.set('X-Payment-Signature', paymentPayload.signature);
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment processing error';
            if (globalConfig.onPaymentFailed) {
                await globalConfig.onPaymentFailed(errorMessage, request);
            }
            return server_1.NextResponse.json({ error: errorMessage }, { status: 500 });
        }
    };
}
function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
//# sourceMappingURL=nextjs.js.map