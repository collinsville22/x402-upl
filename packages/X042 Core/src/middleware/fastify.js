"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFastifyX402Middleware = createFastifyX402Middleware;
const verifier_js_1 = require("../payment/verifier.js");
const settlement_js_1 = require("../payment/settlement.js");
function createFastifyX402Middleware(config) {
    const verifier = new verifier_js_1.X402PaymentVerifier(config.connection, config.network);
    const settler = new settlement_js_1.SettlementCoordinator(config.connection, config.network);
    return async (request, reply, done) => {
        const paymentHeader = request.headers['x-payment'];
        if (!paymentHeader) {
            const paymentRequirements = {
                scheme: 'solana',
                network: config.network,
                asset: config.asset || 'USDC',
                payTo: config.recipientAddress.toBase58(),
                amount: config.pricePerCall.toString(),
                memo: config.serviceName ? `Payment for ${config.serviceName}` : undefined,
                timeout: 60,
            };
            return reply.code(402).send(paymentRequirements);
        }
        try {
            const payloadBuffer = Buffer.from(paymentHeader, 'base64');
            const payload = JSON.parse(payloadBuffer.toString());
            const verification = await verifier.verifyPayment(payload, config.pricePerCall, config.recipientAddress);
            if (!verification.valid) {
                return reply.code(402).send({
                    error: verification.reason,
                    scheme: 'solana',
                    network: config.network,
                    asset: config.asset || 'USDC',
                    payTo: config.recipientAddress.toBase58(),
                    amount: config.pricePerCall.toString(),
                });
            }
            if (config.autoSettle && verification.transaction) {
                const settlement = await settler.settlePayment(verification.transaction, config.pricePerCall, config.recipientAddress);
                if (!settlement.success) {
                    return reply.code(402).send({
                        error: 'Settlement failed',
                    });
                }
            }
            if (verification.receipt) {
                reply.header('X-Payment-Receipt', verification.receipt);
            }
            done();
        }
        catch (error) {
            return reply.code(402).send({
                error: error instanceof Error ? error.message : 'Payment verification failed',
            });
        }
    };
}
//# sourceMappingURL=fastify.js.map