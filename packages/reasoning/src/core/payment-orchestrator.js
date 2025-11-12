"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrchestrator = void 0;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
class PaymentOrchestrator {
    connection;
    escrowManager;
    userId;
    network;
    constructor(config) {
        this.connection = new web3_js_1.Connection(config.rpcUrl, 'confirmed');
        this.escrowManager = config.escrowManager;
        this.userId = config.userId;
        this.network = config.network;
    }
    async executeServiceCall(serviceUrl, params, step) {
        try {
            const response = await axios_1.default.post(serviceUrl, params, {
                headers: {
                    'Content-Type': 'application/json',
                },
                validateStatus: (status) => status === 200 || status === 402,
            });
            if (response.status === 402) {
                const paymentRequirements = response.data;
                const paymentResult = await this.handlePayment(paymentRequirements, serviceUrl, params);
                if (!paymentResult.success) {
                    throw new Error(`Payment failed: ${paymentResult.error}`);
                }
                return {
                    output: paymentResult,
                    payment: paymentResult,
                };
            }
            return {
                output: response.data,
                payment: {
                    success: true,
                    cost: 0,
                },
            };
        }
        catch (error) {
            throw new Error(`Service call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async handlePayment(requirements, serviceUrl, params) {
        try {
            const amount = parseFloat(requirements.amount);
            const recipientPubkey = new web3_js_1.PublicKey(requirements.payTo);
            const balance = await this.escrowManager.getBalance(this.userId);
            if (balance < amount) {
                throw new Error(`Insufficient escrow balance. Available: ${balance}, Required: ${amount}. Please top up your account.`);
            }
            const mint = requirements.asset === 'SOL' ? undefined : new web3_js_1.PublicKey(requirements.asset);
            const signature = await this.escrowManager.executePayment(this.userId, recipientPubkey, amount, mint);
            const paymentPayload = {
                network: this.network,
                asset: requirements.asset,
                from: this.escrowManager.getEscrowPublicKey().toBase58(),
                to: requirements.payTo,
                amount: requirements.amount,
                signature,
                timestamp: Date.now(),
                nonce: requirements.nonce,
            };
            const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
            const retryResponse = await axios_1.default.post(serviceUrl, params, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Payment': paymentHeader,
                },
            });
            return {
                success: true,
                signature,
                cost: amount,
            };
        }
        catch (error) {
            return {
                success: false,
                cost: 0,
                error: error instanceof Error ? error.message : 'Unknown payment error',
            };
        }
    }
    async getBalance() {
        return await this.escrowManager.getBalance(this.userId);
    }
    async estimateCost(steps) {
        return steps.reduce((total, step) => total + step.estimatedCost, 0);
    }
}
exports.PaymentOrchestrator = PaymentOrchestrator;
//# sourceMappingURL=payment-orchestrator.js.map